"use client";

import { Expand, X } from "lucide-react";
import { Dialog, VisuallyHidden } from "radix-ui";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

function touchDistance(a: React.Touch, b: React.Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function clampScale(s: number): number {
  return Math.min(4, Math.max(1, s));
}

function useLightbox() {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [swipeY, setSwipeY] = useState(0);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const touchMovedRef = useRef(false);
  const mouseDraggedRef = useRef(false);
  const wheelingRef = useRef(false);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const zoomed = scale > 1;

  const [fittedSize, setFittedSize] = useState<{
    w: number;
    h: number;
  } | null>(null);

  const resetState = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setSwipeY(0);
    setSwipeStart(null);
    setDragStart(null);
    setFittedSize(null);
    pinchRef.current = null;
    touchMovedRef.current = false;
    mouseDraggedRef.current = false;
    wheelingRef.current = false;
    clearTimeout(wheelTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !open) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelingRef.current = true;
      clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => {
        wheelingRef.current = false;
      }, 150);
      if (e.ctrlKey) {
        setScale((prev) => clampScale(prev * (1 - e.deltaY * 0.01)));
      } else if (scale > 1) {
        setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, scale]);

  const onImgLoad = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const { naturalWidth, naturalHeight } = img;
    const cs = getComputedStyle(container);
    const maxW =
      container.clientWidth -
      parseFloat(cs.paddingLeft) -
      parseFloat(cs.paddingRight);
    const maxH =
      container.clientHeight -
      parseFloat(cs.paddingTop) -
      parseFloat(cs.paddingBottom) -
      48; // reserve space for caption
    const fitScale = Math.min(maxW / naturalWidth, maxH / naturalHeight);
    setFittedSize({ w: naturalWidth * fitScale, h: naturalHeight * fitScale });
  }, []);

  const toggleZoom = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (touchMovedRef.current) {
      touchMovedRef.current = false;
      return;
    }
    if (mouseDraggedRef.current) {
      mouseDraggedRef.current = false;
      return;
    }
    if (zoomed) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;
    setPan({
      x: (0.5 - clickX) * rect.width,
      y: (0.5 - clickY) * rect.height,
    });
    setScale(2);
  };

  const toggleZoomKeyboard = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (zoomed) {
        setScale(1);
        setPan({ x: 0, y: 0 });
      } else {
        setScale(2);
      }
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!zoomed) return;
    e.preventDefault();
    mouseDraggedRef.current = false;
    setDragStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart) return;
    mouseDraggedRef.current = true;
    setPan({
      x: dragStart.panX + (e.clientX - dragStart.x),
      y: dragStart.panY + (e.clientY - dragStart.y),
    });
  };

  const onMouseUp = () => setDragStart(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchMovedRef.current = false;

    if (e.touches.length === 2) {
      // Start pinch
      const dist = touchDistance(e.touches[0], e.touches[1]);
      pinchRef.current = { dist, scale };
      setDragStart(null);
      setSwipeStart(null);
      return;
    }

    const touch = e.touches[0];
    if (zoomed) {
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
        panX: pan.x,
        panY: pan.y,
      });
    } else {
      setSwipeStart(touch.clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchMovedRef.current = true;

    if (e.touches.length === 2 && pinchRef.current) {
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const newScale = clampScale(
        pinchRef.current.scale * (dist / pinchRef.current.dist),
      );
      setScale(newScale);
      return;
    }

    const touch = e.touches[0];
    if (scale > 1 && dragStart) {
      setPan({
        x: dragStart.panX + (touch.clientX - dragStart.x),
        y: dragStart.panY + (touch.clientY - dragStart.y),
      });
    } else if (swipeStart !== null) {
      const delta = touch.clientY - swipeStart;
      if (delta > 0) setSwipeY(delta);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && pinchRef.current) {
      // Dropped from 2 fingers to 1: transition pinch → drag
      pinchRef.current = null;
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
        panX: pan.x,
        panY: pan.y,
      });
      return;
    }

    if (e.touches.length === 0) {
      if (pinchRef.current) {
        pinchRef.current = null;
        // Snap to 1x if barely zoomed
        if (scale < 1.15) {
          setScale(1);
          setPan({ x: 0, y: 0 });
        }
        return;
      }

      if (scale > 1) {
        setDragStart(null);
      } else {
        if (swipeY > 120) setOpen(false);
        else setSwipeY(0);
        setSwipeStart(null);
      }
    }
  };

  return {
    open,
    setOpen,
    zoomed,
    scale,
    pan,
    dragStart,
    pinchRef,
    wheelingRef,
    swipeY,
    fittedSize,
    imgRef,
    containerRef,
    toggleZoom,
    toggleZoomKeyboard,
    onImgLoad,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

function LightboxDialog({
  src,
  alt,
  caption,
  lb,
}: {
  src: string;
  alt: string;
  caption?: ReactNode;
  lb: ReturnType<typeof useLightbox>;
}) {
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) lb.setOpen(false);
  };

  return (
    <Dialog.Portal>
      <Dialog.Content
        className="fixed inset-0 z-50 outline-none bg-(--glass-scrim)"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <VisuallyHidden.Root>
          <Dialog.Title>{alt || "Image lightbox"}</Dialog.Title>
        </VisuallyHidden.Root>
        <Dialog.Close asChild>
          <button
            type="button"
            className="fixed top-4 right-4 z-[60] rounded-full bg-white/10 p-2 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </Dialog.Close>

        <div
          ref={lb.containerRef}
          className="flex flex-col items-center justify-center w-full h-full p-4 sm:p-8"
          style={{
            touchAction: "none",
            transform: lb.swipeY > 0 ? `translateY(${lb.swipeY}px)` : undefined,
            opacity: lb.swipeY > 0 ? 1 - lb.swipeY / 300 : undefined,
            transition:
              lb.swipeY === 0 ? "transform 0.2s, opacity 0.2s" : "none",
          }}
          onClick={handleBackdropClick}
          onMouseDown={lb.onMouseDown}
          onMouseMove={lb.onMouseMove}
          onMouseUp={lb.onMouseUp}
          onMouseLeave={lb.onMouseUp}
          onTouchStart={lb.onTouchStart}
          onTouchMove={lb.onTouchMove}
          onTouchEnd={lb.onTouchEnd}
        >
          <img
            ref={lb.imgRef}
            src={src}
            alt={alt}
            draggable={false}
            onLoad={lb.onImgLoad}
            onClick={lb.toggleZoom}
            onKeyDown={lb.toggleZoomKeyboard}
            className="select-none"
            style={{
              width: lb.fittedSize ? lb.fittedSize.w : "auto",
              height: lb.fittedSize ? lb.fittedSize.h : "auto",
              cursor: lb.zoomed
                ? lb.dragStart
                  ? "grabbing"
                  : "zoom-out"
                : "zoom-in",
              transform: lb.zoomed
                ? `scale(${lb.scale}) translate(${lb.pan.x / lb.scale}px, ${lb.pan.y / lb.scale}px)`
                : "scale(1)",
              transition:
                lb.dragStart || lb.pinchRef.current || lb.wheelingRef.current
                  ? "none"
                  : "transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
            }}
          />
          {caption && !lb.zoomed && (
            <div className="mt-4 text-sm text-white/60 text-center max-w-xl [&_em]:italic [&_del]:line-through">
              {caption}
            </div>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

type LightboxProps = {
  src: string;
  alt?: string;
  caption?: ReactNode;
  children: ReactNode;
};

export function Lightbox({ src, alt = "", caption, children }: LightboxProps) {
  const lb = useLightbox();

  return (
    <Dialog.Root open={lb.open} onOpenChange={lb.setOpen}>
      <Dialog.Trigger asChild>
        <span className="cursor-zoom-in">{children}</span>
      </Dialog.Trigger>
      <LightboxDialog src={src} alt={alt} caption={caption} lb={lb} />
    </Dialog.Root>
  );
}

type LightboxExpandButtonProps = {
  src: string;
  alt?: string;
};

export function LightboxExpandButton({
  src,
  alt = "",
}: LightboxExpandButtonProps) {
  const lb = useLightbox();

  return (
    <Dialog.Root open={lb.open} onOpenChange={lb.setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="absolute bottom-2 right-2 z-10 rounded-full bg-black/40 p-1.5 text-white/80 hover:text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-70"
          aria-label="Expand image"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Expand className="size-3.5" />
        </button>
      </Dialog.Trigger>
      <LightboxDialog src={src} alt={alt} lb={lb} />
    </Dialog.Root>
  );
}
