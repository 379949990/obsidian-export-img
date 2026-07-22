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

/**
 * Save one image.
 * Desktop → browser download. Mobile → vault attachment (path in Notice).
 * Web Share / opaque downloads are intentionally not used on mobile: Obsidian's
 * WebView often lacks a working share sheet, and file-saver locations are unclear.
 */
export async function saveBlob(
  app: App,
  blob: Blob,
  title: string,
  format: ExportFormat,
): Promise<string | undefined> {
  const filename = safeFilename(title, format);
  try {
    if (Platform.isMobile) {
      const filePath = await app.fileManager.getAvailablePathForAttachment(filename);
      await app.vault.createBinary(filePath, await blob.arrayBuffer());
      new Notice(t('notice.saveSuccess', { path: filePath }));
      return filePath;
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
 * Save one or more images. Returns true when at least one artifact was saved.
 * Desktop multi-page → ZIP download. Mobile → one vault attachment per image
 * (no ZIP: mobile has no reliable unzip → Photos path).
 */
export async function saveMultipleBlobs(
  app: App,
  items: { blob: Blob; title: string; format: ExportFormat; index?: number }[],
  zipName: string,
): Promise<boolean> {
  if (items.length === 0) return false;

  if (Platform.isMobile || items.length === 1) {
    let any = false;
    for (const item of items) {
      const name = item.index !== undefined ? `${item.title}_${item.index}` : item.title;
      const saved = await saveBlob(app, item.blob, name, item.format);
      if (saved !== undefined) any = true;
    }
    return any;
  }

  try {
    const zipBlob = await buildZipBlob(items);
    const zipFilename = `${zipName.replaceAll(/\s+/g, '_')}.zip`;
    saveAs(zipBlob, zipFilename);
    new Notice(t('notice.saveSuccess', { path: `${zipName}.zip` }));
    return true;
  } catch (error) {
    console.error(error);
    new Notice(t('notice.saveFail'));
    return false;
  }
}
