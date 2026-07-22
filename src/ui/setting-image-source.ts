import { Setting, type App } from 'obsidian';
import { t } from '../i18n';
import { blobToDataUrl, isDataImageSrc, isHttpImageSrc } from '../pipeline/image-source';
import { promptImageUrl, VaultImageModal } from './vault-image-modal';

export interface ImageSourceControlOptions {
  /** Round avatar preview (settings author field). */
  avatar?: boolean;
}

/** Imperative image picker for Obsidian Setting controls (settings tab). */
export function mountImageSourceControl(
  setting: Setting,
  app: App,
  value: string,
  onChange: (next: string) => void | Promise<void>,
  opts?: ImageSourceControlOptions,
): void {
  setting.controlEl.empty();
  setting.controlEl.addClass('export-img-setting-image-source');
  if (opts?.avatar) {
    setting.controlEl.addClass('is-avatar');
  }

  const row = setting.controlEl.createDiv({ cls: 'export-img-image-source-row' });
  const preview = row.createDiv({ cls: 'export-img-image-source-preview' });
  const showPreview = value && (isDataImageSrc(value) || isHttpImageSrc(value));
  if (showPreview) {
    preview.createEl('img', { attr: { src: value, alt: '' } });
  }

  const actions = row.createDiv({ cls: 'export-img-image-source-actions' });
  const fileInput = setting.controlEl.createEl('input', {
    type: 'file',
    cls: 'export-img-image-source-file',
    attr: { accept: 'image/*' },
  });

  const addAction = (label: string, onClick: () => void, disabled = false) => {
    const btn = actions.createEl('button', {
      cls: 'export-img-image-source-btn',
      text: label,
    });
    btn.type = 'button';
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    return btn;
  };

  addAction(t('imageSource.upload'), () => fileInput.click());
  addAction(t('imageSource.vault'), () => {
    new VaultImageModal(app, (dataUrl) => {
      void onChange(dataUrl);
    }).open();
  });
  addAction(t('imageSource.url'), () => {
    void promptImageUrl(app, value).then((url) => {
      if (url != null) void onChange(url);
    });
  });
  addAction(t('imageSource.clear'), () => {
    void onChange('');
  }, !value);

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    void blobToDataUrl(file).then((dataUrl) => onChange(dataUrl));
  });
}
