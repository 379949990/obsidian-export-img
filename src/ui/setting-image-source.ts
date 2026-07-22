import { Setting, type App } from 'obsidian';
import { t } from '../i18n';
import { blobToDataUrl, isDataImageSrc, isHttpImageSrc } from '../pipeline/image-source';
import { promptImageUrl, VaultImageModal } from './vault-image-modal';

/** Imperative image picker for Obsidian Setting controls (settings tab). */
export function mountImageSourceControl(
  setting: Setting,
  app: App,
  value: string,
  onChange: (next: string) => void | Promise<void>,
): void {
  setting.controlEl.empty();
  setting.controlEl.addClass('export-img-setting-image-source');

  const row = setting.controlEl.createDiv({ cls: 'export-img-image-source-row' });
  const preview = row.createDiv({ cls: 'export-img-image-source-preview' });
  const showPreview = value && (isDataImageSrc(value) || isHttpImageSrc(value));
  if (showPreview) {
    preview.createEl('img', { attr: { src: value, alt: '' } });
  } else {
    preview.createSpan({
      cls: 'export-img-image-source-empty',
      text: t('imageSource.empty'),
    });
  }

  const actions = row.createDiv({ cls: 'export-img-image-source-actions' });
  const fileInput = setting.controlEl.createEl('input', {
    type: 'file',
    cls: 'export-img-image-source-file',
    attr: { accept: 'image/*' },
  });

  actions.createEl('button', { text: t('imageSource.upload') }).addEventListener('click', () => {
    fileInput.click();
  });
  actions.createEl('button', { text: t('imageSource.vault') }).addEventListener('click', () => {
    new VaultImageModal(app, (dataUrl) => {
      void onChange(dataUrl);
    }).open();
  });
  actions.createEl('button', { text: t('imageSource.url') }).addEventListener('click', () => {
    void promptImageUrl(app, value).then((url) => {
      if (url != null) void onChange(url);
    });
  });
  const clearBtn = actions.createEl('button', { text: t('imageSource.clear') });
  clearBtn.disabled = !value;
  clearBtn.addEventListener('click', () => {
    void onChange('');
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    void blobToDataUrl(file).then((dataUrl) => onChange(dataUrl));
  });
}
