import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { t } from '../i18n';

interface PreviewPaneProps {
  imageUrl: string | null;
  rendering: boolean;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 6;

export function PreviewPane({ imageUrl, rendering }: PreviewPaneProps) {
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

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !natural.w || !natural.h) return;
    const pad = 32;
    const availW = Math.max(80, viewport.clientWidth - pad);
    const availH = Math.max(80, viewport.clientHeight - pad);
    const next = Math.min(1, availW / natural.w, availH / natural.h);
    setScale(next);
    setTx(0);
    setTy(0);
  }, [natural.h, natural.w]);

  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    setNatural({ w: 0, h: 0 });
  }, [imageUrl]);

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

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
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

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!imageUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originTx: tx,
      originTy: ty,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    setTx(dragRef.current.originTx + (event.clientX - dragRef.current.startX));
    setTy(dragRef.current.originTy + (event.clientY - dragRef.current.startY));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
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
      onDoubleClick={() => fitToView()}
    >
      <div className="export-img-checkerboard" aria-hidden="true" />
      {imageUrl ? (
        <img
          className="export-img-preview-image"
          src={imageUrl}
          alt=""
          draggable={false}
          style={{
            transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${scale})`,
          }}
          onLoad={(e) => {
            const img = e.currentTarget;
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }}
        />
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
      {imageUrl && !rendering && (
        <div className="export-img-preview-hint">{t('studio.previewHint')}</div>
      )}
    </div>
  );
}
