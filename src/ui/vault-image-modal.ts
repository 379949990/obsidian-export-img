import { Modal, Notice, TFile, type App } from 'obsidian';
import { t } from '../i18n';
import { blobToDataUrl, isVaultImageExtension } from '../pipeline/image-source';

function listVaultImages(app: App): TFile[] {
  return app.vault
    .getFiles()
    .filter((file) => isVaultImageExtension(file.extension))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Pick an image from the vault and return it as a data URL (not a vault path),
 * so export capture does not depend on vault path resolution.
 */
export class VaultImageModal extends Modal {
  private readonly onPick: (dataUrl: string) => void;
  private selected: TFile | null = null;
  private filtered: TFile[] = [];

  constructor(app: App, onPick: (dataUrl: string) => void) {
    super(app);
    this.onPick = onPick;
  }

  onOpen(): void {
    this.titleEl.setText(t('imageSource.vaultTitle'));
    this.modalEl.addClass('export-img-vault-image-modal');
    const { contentEl } = this;
    contentEl.empty();

    const all = listVaultImages(this.app);
    this.filtered = all;
    this.selected = all[0] ?? null;

    const search = contentEl.createEl('input', {
      type: 'search',
      cls: 'export-img-vault-image-search',
      attr: { placeholder: t('imageSource.vaultSearch') },
    });

    const main = contentEl.createDiv({ cls: 'export-img-vault-image-main' });
    const listEl = main.createDiv({ cls: 'export-img-vault-image-list' });
    const previewEl = main.createDiv({ cls: 'export-img-vault-image-preview' });

    const actions = contentEl.createDiv({ cls: 'export-img-vault-image-actions' });
    const confirmBtn = actions.createEl('button', {
      cls: 'mod-cta',
      text: t('imageSource.confirm'),
    });
    actions.createEl('button', { text: t('imageSource.cancel') }).addEventListener('click', () => {
      this.close();
    });

    const renderList = () => {
      listEl.empty();
      if (this.filtered.length === 0) {
        listEl.createDiv({
          cls: 'export-img-vault-image-empty',
          text: t('imageSource.vaultEmpty'),
        });
        this.selected = null;
        previewEl.empty();
        confirmBtn.disabled = true;
        return;
      }

      if (!this.selected || !this.filtered.some((f) => f.path === this.selected?.path)) {
        this.selected = this.filtered[0]!;
      }
      confirmBtn.disabled = false;

      for (const file of this.filtered) {
        const row = listEl.createDiv({
          cls:
            'export-img-vault-image-row' +
            (this.selected?.path === file.path ? ' is-selected' : ''),
          text: file.path,
        });
        row.addEventListener('click', () => {
          this.selected = file;
          renderList();
          void renderPreview();
        });
      }
    };

    const renderPreview = async () => {
      previewEl.empty();
      if (!this.selected) return;
      try {
        const resource = this.app.vault.getResourcePath(this.selected);
        previewEl.createEl('img', { attr: { src: resource, alt: this.selected.name } });
      } catch {
        previewEl.createDiv({ text: this.selected.path });
      }
    };

    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      this.filtered = q
        ? all.filter((file) => file.path.toLowerCase().includes(q))
        : all;
      renderList();
      void renderPreview();
    });

    confirmBtn.addEventListener('click', () => {
      void (async () => {
        if (!this.selected) return;
        try {
          const bytes = await this.app.vault.readBinary(this.selected);
          const mime =
            this.selected.extension.toLowerCase() === 'svg'
              ? 'image/svg+xml'
              : `image/${this.selected.extension.toLowerCase() === 'jpg' ? 'jpeg' : this.selected.extension.toLowerCase()}`;
          const dataUrl = await blobToDataUrl(new Blob([bytes], { type: mime }));
          this.onPick(dataUrl);
          this.close();
        } catch (error) {
          console.error(error);
          new Notice(t('imageSource.readFail'));
        }
      })();
    });

    renderList();
    void renderPreview();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export function promptImageUrl(app: App, current: string): Promise<string | null> {
  return new Promise((resolve) => {
    const modal = new Modal(app);
    modal.titleEl.setText(t('imageSource.urlTitle'));
    const input = modal.contentEl.createEl('input', {
      type: 'url',
      cls: 'export-img-image-url-input',
      attr: {
        placeholder: 'https://…',
        value: isHttpLike(current) ? current : '',
      },
    });
    input.value = isHttpLike(current) ? current : '';

    const actions = modal.contentEl.createDiv({ cls: 'export-img-vault-image-actions' });
    actions.createEl('button', { cls: 'mod-cta', text: t('imageSource.confirm') }).addEventListener(
      'click',
      () => {
        const value = input.value.trim();
        modal.close();
        resolve(value || null);
      },
    );
    actions.createEl('button', { text: t('imageSource.cancel') }).addEventListener('click', () => {
      modal.close();
      resolve(null);
    });
    modal.open();
    input.focus();
  });
}

function isHttpLike(src: string): boolean {
  return /^https?:\/\//i.test(src.trim());
}
