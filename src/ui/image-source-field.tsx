import { useRef } from 'preact/hooks';
import type { App } from 'obsidian';
import { t } from '../i18n';
import { blobToDataUrl, isDataImageSrc, isHttpImageSrc } from '../pipeline/image-source';
import { promptImageUrl, VaultImageModal } from './vault-image-modal';

interface ImageSourceFieldProps {
  app: App;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (next: string) => void;
}

export function ImageSourceField(props: ImageSourceFieldProps) {
  const { app, label, value, disabled, onChange } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = value && (isDataImageSrc(value) || isHttpImageSrc(value)) ? value : '';

  return (
    <div className="export-img-image-source">
      <div className="export-img-image-source-label">{label}</div>
      <div className="export-img-image-source-row">
        <div className="export-img-image-source-preview">
          {preview ? (
            <img src={preview} alt="" />
          ) : (
            <span className="export-img-image-source-empty">{t('imageSource.empty')}</span>
          )}
        </div>
        <div className="export-img-image-source-actions">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            {t('imageSource.upload')}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              new VaultImageModal(app, (dataUrl) => onChange(dataUrl)).open();
            }}
          >
            {t('imageSource.vault')}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              void promptImageUrl(app, value).then((url) => {
                if (url != null) onChange(url);
              });
            }}
          >
            {t('imageSource.url')}
          </button>
          <button
            type="button"
            disabled={disabled || !value}
            onClick={() => onChange('')}
          >
            {t('imageSource.clear')}
          </button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="export-img-image-source-file"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          if (!file) return;
          void blobToDataUrl(file).then(onChange);
        }}
      />
    </div>
  );
}
