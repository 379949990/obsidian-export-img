import { Notice, Platform, type App } from 'obsidian';
import { saveAs } from 'file-saver';
import { zipSync } from 'fflate';
import { t } from '../i18n';
import { getExtension } from './capture';
import type { ExportFormat } from '../types';

function safeFilename(title: string, format: ExportFormat, index?: number): string {
  const base = title.replaceAll(/[\\/:*?"<>|]+/g, '_').replaceAll(/\s+/g, '_');
  const suffix = index !== undefined ? `_${index}` : '';
  return `${base}${suffix}.${getExtension(format)}`;
}

export async function copyBlobToClipboard(blob: Blob): Promise<void> {
  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob,
    }),
  ]);
  new Notice(t('notice.copySuccess'));
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

export async function saveMultipleBlobs(
  app: App,
  items: { blob: Blob; title: string; format: ExportFormat; index?: number }[],
  zipName: string,
): Promise<void> {
  if (items.length === 0) return;

  if (Platform.isMobile || items.length === 1) {
    for (const item of items) {
      const name = item.index !== undefined ? `${item.title}_${item.index}` : item.title;
      await saveBlob(app, item.blob, name, item.format);
    }
    return;
  }

  const files: Record<string, Uint8Array> = {};
  for (const item of items) {
    const name = safeFilename(item.title, item.format, item.index);
    files[name] = new Uint8Array(await item.blob.arrayBuffer());
  }
  const zipped = zipSync(files);
  // Copy into a fresh ArrayBuffer-backed view for BlobPart typing.
  const zipBytes = new Uint8Array(zipped.byteLength);
  zipBytes.set(zipped);
  saveAs(new Blob([zipBytes], { type: 'application/zip' }), `${zipName.replaceAll(/\s+/g, '_')}.zip`);
  new Notice(t('notice.saveSuccess', { path: `${zipName}.zip` }));
}
