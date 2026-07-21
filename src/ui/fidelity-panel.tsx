import { t } from '../i18n';
import type {
  ExportFormat,
  ExportImgSettings,
  ScaleMode,
  SettleDiagnostic,
  SplitMode,
  ThemeMode,
} from '../types';

interface FidelityPanelProps {
  draft: ExportImgSettings;
  settle: SettleDiagnostic | null;
  busy: boolean;
  onChange: (patch: Partial<ExportImgSettings>) => void;
  onNestedChange: <K extends keyof ExportImgSettings>(
    key: K,
    patch: Partial<ExportImgSettings[K]>,
  ) => void;
  onCopy: () => void;
  onSave: () => void;
}

export function FidelityPanel(props: FidelityPanelProps) {
  const { draft, settle, busy, onChange, onNestedChange, onCopy, onSave } = props;

  const settleKey = settle
    ? (`studio.settle.${settle.status}` as const)
    : 'studio.settle.idle';

  return (
    <div className="export-img-panel">
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
              onNestedChange('split', { height: Number(e.target.value) || draft.split.height })
            }
          />
        </label>
      )}

      <div className="export-img-settle">
        <div className={`export-img-settle-status is-${settle?.status ?? 'idle'}`}>
          {t(settleKey)}
        </div>
        {settle && settle.warnings.length > 0 && (
          <ul className="export-img-settle-warnings">
            {settle.warnings.slice(0, 4).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        {settle && (
          <div className="export-img-settle-meta">
            {settle.elapsedMs}ms
            {!settle.layoutStable ? ' · layout unstable' : ''}
            {settle.pendingImages > 0 ? ` · imgs ${settle.pendingImages}` : ''}
          </div>
        )}
      </div>

      <details className="export-img-details">
        <summary>{t('studio.decorations')}</summary>
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
          <label className="export-img-field">
            <span>{t('studio.watermarkText')}</span>
            <input
              type="text"
              value={draft.watermark.text}
              disabled={busy}
              onChange={(e) => onNestedChange('watermark', { text: e.target.value })}
            />
          </label>
        )}
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
          <label className="export-img-field">
            <span>{t('studio.authorName')}</span>
            <input
              type="text"
              value={draft.author.name}
              disabled={busy}
              onChange={(e) => onNestedChange('author', { name: e.target.value })}
            />
          </label>
        )}
      </details>

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
