import { t } from '../i18n';
import type {
  ExportFormat,
  ExportImgSettings,
  ScaleMode,
  SplitMode,
  ThemeMode,
} from '../types';

interface FidelityPanelProps {
  draft: ExportImgSettings;
  busy: boolean;
  onChange: (patch: Partial<ExportImgSettings>) => void;
  onNestedChange: <K extends keyof ExportImgSettings>(
    key: K,
    patch: Partial<ExportImgSettings[K]>,
  ) => void;
  onResetPadding: () => void;
  onCopy: () => void;
  onSave: () => void;
}

export function FidelityPanel(props: FidelityPanelProps) {
  const {
    draft,
    busy,
    onChange,
    onNestedChange,
    onResetPadding,
    onCopy,
    onSave,
  } = props;

  return (
    <div className="export-img-panel">
      <div className="export-img-panel-scroll">
        <h3 className="export-img-panel-title">{t('studio.fidelity')}</h3>

        <label className="export-img-field">
          <span>{t('studio.width')}</span>
          <input
            type="number"
            min={240}
            max={1600}
            value={draft.width}
            disabled={busy}
            onChange={(e) => onChange({ width: Number(e.target.value) || draft.width })}
          />
        </label>

        <label className="export-img-field">
          <span>{t('studio.scale')}</span>
          <select
            value={draft.scale}
            disabled={busy}
            onChange={(e) => onChange({ scale: e.target.value as ScaleMode })}
          >
            <option value="1x">1x</option>
            <option value="2x">2x</option>
            <option value="3x">3x</option>
          </select>
        </label>

        <label className="export-img-field">
          <span>{t('studio.format')}</span>
          <select
            value={draft.format}
            disabled={busy}
            onChange={(e) => onChange({ format: e.target.value as ExportFormat })}
          >
            <option value="png">PNG</option>
            <option value="jpg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </label>

        <label className="export-img-field">
          <span>{t('studio.theme')}</span>
          <select
            value={draft.themeMode}
            disabled={busy}
            onChange={(e) => onChange({ themeMode: e.target.value as ThemeMode })}
          >
            <option value="current">{t('studio.theme.current')}</option>
            <option value="light">{t('studio.theme.light')}</option>
            <option value="dark">{t('studio.theme.dark')}</option>
          </select>
        </label>

        <label className="export-img-check">
          <input
            type="checkbox"
            checked={draft.showFilename}
            disabled={busy}
            onChange={(e) => onChange({ showFilename: e.target.checked })}
          />
          <span>{t('studio.showTitle')}</span>
        </label>

        <label className="export-img-check">
          <input
            type="checkbox"
            checked={draft.showMetadata}
            disabled={busy}
            onChange={(e) => onChange({ showMetadata: e.target.checked })}
          />
          <span>{t('studio.showMetadata')}</span>
        </label>

        <div className="export-img-section">
          <div className="export-img-section-head">
            <span>{t('studio.padding')}</span>
            <button
              type="button"
              className="export-img-link-btn"
              disabled={busy}
              onClick={onResetPadding}
            >
              {t('studio.padding.reset')}
            </button>
          </div>
          <div className="export-img-padding-grid">
            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
              <label key={side} className="export-img-field">
                <span>{t(`studio.padding.${side}`)}</span>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={draft.padding[side]}
                  disabled={busy}
                  onChange={(e) =>
                    onNestedChange('padding', {
                      [side]: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>

        <label className="export-img-field">
          <span>{t('studio.split')}</span>
          <select
            value={draft.split.mode}
            disabled={busy}
            onChange={(e) =>
              onNestedChange('split', { mode: e.target.value as SplitMode })
            }
          >
            <option value="none">{t('studio.split.none')}</option>
            <option value="fixed">{t('studio.split.fixed')}</option>
            <option value="hr">{t('studio.split.hr')}</option>
            <option value="auto">{t('studio.split.auto')}</option>
          </select>
        </label>

        {draft.split.mode !== 'none' && draft.split.mode !== 'hr' && (
          <label className="export-img-field">
            <span>{t('studio.splitHeight')}</span>
            <input
              type="number"
              min={200}
              value={draft.split.height}
              disabled={busy}
              onChange={(e) =>
                onNestedChange('split', {
                  height: Number(e.target.value) || draft.split.height,
                })
              }
            />
          </label>
        )}

        <details className="export-img-details">
          <summary>{t('studio.decorations')}</summary>
          <div className="export-img-decor-block">
            <label className="export-img-check">
              <input
                type="checkbox"
                checked={draft.watermark.enable}
                disabled={busy}
                onChange={(e) => onNestedChange('watermark', { enable: e.target.checked })}
              />
              <span>{t('studio.watermark')}</span>
            </label>
            {draft.watermark.enable && (
              <div className="export-img-decor-fields">
                <label className="export-img-field">
                  <span>{t('studio.watermarkText')}</span>
                  <input
                    type="text"
                    value={draft.watermark.text}
                    disabled={busy}
                    onChange={(e) => onNestedChange('watermark', { text: e.target.value })}
                  />
                </label>
                <label className="export-img-field">
                  <span>{t('studio.watermarkColor')}</span>
                  <input
                    type="color"
                    value={draft.watermark.color}
                    disabled={busy}
                    onChange={(e) => onNestedChange('watermark', { color: e.target.value })}
                  />
                </label>
                <label className="export-img-field">
                  <span>
                    {t('studio.watermarkOpacity')} ({Math.round(draft.watermark.opacity * 100)}%)
                  </span>
                  <input
                    type="range"
                    min={0.05}
                    max={0.6}
                    step={0.01}
                    value={draft.watermark.opacity}
                    disabled={busy}
                    onChange={(e) =>
                      onNestedChange('watermark', { opacity: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="export-img-field">
                  <span>
                    {t('studio.watermarkRotate')} ({draft.watermark.rotate}°)
                  </span>
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    step={1}
                    value={draft.watermark.rotate}
                    disabled={busy}
                    onChange={(e) =>
                      onNestedChange('watermark', { rotate: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
            )}
          </div>

          <div className="export-img-decor-block">
            <label className="export-img-check">
              <input
                type="checkbox"
                checked={draft.author.show}
                disabled={busy}
                onChange={(e) => onNestedChange('author', { show: e.target.checked })}
              />
              <span>{t('studio.author')}</span>
            </label>
            {draft.author.show && (
              <div className="export-img-decor-fields">
                <label className="export-img-field">
                  <span>{t('studio.authorName')}</span>
                  <input
                    type="text"
                    value={draft.author.name}
                    disabled={busy}
                    onChange={(e) => onNestedChange('author', { name: e.target.value })}
                  />
                </label>
                <label className="export-img-field">
                  <span>{t('studio.authorRemark')}</span>
                  <input
                    type="text"
                    value={draft.author.remark}
                    disabled={busy}
                    onChange={(e) => onNestedChange('author', { remark: e.target.value })}
                  />
                </label>
                <label className="export-img-field">
                  <span>{t('studio.authorAlign')}</span>
                  <select
                    value={draft.author.align}
                    disabled={busy}
                    onChange={(e) =>
                      onNestedChange('author', {
                        align: e.target.value as 'left' | 'center' | 'right',
                      })
                    }
                  >
                    <option value="left">{t('studio.authorAlign.left')}</option>
                    <option value="center">{t('studio.authorAlign.center')}</option>
                    <option value="right">{t('studio.authorAlign.right')}</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        </details>
      </div>

      <div className="export-img-actions">
        <button className="mod-cta" disabled={busy} onClick={onCopy} type="button">
          {t('studio.copy')}
        </button>
        <button disabled={busy} onClick={onSave} type="button">
          {t('studio.save')}
        </button>
      </div>
    </div>
  );
}
