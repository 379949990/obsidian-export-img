import { useEffect, useRef } from 'react';

interface PreviewPaneProps {
  mountRef: React.RefObject<HTMLDivElement | null>;
  rendering: boolean;
}

export function PreviewPane({ mountRef, rendering }: PreviewPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // keep scroll container available for future page indicators
  }, []);

  return (
    <div className="export-img-preview-pane" ref={scrollRef}>
      {rendering && <div className="export-img-preview-loading">…</div>}
      <div className="export-img-preview-mount" ref={mountRef} />
    </div>
  );
}
