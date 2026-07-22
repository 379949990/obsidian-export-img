import { t } from '../i18n';
import { defaultSplitHeight } from '../pipeline/split';
import type {
  ExportFormat,
  ExportImgSettings,
  ScaleMode,
  SettleStatus,
  SplitMode,
  ThemeMode,
  WatermarkType,
} from '../types';
import { Platform } from 'obsidian';
import { useAppContext } from './app-context';
import { ImageSourceField } from './image-source-field';

interface FidelityPanelProps {
  draft: ExportImgSettings;
  busy: boolean;
  settleStatus: SettleStatus | null;
  exportDespiteTimeout: boolean;
  onExportDespiteTimeout: (value: boolean) => void;
  paddingMode: 'preset' | 'document';
  onChange: (patch: Partial<ExportImgSettings>) => void;
  onNestedChange: <K extends keyof ExportImgSettings>(
    key: K,
    patch: Partial<ExportImgSettings[K]>,
  ) => void;
  onTogglePadding: () => void;
  onCopy: () => void;
  onSave: () => void;
}

export function FidelityPanel(props: FidelityPanelProps) {
  const {
    draft,
    busy,
    settleStatus,
    exportDespiteTimeout,
    onExportDespiteTimeout,
    paddingMode,
    onChange,
    onNestedChange,
    onTogglePadding,
    onCopy,
    onSave,
  } = props;
  const { app } = useAppContext();
  const timedOut = settleStatus === 'timed_out';
  const exportBlocked = busy || (timedOut && !exportDespiteTimeout);

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
            onChange={(e) => onChange({ width: Number(e.currentTarget.value) || draft.width })}
          />
        </label>

        <label className="export-img-field">
          <span>{t('studio.embedMaxHeight')}</span>
          <input
            type="number"
            min={0}
            placeholder={t('studio.embedMaxHeightPlaceholder')}
            value={draft.embedMaxHeight || ''}
            disabled={busy}
            onChange={(e) => {
              const raw = e.currentTarget.value.trim();
              if (raw === '') {
                onChange({ embedMaxHeight: 0 });
                return;
              }
              const n = Number(raw);
              if (!Number.isFinite(n) || n < 0) return;
              onChange({ embedMaxHeight: Math.round(n) });
            }}
          />
        </label>
        <p className="export-img-field-hint">{t('studio.embedMaxHeightHint')}</p>

        <label className="export-img-field">
          <span>{t('studio.embedAlign')}</span>
          <select
            value={draft.embedAlign}
            disabled={busy}
            onChange={(e) =>
              onChange({
                embedAlign: e.currentTarget.value as 'left' | 'center',
              })
            }
          >
            <option value="left">{t('studio.embedAlign.left')}</option>
            <option value="center">{t('studio.embedAlign.center')}</option>
          </select>
        </label>
        <p className="export-img-field-hint">{t('studio.embedAlignHint')}</p>

        <label className="export-img-field">
          <span>{t('studio.scale')}</span>
          <select
            value={draft.scale}
            disabled={busy}
            onChange={(e) => onChange({ scale: e.currentTarget.value as ScaleMode })}
          >
            <option value="1x">1x</option>
            <option value="2x">2x</option>
            {!Platform.isMobile && <option value="3x">3x</option>}
          </select>
        </label>
        <p className="export-img-field-hint">{t('studio.scaleHint')}</p>

        <label className="export-img-field">
          <span>{t('studio.format')}</span>
          <select
            value={draft.format}
            disabled={busy}
            onChange={(e) => onChange({ format: e.currentTarget.value as ExportFormat })}
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
            onChange={(e) => onChange({ themeMode: e.currentTarget.value as ThemeMode })}
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
            onChange={(e) => onChange({ showFilename: e.currentTarget.checked })}
          />
          <span>{t('studio.showTitle')}</span>
        </label>

        <label className="export-img-check">
          <input
            type="checkbox"
            checked={draft.showMetadata}
            disabled={busy}
            onChange={(e) => onChange({ showMetadata: e.currentTarget.checked })}
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
              onClick={onTogglePadding}
            >
              {paddingMode === 'preset'
                ? t('studio.padding.useDocument')
                : t('studio.padding.usePreset')}
            </button>
          </div>
          <div className="export-img-padding-rows">
            <label className="export-img-field">
              <span>{t('studio.padding.vertical')}</span>
              <input
                type="number"
                min={0}
                max={400}
                value={draft.padding.top}
                disabled={busy}
                onChange={(e) => {
                  const n = Number(e.currentTarget.value);
                  if (!Number.isFinite(n) || n < 0) return;
                  const v = Math.round(n);
                  onNestedChange('padding', { top: v, bottom: v });
                }}
              />
            </label>
            <label className="export-img-field">
              <span>{t('studio.padding.horizontal')}</span>
              <input
                type="number"
                min={0}
                max={400}
                value={draft.padding.left}
                disabled={busy}
                onChange={(e) => {
                  const n = Number(e.currentTarget.value);
                  if (!Number.isFinite(n) || n < 0) return;
                  const v = Math.round(n);
                  onNestedChange('padding', { left: v, right: v });
                }}
              />
            </label>
          </div>
        </div>

        <label className="export-img-field">
          <span>{t('studio.split')}</span>
          <select
            value={draft.split.mode}
            disabled={busy}
            onChange={(e) => {
              const mode = e.currentTarget.value as SplitMode;
              if (mode === 'fixed') {
                onNestedChange('split', {
                  mode,
                  height:
                    draft.split.height > 0
                      ? draft.split.height
                      : defaultSplitHeight(draft.width),
                });
              } else {
                onNestedChange('split', { mode });
              }
            }}
          >
            <option value="none">{t('studio.split.none')}</option>
            <option value="fixed">{t('studio.split.fixed')}</option>
            <option value="hr">{t('studio.split.hr')}</option>
          </select>
        </label>

        {draft.split.mode === 'fixed' && (
          <>
            <label className="export-img-field">
              <span>{t('studio.splitHeight')}</span>
              <input
                type="number"
                min={200}
                value={draft.split.height}
                disabled={busy}
                onChange={(e) => {
                  const n = Number(e.currentTarget.value);
                  if (!Number.isFinite(n) || n < 200) return;
                  onNestedChange('split', { height: Math.round(n) });
                }}
              />
            </label>
            <p className="export-img-field-hint">{t('studio.splitHeightHint')}</p>
          </>
        )}

        <div className="export-img-section">
          <div className="export-img-section-head">
            <span>{t('studio.decorations')}</span>
          </div>
          <div className="export-img-decor-block">
            <label className="export-img-check">
              <input
                type="checkbox"
                checked={draft.watermark.enable}
                disabled={busy}
                onChange={(e) => onNestedChange('watermark', { enable: e.currentTarget.checked })}
              />
              <span>{t('studio.watermark')}</span>
            </label>
            {draft.watermark.enable && (
              <div className="export-img-decor-fields">
                <label className="export-img-field">
                  <span>{t('studio.watermarkType')}</span>
                  <select
                    value={draft.watermark.type}
                    disabled={busy}
                    onChange={(e) =>
                      onNestedChange('watermark', {
                        type: e.currentTarget.value as WatermarkType,
                      })
                    }
                  >
                    <option value="text">{t('setting.watermarkType.text')}</option>
                    <option value="image">{t('setting.watermarkType.image')}</option>
                  </select>
                </label>
                {draft.watermark.type === 'image' ? (
                  <ImageSourceField
                    app={app}
                    label={t('studio.watermarkImage')}
                    value={draft.watermark.imageSrc}
                    disabled={busy}
                    onChange={(imageSrc) => onNestedChange('watermark', { imageSrc })}
                  />
                ) : (
                  <>
                    <label className="export-img-field">
                      <span>{t('studio.watermarkText')}</span>
                      <input
                        type="text"
                        value={draft.watermark.text}
                        disabled={busy}
                        onChange={(e) =>
                          onNestedChange('watermark', { text: e.currentTarget.value })
                        }
                      />
                    </label>
                    <label className="export-img-field">
                      <span>{t('studio.watermarkColor')}</span>
                      <input
                        type="color"
                        value={draft.watermark.color}
                        disabled={busy}
                        onChange={(e) =>
                          onNestedChange('watermark', { color: e.currentTarget.value })
                        }
                      />
                    </label>
                  </>
                )}
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
                      onNestedChange('watermark', { opacity: Number(e.currentTarget.value) })
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
                      onNestedChange('watermark', { rotate: Number(e.currentTarget.value) })
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
                onChange={(e) => onNestedChange('author', { show: e.currentTarget.checked })}
              />
              <span>{t('studio.author')}</span>
            </label>
            {draft.author.show && (
              <div className="export-img-decor-fields">
                <ImageSourceField
                  app={app}
                  label={t('studio.authorAvatar')}
                  value={draft.author.avatarSrc}
                  disabled={busy}
                  avatar
                  onChange={(avatarSrc) => onNestedChange('author', { avatarSrc })}
                />
                <label className="export-img-field">
                  <span>{t('studio.authorName')}</span>
                  <input
                    type="text"
                    value={draft.author.name}
                    disabled={busy}
                    onChange={(e) => onNestedChange('author', { name: e.currentTarget.value })}
                  />
                </label>
                <label className="export-img-field">
                  <span>{t('studio.authorRemark')}</span>
                  <input
                    type="text"
                    value={draft.author.remark}
                    disabled={busy}
                    onChange={(e) => onNestedChange('author', { remark: e.currentTarget.value })}
                  />
                </label>
                <label className="export-img-field">
                  <span>{t('studio.authorAlign')}</span>
                  <select
                    value={draft.author.align}
                    disabled={busy}
                    onChange={(e) =>
                      onNestedChange('author', {
                        align: e.currentTarget.value as 'left' | 'center' | 'right',
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
        </div>
      </div>

      <div className="export-img-actions">
        {timedOut && (
          <label className="export-img-check export-img-export-despite">
            <input
              type="checkbox"
              checked={exportDespiteTimeout}
              disabled={busy}
              onChange={(e) => onExportDespiteTimeout(e.currentTarget.checked)}
            />
            <span>{t('studio.exportDespiteTimeout')}</span>
          </label>
        )}
        <button className="mod-cta" disabled={exportBlocked} onClick={onCopy} type="button">
          {t('studio.copy')}
        </button>
        <button disabled={exportBlocked} onClick={onSave} type="button">
          {t('studio.save')}
        </button>
      </div>
    </div>
  );
}
