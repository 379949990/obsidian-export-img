import type { TargetedPointerEvent, TargetedWheelEvent } from 'preact';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'preact/hooks';
import { Platform } from 'obsidian';
import { t } from '../i18n';

interface PreviewPaneProps {
  imageUrls: string[];
  rendering: boolean;
  /** Bump to force fit-to-view (title-bar refresh). */
  viewResetNonce?: number;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 6;

/**
 * Margin as a fraction of the *displayed image width*.
 * left + image + right = viewport → imageWidth = viewport / (1 + 2 * MARGIN_RATIO)
 * top uses the same gap length (3% of image width).
 */
const MARGIN_RATIO = 0.03;

const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_SLOP_PX = 28;

interface Frame {
  scale: number;
  x: number;
  y: number;
}

interface PointerSample {
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

function pointerDistance(a: PointerSample, b: PointerSample): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function pointerMidpoint(a: PointerSample, b: PointerSample): PointerSample {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function PreviewPane({ imageUrls, rendering, viewResetNonce = 0 }: PreviewPaneProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame>({ scale: 1, x: 0, y: 0 });
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const fittedOnceRef = useRef(false);
  const userMovedRef = useRef(false);
  const pendingResetRef = useRef(false);
  const lastResetNonceRef = useRef(viewResetNonce);
  const pointersRef = useRef(new Map<number, PointerSample>());
  const dragRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0 });
  const pinchRef = useRef<{
    active: boolean;
    startDist: number;
    startScale: number;
    originX: number;
    originY: number;
    localX: number;
    localY: number;
  } | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);

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
      pendingResetRef.current = false;
      fittedOnceRef.current = true;
      setFrame(initialFrame(vp.clientWidth, w));
    };

    apply();
  }, [pageCount]);

  const shouldFit = () => !fittedOnceRef.current || pendingResetRef.current;

  useEffect(() => {
    if (viewResetNonce === lastResetNonceRef.current) return;
    lastResetNonceRef.current = viewResetNonce;
    if (viewResetNonce === 0) return;
    pendingResetRef.current = true;
    if (primaryUrl) {
      fitToView();
    }
  }, [viewResetNonce, primaryUrl, fitToView]);

  useEffect(() => {
    if (!primaryUrl) return;
    if (!shouldFit()) return;

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
      if (userMovedRef.current || dragRef.current.active || pinchRef.current?.active) return;
      if (!fittedOnceRef.current) {
        fitToView();
        return;
      }
      if (!userMovedRef.current) {
        fitToView();
      }
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

  const beginPinch = (viewport: HTMLDivElement) => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    const dist = pointerDistance(a!, b!);
    if (dist < 8) return;
    const rect = viewport.getBoundingClientRect();
    const mid = pointerMidpoint(a!, b!);
    const cx = mid.x - rect.left;
    const cy = mid.y - rect.top;
    const cur = frameRef.current;
    dragRef.current.active = false;
    pinchRef.current = {
      active: true,
      startDist: dist,
      startScale: cur.scale,
      originX: cur.x,
      originY: cur.y,
      localX: (cx - cur.x) / cur.scale,
      localY: (cy - cur.y) / cur.scale,
    };
  };

  const updatePinch = (viewport: HTMLDivElement) => {
    const pinch = pinchRef.current;
    if (!pinch?.active) return;
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    const dist = pointerDistance(a!, b!);
    if (dist < 8) return;
    const rect = viewport.getBoundingClientRect();
    const mid = pointerMidpoint(a!, b!);
    const cx = mid.x - rect.left;
    const cy = mid.y - rect.top;
    const nextScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, pinch.startScale * (dist / pinch.startDist)),
    );
    userMovedRef.current = true;
    setFrame({
      scale: nextScale,
      x: cx - pinch.localX * nextScale,
      y: cy - pinch.localY * nextScale,
    });
  };

  const onPointerDown = (event: TargetedPointerEvent<HTMLDivElement>) => {
    if (!primaryUrl) return;
    const viewport = event.currentTarget;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      viewport.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    if (pointersRef.current.size >= 2) {
      lastTapRef.current = null;
      beginPinch(viewport);
      return;
    }

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: frameRef.current.x,
      originY: frameRef.current.y,
    };
  };

  const onPointerMove = (event: TargetedPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2) {
      updatePinch(event.currentTarget);
      return;
    }

    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) return;
    userMovedRef.current = true;
    setFrame({
      scale: frameRef.current.scale,
      x: dragRef.current.originX + (event.clientX - dragRef.current.startX),
      y: dragRef.current.originY + (event.clientY - dragRef.current.startY),
    });
  };

  const endPointer = (event: TargetedPointerEvent<HTMLDivElement>) => {
    const wasPinching = !!pinchRef.current?.active;
    pointersRef.current.delete(event.pointerId);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (dragRef.current.pointerId === event.pointerId) {
      dragRef.current.active = false;
    }

    // Double-tap to fit (mobile); desktop still has onDblClick.
    if (wasPinching || pointersRef.current.size > 0 || event.pointerType === 'mouse') {
      return;
    }
    const now = Date.now();
    const prev = lastTapRef.current;
    if (
      prev &&
      now - prev.t <= DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - prev.x, event.clientY - prev.y) <= DOUBLE_TAP_SLOP_PX
    ) {
      lastTapRef.current = null;
      fitToView();
      return;
    }
    lastTapRef.current = { t: now, x: event.clientX, y: event.clientY };
  };

  const hint = Platform.isMobile ? t('studio.previewHintMobile') : t('studio.previewHint');

  return (
    <div
      className="export-img-preview-pane"
      ref={viewportRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
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
                  if (shouldFit()) fitToView();
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
        <div className="export-img-preview-hint">{hint}</div>
      )}
    </div>
  );
}
