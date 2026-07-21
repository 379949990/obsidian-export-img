import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'preact/hooks';
import type { JSX } from 'preact';
import { t } from '../i18n';

interface PreviewPaneProps {
  imageUrls: string[];
  rendering: boolean;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 6;

export function PreviewPane({ imageUrls, rendering }: PreviewPaneProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originTx: number;
    originTy: number;
  }>({ active: false, startX: 0, startY: 0, originTx: 0, originTy: 0 });

  const primaryUrl = imageUrls[0] ?? null;
  const pageCount = imageUrls.length;

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !natural.w || !natural.h) return;

    const availW = Math.max(40, viewport.clientWidth);
    const gap = availW * 0.03;
    // 94% width (3% side gaps); top also uses 3% of width as gap.
    const next = (availW * 0.94) / natural.w;
    const scaledH = natural.h * next;
    // Image is positioned with translate(-50%, -50%) around viewport center.
    // Move its top edge to `gap` from the viewport top.
    const nextTy = gap + scaledH / 2 - viewport.clientHeight / 2;

    setScale(next);
    setTx(0);
    setTy(nextTy);
  }, [natural.h, natural.w]);

  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    setNatural({ w: 0, h: 0 });
  }, [primaryUrl, pageCount]);

  useEffect(() => {
    if (natural.w > 0) fitToView();
  }, [natural.w, natural.h, fitToView]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      if (!dragRef.current.active) fitToView();
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fitToView]);

  const onWheel = (event: JSX.TargetedWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const cx = event.clientX - rect.left - rect.width / 2;
    const cy = event.clientY - rect.top - rect.height / 2;
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    const ratio = next / scale;
    setTx(cx - (cx - tx) * ratio);
    setTy(cy - (cy - ty) * ratio);
    setScale(next);
  };

  const onPointerDown = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (!primaryUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originTx: tx,
      originTy: ty,
    };
  };

  const onPointerMove = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    setTx(dragRef.current.originTx + (event.clientX - dragRef.current.startX));
    setTy(dragRef.current.originTy + (event.clientY - dragRef.current.startY));
  };

  const endDrag = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="export-img-preview-pane"
      ref={viewportRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDblClick={() => fitToView()}
    >
      <div className="export-img-checkerboard" aria-hidden="true" />
      {primaryUrl ? (
        <div
          className="export-img-preview-stack"
          style={{
            transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${scale})`,
          }}
        >
          {imageUrls.map((url, index) => (
            <div key={`${url}-${index}`} className="export-img-preview-page">
              {pageCount > 1 && (
                <div className="export-img-preview-page-label">
                  {t('studio.pageOf', { page: index + 1, total: pageCount })}
                </div>
              )}
              <img
                className="export-img-preview-image"
                src={url}
                alt=""
                draggable={false}
                onLoad={(e) => {
                  if (index !== 0) return;
                  const img = e.currentTarget;
                  // Stack height ≈ sum of pages; for fit use first page width and full stack height.
                  const stack = e.currentTarget.closest('.export-img-preview-stack');
                  const totalH = stack
                    ? Array.from(stack.querySelectorAll('img')).reduce(
                        (sum, node) => sum + node.naturalHeight,
                        0,
                      ) + Math.max(0, pageCount - 1) * 16
                    : img.naturalHeight;
                  setNatural({ w: img.naturalWidth, h: totalH || img.naturalHeight });
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        !rendering && (
          <div className="export-img-preview-empty">{t('studio.previewEmpty')}</div>
        )
      )}
      {rendering && (
        <div className="export-img-preview-loading" aria-live="polite">
          <div className="export-img-spinner" aria-hidden="true" />
          <span className="export-img-preview-loading-text">{t('studio.rendering')}</span>
        </div>
      )}
      {primaryUrl && !rendering && (
        <div className="export-img-preview-hint">{t('studio.previewHint')}</div>
      )}
    </div>
  );
}
