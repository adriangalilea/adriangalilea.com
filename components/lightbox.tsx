"use client";

import { Expand, X } from "lucide-react";
import { Dialog, VisuallyHidden } from "radix-ui";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

function touchDistance(a: React.Touch, b: React.Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchMidpoint(
  a: React.Touch,
  b: React.Touch,
): { x: number; y: number } {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

function clampScale(s: number): number {
  return Math.min(4, Math.max(1, s));
}

function calcSourceTransform(
  sourceRect: DOMRect,
  fittedW: number,
): { transform: string; borderRadius: string } {
  const fcx = window.innerWidth / 2;
  const fcy = window.innerHeight / 2;
  const scx = sourceRect.left + sourceRect.width / 2;
  const scy = sourceRect.top + sourceRect.height / 2;
  const s = sourceRect.width / fittedW;
  return {
    transform: `translate(${scx - fcx}px, ${scy - fcy}px) scale(${s})`,
    borderRadius: `${12 / s}px`,
  };
}

type AnimPhase = "idle" | "entering" | "open" | "exiting";

const ANIM_MS = 300;
const ANIM_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

function useLightbox(src: string) {
  const [open, setOpenRaw] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const swipeYRef = useRef(0);
  const swipeStartRef = useRef<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const pinchRef = useRef<{
    dist: number;
    scale: number;
    panX: number;
    panY: number;
    midX: number;
    midY: number;
  } | null>(null);
  const touchMovedRef = useRef(false);
  const mouseDraggedRef = useRef(false);
  const wheelingRef = useRef(false);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [animPhase, setAnimPhaseRaw] = useState<AnimPhase>("idle");
  const animPhaseRef = useRef<AnimPhase>("idle");
  const setAnimPhase = useCallback((phase: AnimPhase) => {
    animPhaseRef.current = phase;
    setAnimPhaseRaw(phase);
  }, []);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const [fittedSize, setFittedSize] = useState<{
    w: number;
    h: number;
  } | null>(null);

  const zoomed = scale > 1;

  const applySwipeY = useCallback((y: number) => {
    swipeYRef.current = y;
    const el = containerRef.current;
    if (!el) return;
    if (y > 0) {
      el.style.transform = `translateY(${y}px)`;
      el.style.opacity = `${1 - y / 300}`;
      el.style.transition = "none";
    } else {
      el.style.transform = "";
      el.style.opacity = "";
      el.style.transition = "transform 0.2s, opacity 0.2s";
    }
  }, []);

  const resetState = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    applySwipeY(0);
    swipeStartRef.current = null;
    setDragStart(null);
    setFittedSize(null);
    pinchRef.current = null;
    touchMovedRef.current = false;
    mouseDraggedRef.current = false;
    wheelingRef.current = false;
    clearTimeout(wheelTimeoutRef.current);
    clearTimeout(exitTimeoutRef.current);
    setSourceRect(null);
    setAnimPhase("idle");
  }, [applySwipeY, setAnimPhase]);

  // useLayoutEffect so resetState (which sets animPhase="idle") triggers a
  // synchronous re-render before paint — the visibility cleanup then runs in
  // the same paint frame, preventing a one-frame gap where neither dialog nor
  // source is visible
  useLayoutEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  // Find the real source image, skipping blur placeholders and hidden elements
  const findSourceImg = useCallback((): HTMLImageElement | null => {
    const el = triggerRef.current;
    if (!el) return null;
    const stashed = (el as HTMLElement & { __lbSourceImg?: HTMLImageElement })
      .__lbSourceImg;
    if (stashed) return stashed;
    const candidates = el.querySelectorAll("img");
    for (const c of candidates) {
      if (c.src.startsWith("data:")) continue;
      if (c.getAttribute("aria-hidden") === "true") continue;
      return c;
    }
    // Fallback: any img with real dimensions
    for (const c of candidates) {
      if (c.naturalWidth > 100) return c;
    }
    return null;
  }, []);

  // Hide trigger for the entire lifetime of the lightbox (entering → open →
  // exiting). useLayoutEffect ensures the source is hidden before the browser
  // paints — critical during "entering" because the dialog overlay deactivates
  // CSS :hover on the source, which would otherwise snap it from its hovered
  // scale to rest position for one visible frame.
  useLayoutEffect(() => {
    if (animPhase === "idle") return;
    const target = findSourceImg() ?? triggerRef.current;
    if (!target) return;
    target.style.visibility = "hidden";
    return () => {
      target.style.visibility = "";
    };
  }, [animPhase, findSourceImg]);

  const requestOpen = useCallback(() => {
    clearTimeout(exitTimeoutRef.current);
    const el = triggerRef.current;
    if (el) {
      const img = findSourceImg();
      const rect = (img ?? el).getBoundingClientRect();
      setSourceRect(rect);
      if (img?.naturalWidth) {
        const padding = window.innerWidth >= 640 ? 32 : 16;
        const maxW = window.innerWidth - padding * 2;
        const maxH = window.innerHeight - padding * 2 - 48;
        const s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
        setFittedSize({ w: img.naturalWidth * s, h: img.naturalHeight * s });
      }
    }

    const beginEnter = () => {
      setAnimPhase("entering");
      setOpenRaw(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimPhase("open");
        });
      });
    };

    // Ensure image is cached before animating — the in-page <Image> uses a
    // Next.js-optimized URL so the original src may not be in the browser
    // cache yet, causing a flash of dark scrim with no visible image
    const probe = new Image();
    probe.src = src;
    if (probe.complete) {
      beginEnter();
    } else {
      probe.onload = beginEnter;
      probe.onerror = beginEnter;
    }
  }, [findSourceImg, src, setAnimPhase]);

  const requestClose = useCallback(() => {
    if (animPhase === "exiting") {
      clearTimeout(exitTimeoutRef.current);
      setOpenRaw(false);
      return;
    }
    if (scale > 1) {
      setOpenRaw(false);
      return;
    }
    // Re-capture source rect at rest position — hover transforms are inactive
    // while the dialog overlay blocks pointer events on the page beneath
    const target = findSourceImg() ?? triggerRef.current;
    if (target) {
      setSourceRect(target.getBoundingClientRect());
    }
    setAnimPhase("exiting");
    exitTimeoutRef.current = setTimeout(() => {
      setOpenRaw(false);
    }, ANIM_MS + 16);
  }, [animPhase, scale, findSourceImg, setAnimPhase]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) requestOpen();
      else requestClose();
    },
    [requestOpen, requestClose],
  );

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
        const newScale = clampScale(scale * (1 - e.deltaY * 0.01));
        if (newScale !== scale) {
          const ratio = newScale / scale;
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          setScale(newScale);
          setPan((prev) => ({
            x: prev.x * ratio - (e.clientX - cx) * (ratio - 1),
            y: prev.y * ratio - (e.clientY - cy) * (ratio - 1),
          }));
        }
      } else if (scale > 1) {
        setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, scale]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !fittedSize || scale <= 1) return;
    const maxX = Math.max(0, (fittedSize.w * scale - el.clientWidth) / 2);
    const maxY = Math.max(0, (fittedSize.h * scale - el.clientHeight) / 2);
    const cx = Math.min(maxX, Math.max(-maxX, pan.x));
    const cy = Math.min(maxY, Math.max(-maxY, pan.y));
    if (cx !== pan.x || cy !== pan.y) {
      setPan({ x: cx, y: cy });
    }
  }, [pan, scale, fittedSize]);

  const recalcFittedSize = useCallback(() => {
    // Don't override pre-calc during enter/exit animation
    const phase = animPhaseRef.current;
    if (phase === "entering" || phase === "exiting") return;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !img.naturalWidth) return;
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
      48;
    const fitScale = Math.min(maxW / naturalWidth, maxH / naturalHeight);
    const newW = naturalWidth * fitScale;
    const newH = naturalHeight * fitScale;
    setFittedSize((prev) => {
      if (prev && Math.abs(prev.w - newW) < 2 && Math.abs(prev.h - newH) < 2)
        return prev;
      return { w: newW, h: newH };
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", recalcFittedSize);
    return () => window.removeEventListener("resize", recalcFittedSize);
  }, [open, recalcFittedSize]);

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
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const mid = touchMidpoint(e.touches[0], e.touches[1]);
      pinchRef.current = {
        dist,
        scale,
        panX: pan.x,
        panY: pan.y,
        midX: mid.x,
        midY: mid.y,
      };
      setDragStart(null);
      swipeStartRef.current = null;
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
      swipeStartRef.current = touch.clientY;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchMovedRef.current = true;

    if (e.touches.length === 2 && pinchRef.current) {
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const newScale = clampScale(
        pinchRef.current.scale * (dist / pinchRef.current.dist),
      );
      const ratio = newScale / pinchRef.current.scale;
      const mid = touchMidpoint(e.touches[0], e.touches[1]);
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const smx = pinchRef.current.midX - cx;
        const smy = pinchRef.current.midY - cy;
        setPan({
          x: mid.x - cx - (smx - pinchRef.current.panX) * ratio,
          y: mid.y - cy - (smy - pinchRef.current.panY) * ratio,
        });
      }
      setScale(newScale);
      return;
    }

    const touch = e.touches[0];
    if (scale > 1 && dragStart) {
      setPan({
        x: dragStart.panX + (touch.clientX - dragStart.x),
        y: dragStart.panY + (touch.clientY - dragStart.y),
      });
    } else if (swipeStartRef.current !== null) {
      const delta = touch.clientY - swipeStartRef.current;
      if (delta > 0) applySwipeY(delta);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && pinchRef.current) {
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
        if (scale < 1.15) {
          setScale(1);
          setPan({ x: 0, y: 0 });
        }
        return;
      }

      if (scale > 1) {
        setDragStart(null);
      } else {
        // Swipe dismiss bypasses animation
        if (swipeYRef.current > 120) setOpenRaw(false);
        else applySwipeY(0);
        swipeStartRef.current = null;
      }
    }
  };

  return {
    open,
    setOpen: handleOpenChange,
    animPhase,
    sourceRect,
    zoomed,
    scale,
    pan,
    dragStart,
    pinchRef,
    wheelingRef,
    mouseDraggedRef,
    fittedSize,
    imgRef,
    containerRef,
    triggerRef,
    toggleZoom,
    toggleZoomKeyboard,
    recalcFittedSize,
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
    if (e.target !== e.currentTarget) return;
    if (lb.mouseDraggedRef.current) {
      lb.mouseDraggedRef.current = false;
      return;
    }
    lb.setOpen(false);
  };

  const isAnimating = lb.animPhase === "entering" || lb.animPhase === "exiting";

  const getImageStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: lb.fittedSize ? lb.fittedSize.w : "auto",
      height: lb.fittedSize ? lb.fittedSize.h : "auto",
      cursor: lb.zoomed ? (lb.dragStart ? "grabbing" : "zoom-out") : "zoom-in",
    };

    const animTransition = `transform ${ANIM_MS}ms ${ANIM_EASE}, border-radius ${ANIM_MS}ms ${ANIM_EASE}`;

    if (lb.animPhase === "entering" && lb.sourceRect && lb.fittedSize) {
      const t = calcSourceTransform(lb.sourceRect, lb.fittedSize.w);
      return {
        ...base,
        transform: t.transform,
        borderRadius: t.borderRadius,
        transition: "none",
      };
    }

    if (lb.animPhase === "exiting" && lb.sourceRect && lb.fittedSize) {
      const t = calcSourceTransform(lb.sourceRect, lb.fittedSize.w);
      return {
        ...base,
        transform: t.transform,
        borderRadius: t.borderRadius,
        transition: animTransition,
      };
    }

    // open or idle — normal zoom/pan behavior
    return {
      ...base,
      transform: lb.zoomed
        ? `scale(${lb.scale}) translate(${lb.pan.x / lb.scale}px, ${lb.pan.y / lb.scale}px)`
        : "none",
      borderRadius: "0px",
      transition:
        lb.dragStart || lb.pinchRef.current || lb.wheelingRef.current
          ? "none"
          : animTransition,
    };
  };

  const scrimVisible =
    lb.animPhase !== "entering" && lb.animPhase !== "exiting";

  return (
    <Dialog.Portal>
      <Dialog.Content
        className="fixed inset-0 z-50 outline-none"
        style={{
          backgroundColor: scrimVisible ? "var(--glass-scrim)" : "transparent",
          transition: `background-color ${ANIM_MS}ms ${ANIM_EASE}`,
        }}
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
            style={{
              opacity: scrimVisible ? 1 : 0,
              transition: `opacity ${ANIM_MS}ms ${ANIM_EASE}`,
            }}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </Dialog.Close>

        <div
          ref={lb.containerRef}
          className="flex items-center justify-center w-full h-full p-4 sm:p-8"
          style={{ touchAction: "none" }}
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
            onLoad={lb.recalcFittedSize}
            onClick={lb.toggleZoom}
            onKeyDown={lb.toggleZoomKeyboard}
            className="select-none"
            style={getImageStyle()}
          />
        </div>
        {caption && !lb.zoomed && !isAnimating && (
          <div className="fixed bottom-8 left-0 right-0 z-[55] pointer-events-none text-sm text-white/60 text-center max-w-xl mx-auto px-4 [&_em]:italic [&_del]:line-through">
            {caption}
          </div>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function usePreloadImage(src: string, eager = false) {
  useEffect(() => {
    if (eager) {
      const img = new Image();
      img.src = src;
      return;
    }
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(() => {
        const img = new Image();
        img.src = src;
      });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(() => {
      const img = new Image();
      img.src = src;
    }, 2000);
    return () => clearTimeout(t);
  }, [src, eager]);
}

type LightboxProps = {
  src: string;
  alt?: string;
  caption?: ReactNode;
  children: ReactNode;
  eager?: boolean;
};

export function Lightbox({
  src,
  alt = "",
  caption,
  children,
  eager,
}: LightboxProps) {
  const lb = useLightbox(src);
  usePreloadImage(src, eager);

  return (
    <Dialog.Root open={lb.open} onOpenChange={lb.setOpen}>
      <Dialog.Trigger asChild>
        <span
          ref={lb.triggerRef as React.RefObject<HTMLSpanElement>}
          className="cursor-zoom-in"
        >
          {children}
        </span>
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
  const lb = useLightbox(src);
  usePreloadImage(src);

  // Try to find sibling image for source rect animation
  useEffect(() => {
    const btn = lb.triggerRef.current;
    if (!btn) return;
    const parent = btn.closest(".group") as HTMLElement | null;
    const img = parent?.querySelector("img") as HTMLElement | null;
    if (img) {
      // Stash the parent image ref so findSourceImg can find it
      (btn as HTMLElement & { __lbSourceImg?: HTMLElement }).__lbSourceImg =
        img;
    }
  }, [lb.triggerRef]);

  return (
    <Dialog.Root open={lb.open} onOpenChange={lb.setOpen}>
      <Dialog.Trigger asChild>
        <button
          ref={lb.triggerRef as React.RefObject<HTMLButtonElement>}
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
