import { Notice, Platform, type App } from 'obsidian';
import { saveAs } from 'file-saver';
import { zipSync } from 'fflate';
import { t } from '../i18n';
import { getExtension } from './capture';
import type { ExportFormat } from '../types';

/** Sanitize title for download / vault attachment filenames. */
export function safeFilename(title: string, format: ExportFormat, index?: number): string {
  const base = title.replaceAll(/[\\/:*?"<>|]+/g, '_').replaceAll(/\s+/g, '_');
  const suffix = index !== undefined ? `_${index}` : '';
  return `${base}${suffix}.${getExtension(format)}`;
}

export async function copyBlobToClipboard(blob: Blob): Promise<void> {
  if (
    typeof navigator.clipboard?.write !== 'function' ||
    typeof ClipboardItem === 'undefined'
  ) {
    throw new Error('clipboard image write unavailable');
  }
  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
  new Notice(t('notice.copySuccess'));
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

async function shareFileOrThrow(file: File, title: string): Promise<void> {
  const canShareFiles =
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    navigator.canShare({ files: [file] });
  if (!canShareFiles) {
    throw new Error('web share files unavailable');
  }
  await navigator.share({ files: [file], title });
}

/**
 * Mobile: prefer the system share sheet with an image file so the user can
 * save to Photos / Gallery. Fall back to download, then vault attachment.
 */
async function saveBlobOnMobile(
  app: App,
  blob: Blob,
  filename: string,
): Promise<string | undefined> {
  const type = blob.type || 'image/png';
  const file = new File([blob], filename, { type });

  try {
    await shareFileOrThrow(file, filename);
    new Notice(t('notice.saveToPhotos'));
    return filename;
  } catch (error) {
    if (isAbortError(error)) {
      return undefined;
    }
    console.error(error);
  }

  try {
    saveAs(blob, filename);
    new Notice(t('notice.saveToPhotosFallback'));
    return filename;
  } catch (error) {
    console.error(error);
  }

  const filePath = await app.fileManager.getAvailablePathForAttachment(filename);
  await app.vault.createBinary(filePath, await blob.arrayBuffer());
  new Notice(t('notice.saveSuccess', { path: filePath }));
  return filePath;
}

export async function saveBlob(
  app: App,
  blob: Blob,
  title: string,
  format: ExportFormat,
): Promise<string | undefined> {
  const filename = safeFilename(title, format);
  try {
    if (Platform.isMobile) {
      return await saveBlobOnMobile(app, blob, filename);
    }
    saveAs(blob, filename);
    new Notice(t('notice.saveSuccess', { path: filename }));
    return filename;
  } catch (error) {
    console.error(error);
    new Notice(t('notice.saveFail'));
    return undefined;
  }
}

async function buildZipBlob(
  items: { blob: Blob; title: string; format: ExportFormat; index?: number }[],
): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  for (const item of items) {
    const name = safeFilename(item.title, item.format, item.index);
    files[name] = new Uint8Array(await item.blob.arrayBuffer());
  }
  const zipped = zipSync(files);
  const zipBytes = new Uint8Array(zipped.byteLength);
  zipBytes.set(zipped);
  return new Blob([zipBytes], { type: 'application/zip' });
}

/**
 * Save one or more images. Returns true when at least one artifact was saved
 * (false if the user cancelled a mobile share sheet).
 */
export async function saveMultipleBlobs(
  app: App,
  items: { blob: Blob; title: string; format: ExportFormat; index?: number }[],
  zipName: string,
): Promise<boolean> {
  if (items.length === 0) return false;

  if (items.length === 1) {
    const item = items[0]!;
    const name = item.index !== undefined ? `${item.title}_${item.index}` : item.title;
    const saved = await saveBlob(app, item.blob, name, item.format);
    return saved !== undefined;
  }

  // Mobile multi-page: one ZIP → one share sheet (avoids N sequential sheets).
  if (Platform.isMobile) {
    const zipFilename = `${zipName.replaceAll(/\s+/g, '_')}.zip`;
    try {
      const zipBlob = await buildZipBlob(items);
      const file = new File([zipBlob], zipFilename, { type: 'application/zip' });
      try {
        await shareFileOrThrow(file, zipFilename);
        new Notice(t('notice.saveZipShared'));
        return true;
      } catch (error) {
        if (isAbortError(error)) return false;
        console.error(error);
      }
      try {
        saveAs(zipBlob, zipFilename);
        new Notice(t('notice.saveSuccess', { path: zipFilename }));
        return true;
      } catch (error) {
        console.error(error);
      }
      // Last resort: vault attachments one-by-one.
      for (const item of items) {
        const name = item.index !== undefined ? `${item.title}_${item.index}` : item.title;
        await saveBlob(app, item.blob, name, item.format);
      }
      return true;
    } catch (error) {
      console.error(error);
      new Notice(t('notice.saveFail'));
      return false;
    }
  }

  const zipBlob = await buildZipBlob(items);
  saveAs(zipBlob, `${zipName.replaceAll(/\s+/g, '_')}.zip`);
  new Notice(t('notice.saveSuccess', { path: `${zipName}.zip` }));
  return true;
}
