import { useEffect, useRef, useState } from 'preact/hooks';
import type { TargetedEvent } from 'preact';
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
  /** Settings changed since last render — refresh required. */
  previewStale?: boolean;
  /** Plugin setting: commit control changes schedule preview work. */
  autoRerender: boolean;
  paddingMode: 'preset' | 'document';
  onChange: (patch: Partial<ExportImgSettings>) => void;
  onNestedChange: <K extends keyof ExportImgSettings>(
    key: K,
    patch: Partial<ExportImgSettings[K]>,
  ) => void;
  onTogglePadding: () => void;
  /** Commit draft into preview work (debounced by parent when auto). */
  onCommitPreview: () => void;
  onCopy: () => void;
  onSave: () => void;
}

/** Range: live label via local state; commit value on pointer/keyboard release. */
function CommitRange(props: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  formatLabel: (value: number) => string;
  onCommit: (value: number) => void;
}) {
  const { label, min, max, step, value, disabled, formatLabel, onCommit } = props;
  const [local, setLocal] = useState(value);
  const dragging = useRef(false);

  useEffect(() => {
    if (!dragging.current) setLocal(value);
  }, [value]);

  const finish = (next: number) => {
    dragging.current = false;
    setLocal(next);
    onCommit(next);
  };

  return (
    <label className="export-img-field">
      <span>
        {label} ({formatLabel(local)})
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        disabled={disabled}
        onPointerDown={() => {
          dragging.current = true;
        }}
        onInput={(e) => {
          setLocal(Number(e.currentTarget.value));
        }}
        onPointerUp={(e) => finish(Number(e.currentTarget.value))}
        onPointerCancel={(e) => finish(Number(e.currentTarget.value))}
        onKeyUp={(e) => {
          if (
            e.key === 'ArrowLeft' ||
            e.key === 'ArrowRight' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowDown' ||
            e.key === 'Home' ||
            e.key === 'End'
          ) {
            finish(Number(e.currentTarget.value));
          }
        }}
      />
    </label>
  );
}

export function FidelityPanel(props: FidelityPanelProps) {
  const {
    draft,
    busy,
    settleStatus,
    exportDespiteTimeout,
    onExportDespiteTimeout,
    previewStale = false,
    autoRerender,
    paddingMode,
    onChange,
    onNestedChange,
    onTogglePadding,
    onCommitPreview,
    onCopy,
    onSave,
  } = props;
  const { app } = useAppContext();
  const timedOut = settleStatus === 'timed_out';
  const exportBlocked = busy || previewStale || (timedOut && !exportDespiteTimeout);

  const commit = () => {
    if (autoRerender) onCommitPreview();
  };

  const patchAndCommit = (patch: Partial<ExportImgSettings>) => {
    onChange(patch);
    commit();
  };

  const nestedAndCommit = <K extends keyof ExportImgSettings>(
    key: K,
    patch: Partial<ExportImgSettings[K]>,
  ) => {
    onNestedChange(key, patch);
    commit();
  };

  /** Text/number: update draft live; commit preview on blur (and Enter for text). */
  const onTextBlurCommit = () => commit();

  const onTextKeyDown = (e: TargetedEvent<HTMLInputElement, KeyboardEvent>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const showRefreshHint = previewStale || (!autoRerender && Platform.isMobile);

  return (
    <div className="export-img-panel">
      <div className="export-img-panel-scroll">
        <h3 className="export-img-panel-title">{t('studio.fidelity')}</h3>

        {showRefreshHint && (
          <p
            className={
              previewStale
                ? 'export-img-field-hint export-img-mobile-banner is-stale'
                : 'export-img-field-hint export-img-mobile-banner'
            }
          >
            {previewStale
              ? t('studio.refreshRequired')
              : t('studio.mobileManualRefreshHint')}
          </p>
        )}

        {!autoRerender && !Platform.isMobile && !previewStale && (
          <p className="export-img-field-hint">{t('studio.manualRefreshHint')}</p>
        )}

        <label className="export-img-field">
          <span>{t('studio.width')}</span>
          <input
            type="number"
            min={240}
            max={1600}
            value={draft.width}
            disabled={busy}
            onChange={(e) => onChange({ width: Number(e.currentTarget.value) || draft.width })}
            onBlur={onTextBlurCommit}
            onKeyDown={onTextKeyDown}
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
            onBlur={onTextBlurCommit}
            onKeyDown={onTextKeyDown}
          />
        </label>
        <p className="export-img-field-hint">{t('studio.embedMaxHeightHint')}</p>

        <label className="export-img-field">
          <span>{t('studio.embedAlign')}</span>
          <select
            value={draft.embedAlign}
            disabled={busy}
            onChange={(e) =>
              patchAndCommit({
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
            onChange={(e) => patchAndCommit({ scale: e.currentTarget.value as ScaleMode })}
          >
            <option value="1x">1x</option>
            <option value="2x">2x</option>
            <option value="3x">3x</option>
          </select>
        </label>
        <p className="export-img-field-hint">
          {Platform.isMobile ? t('studio.scaleHintMobile') : t('studio.scaleHint')}
        </p>

        <label className="export-img-field">
          <span>{t('studio.format')}</span>
          <select
            value={draft.format}
            disabled={busy}
            onChange={(e) => patchAndCommit({ format: e.currentTarget.value as ExportFormat })}
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
            onChange={(e) => patchAndCommit({ themeMode: e.currentTarget.value as ThemeMode })}
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
            onChange={(e) => patchAndCommit({ showFilename: e.currentTarget.checked })}
          />
          <span>{t('studio.showTitle')}</span>
        </label>

        <label className="export-img-check">
          <input
            type="checkbox"
            checked={draft.showMetadata}
            disabled={busy}
            onChange={(e) => patchAndCommit({ showMetadata: e.currentTarget.checked })}
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
              onClick={() => {
                onTogglePadding();
                commit();
              }}
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
                onBlur={onTextBlurCommit}
                onKeyDown={onTextKeyDown}
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
                onBlur={onTextBlurCommit}
                onKeyDown={onTextKeyDown}
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
                nestedAndCommit('split', {
                  mode,
                  height:
                    draft.split.height > 0
                      ? draft.split.height
                      : defaultSplitHeight(draft.width),
                });
              } else {
                nestedAndCommit('split', { mode });
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
                onBlur={onTextBlurCommit}
                onKeyDown={onTextKeyDown}
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
                onChange={(e) =>
                  nestedAndCommit('watermark', { enable: e.currentTarget.checked })
                }
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
                      nestedAndCommit('watermark', {
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
                    onChange={(imageSrc) => nestedAndCommit('watermark', { imageSrc })}
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
                        onBlur={onTextBlurCommit}
                        onKeyDown={onTextKeyDown}
                      />
                    </label>
                    <label className="export-img-field">
                      <span>{t('studio.watermarkColor')}</span>
                      <input
                        type="color"
                        value={draft.watermark.color}
                        disabled={busy}
                        onChange={(e) =>
                          nestedAndCommit('watermark', { color: e.currentTarget.value })
                        }
                      />
                    </label>
                  </>
                )}
                <CommitRange
                  label={t('studio.watermarkOpacity')}
                  min={0.05}
                  max={0.6}
                  step={0.01}
                  value={draft.watermark.opacity}
                  disabled={busy}
                  formatLabel={(v) => `${Math.round(v * 100)}%`}
                  onCommit={(opacity) => nestedAndCommit('watermark', { opacity })}
                />
                <CommitRange
                  label={t('studio.watermarkRotate')}
                  min={-90}
                  max={90}
                  step={1}
                  value={draft.watermark.rotate}
                  disabled={busy}
                  formatLabel={(v) => `${v}°`}
                  onCommit={(rotate) => nestedAndCommit('watermark', { rotate })}
                />
              </div>
            )}
          </div>

          <div className="export-img-decor-block">
            <label className="export-img-check">
              <input
                type="checkbox"
                checked={draft.author.show}
                disabled={busy}
                onChange={(e) => nestedAndCommit('author', { show: e.currentTarget.checked })}
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
                  onChange={(avatarSrc) => nestedAndCommit('author', { avatarSrc })}
                />
                <label className="export-img-field">
                  <span>{t('studio.authorName')}</span>
                  <input
                    type="text"
                    value={draft.author.name}
                    disabled={busy}
                    onChange={(e) => onNestedChange('author', { name: e.currentTarget.value })}
                    onBlur={onTextBlurCommit}
                    onKeyDown={onTextKeyDown}
                  />
                </label>
                <label className="export-img-field">
                  <span>{t('studio.authorRemark')}</span>
                  <input
                    type="text"
                    value={draft.author.remark}
                    disabled={busy}
                    onChange={(e) => onNestedChange('author', { remark: e.currentTarget.value })}
                    onBlur={onTextBlurCommit}
                    onKeyDown={onTextKeyDown}
                  />
                </label>
                <label className="export-img-field">
                  <span>{t('studio.authorAlign')}</span>
                  <select
                    value={draft.author.align}
                    disabled={busy}
                    onChange={(e) =>
                      nestedAndCommit('author', {
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
