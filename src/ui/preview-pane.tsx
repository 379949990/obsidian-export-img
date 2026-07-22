import type { TargetedPointerEvent, TargetedWheelEvent } from 'preact';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'preact/hooks';
import { t } from '../i18n';

interface PreviewPaneProps {
  imageUrls: string[];
  rendering: boolean;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 6;

/**
 * Margin as a fraction of the *displayed image width*.
 * left + image + right = viewport → imageWidth = viewport / (1 + 2 * MARGIN_RATIO)
 * top uses the same gap length (3% of image width).
 */
const MARGIN_RATIO = 0.03;

interface Frame {
  scale: number;
  x: number;
  y: number;
}

function initialFrame(viewportW: number, naturalW: number): Frame {
  const vw = Math.max(40, viewportW);
  const imageW = vw / (1 + 2 * MARGIN_RATIO);
  const gap = imageW * MARGIN_RATIO;
  return {
    scale: imageW / naturalW,
    x: gap,
    y: gap,
  };
}

function measureStackSize(stack: HTMLElement | null, pageCount: number): { w: number; h: number } {
  if (!stack) return { w: 0, h: 0 };
  const images = Array.from(stack.querySelectorAll('img'));
  const first = images[0];
  if (!first || first.naturalWidth <= 0) return { w: 0, h: 0 };
  const totalH =
    images.reduce((sum, node) => sum + node.naturalHeight, 0) +
    Math.max(0, pageCount - 1) * 16;
  return { w: first.naturalWidth, h: totalH || first.naturalHeight };
}

export function PreviewPane({ imageUrls, rendering }: PreviewPaneProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame>({ scale: 1, x: 0, y: 0 });
  const userMovedRef = useRef(false);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const primaryUrl = imageUrls[0] ?? null;
  const pageCount = imageUrls.length;
  const { scale, x, y } = frame;

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const apply = () => {
      const vp = viewportRef.current;
      const st = stackRef.current;
      if (!vp) return;
      if (vp.clientWidth < 80) {
        window.requestAnimationFrame(apply);
        return;
      }
      const { w } = measureStackSize(st, pageCount);
      if (w <= 0) return;
      userMovedRef.current = false;
      setFrame(initialFrame(vp.clientWidth, w));
    };

    apply();
  }, [pageCount]);

  // Blob/cached images often finish before onLoad is attached — poll complete on URL change.
  useEffect(() => {
    if (!primaryUrl) return;
    userMovedRef.current = false;
    let cancelled = false;

    const tryFit = () => {
      if (cancelled) return;
      const stack = stackRef.current;
      const img = stack?.querySelector('img');
      if (img && img.complete && img.naturalWidth > 0) {
        fitToView();
        return;
      }
      window.requestAnimationFrame(tryFit);
    };

    const id = window.requestAnimationFrame(tryFit);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [primaryUrl, pageCount, fitToView]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      if (userMovedRef.current || dragRef.current.active) return;
      fitToView();
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fitToView]);

  const onWheel = (event: TargetedWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport || !primaryUrl) return;

    const rect = viewport.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    const localX = (cx - x) / scale;
    const localY = (cy - y) / scale;

    userMovedRef.current = true;
    setFrame({
      scale: nextScale,
      x: cx - localX * nextScale,
      y: cy - localY * nextScale,
    });
  };

  const onPointerDown = (event: TargetedPointerEvent<HTMLDivElement>) => {
    if (!primaryUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: x,
      originY: y,
    };
  };

  const onPointerMove = (event: TargetedPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    userMovedRef.current = true;
    setFrame({
      scale,
      x: dragRef.current.originX + (event.clientX - dragRef.current.startX),
      y: dragRef.current.originY + (event.clientY - dragRef.current.startY),
    });
  };

  const endDrag = (event: TargetedPointerEvent<HTMLDivElement>) => {
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
      onDblClick={(e) => {
        e.preventDefault();
        fitToView();
      }}
    >
      <div className="export-img-checkerboard" aria-hidden="true" />
      {primaryUrl ? (
        <div
          key={`${primaryUrl}:${pageCount}`}
          className="export-img-preview-stack"
          ref={stackRef}
          style={{
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
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
                onLoad={() => {
                  if (index !== 0) return;
                  fitToView();
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
