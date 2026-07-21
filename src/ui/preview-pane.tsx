import type { RefObject } from 'react';
import { t } from '../i18n';

interface PreviewPaneProps {
  mountRef: RefObject<HTMLDivElement | null>;
  rendering: boolean;
}

export function PreviewPane({ mountRef, rendering }: PreviewPaneProps) {
  return (
    <div className="export-img-preview-pane">
      {rendering && (
        <div className="export-img-preview-loading" aria-live="polite">
          <div className="export-img-spinner" aria-hidden="true" />
          <span className="export-img-preview-loading-text">{t('studio.rendering')}</span>
        </div>
      )}
      <div className="export-img-preview-mount" ref={mountRef} />
    </div>
  );
}
