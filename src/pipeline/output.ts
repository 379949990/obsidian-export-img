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

export interface SaveBlobOptions {
  /** Skip per-file success Notice (caller shows a summary). */
  quiet?: boolean;
}

/**
 * Save one image.
 * Desktop → browser download. Mobile → vault attachment (path in Notice).
 */
export async function saveBlob(
  app: App,
  blob: Blob,
  title: string,
  format: ExportFormat,
  opts?: SaveBlobOptions,
): Promise<string | undefined> {
  const filename = safeFilename(title, format);
  try {
    if (Platform.isMobile) {
      const filePath = await app.fileManager.getAvailablePathForAttachment(filename);
      await app.vault.createBinary(filePath, await blob.arrayBuffer());
      if (!opts?.quiet) {
        new Notice(t('notice.saveSuccess', { path: filePath }));
      }
      return filePath;
    }
    saveAs(blob, filename);
    if (!opts?.quiet) {
      new Notice(t('notice.saveSuccess', { path: filename }));
    }
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
 * Save one or more images. Returns true only when every item was saved
 * (so callers can safely persist settings).
 * Desktop multi-page → ZIP download. Mobile → one vault attachment per image.
 */
export async function saveMultipleBlobs(
  app: App,
  items: { blob: Blob; title: string; format: ExportFormat; index?: number }[],
  zipName: string,
): Promise<boolean> {
  if (items.length === 0) return false;

  if (Platform.isMobile || items.length === 1) {
    const quiet = items.length > 1;
    const paths: string[] = [];
    for (const item of items) {
      const name = item.index !== undefined ? `${item.title}_${item.index}` : item.title;
      const saved = await saveBlob(app, item.blob, name, item.format, { quiet });
      if (saved === undefined) {
        if (paths.length > 0) {
          new Notice(t('notice.savePartialFail', { saved: paths.length, total: items.length }));
        }
        return false;
      }
      paths.push(saved);
    }
    if (quiet) {
      new Notice(t('notice.savePagesSuccess', { count: paths.length }));
    }
    return true;
  }

  try {
    const zipBlob = await buildZipBlob(items);
    const zipFilename = `${zipName.replaceAll(/\s+/g, '_')}.zip`;
    saveAs(zipBlob, zipFilename);
    new Notice(t('notice.saveSuccess', { path: zipFilename }));
    return true;
  } catch (error) {
    console.error(error);
    new Notice(t('notice.saveFail'));
    return false;
  }
}
