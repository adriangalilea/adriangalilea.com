"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Lightbox } from "@/components/lightbox";
import { slugToGradient } from "@/lib/gradient";
import { isGif, isVideo } from "@/lib/media";

function GrainOverlay() {
  return (
    <div className="cover-grain absolute inset-0 z-10 pointer-events-none" />
  );
}

type CoverImageProps = {
  cover: string | null;
  slug: string;
  title: string;
  sizes?: string;
  priority?: boolean;
  /** Use intrinsic sizing with object-cover (for feed cards) */
  intrinsic?: boolean;
  /** Actual image dimensions for proper aspect ratio (prevents layout shift) */
  width?: number | null;
  height?: number | null;
  /** Static poster image for animated covers (shown until hover) */
  poster?: string | null;
  /** Blurred base64 placeholder for instant display before load */
  blurDataURL?: string | null;
  /** Play animation on hover only (for cards) vs autoplay (for page headers) */
  hoverPlay?: boolean;
  /** Whether video covers loop (default true) */
  loop?: boolean;
  /** Wrap static covers in a fullscreen lightbox on click */
  lightbox?: boolean;
  /** Natural proportions with max-height constraint (for page headers) */
  contained?: boolean;
};

function AnimatedCover({
  src,
  poster,
  blurDataURL,
  intrinsic,
  aspectRatio,
  hoverPlay,
  loop,
}: {
  src: string;
  poster?: string | null;
  blurDataURL?: string | null;
  intrinsic: boolean;
  aspectRatio: number;
  hoverPlay: boolean;
  loop: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    setIsTouchDevice(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Desktop hover-play: mouseenter/mouseleave on .group ancestor
  useEffect(() => {
    if (!hoverPlay || isTouchDevice) return;

    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const group =
      container.closest(".group") || container.closest("[class*='group/']");
    if (!group) return;

    const handleEnter = () => {
      video.currentTime = 0;
      video.style.opacity = "1";
      video.play();
    };

    const handleLeave = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        video.pause();
        video.currentTime = 0;
      }, 300);
    };

    group.addEventListener("mouseenter", handleEnter);
    group.addEventListener("mouseleave", handleLeave);

    return () => {
      group.removeEventListener("mouseenter", handleEnter);
      group.removeEventListener("mouseleave", handleLeave);
    };
  }, [hoverPlay, isTouchDevice]);

  // Mobile viewport-play: IntersectionObserver autoplay when visible
  useEffect(() => {
    if (!hoverPlay || !isTouchDevice) return;

    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused) {
          video.currentTime = 0;
          video.style.opacity = "1";
          video.play();
        } else {
          video.style.opacity = "0";
          setTimeout(() => {
            video.pause();
            video.currentTime = 0;
          }, 300);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [hoverPlay, isTouchDevice, userPaused]);

  // Click/tap toggle for all interactive cases
  const handleClick = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      setUserPaused(false);
      video.play();
    } else {
      setUserPaused(true);
      video.pause();
    }
  };

  const isClickable = !hoverPlay || isTouchDevice;

  const containerStyle: React.CSSProperties = {
    ...(intrinsic ? { aspectRatio } : undefined),
    ...(blurDataURL
      ? { backgroundImage: `url(${blurDataURL})`, backgroundSize: "cover" }
      : undefined),
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${intrinsic ? "" : "h-full w-full"} overflow-hidden bg-black ${isClickable ? "cursor-pointer" : ""}`}
      style={containerStyle}
      {...(isClickable
        ? {
            role: "button",
            tabIndex: 0,
            onClick: handleClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            },
          }
        : undefined)}
    >
      {hoverPlay && poster && (
        <img
          src={poster}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <video
        ref={videoRef}
        src={src}
        autoPlay={!hoverPlay}
        loop={loop}
        muted
        playsInline
        preload={hoverPlay ? "none" : "auto"}
        className={`${hoverPlay ? "absolute inset-0 w-full h-full object-cover" : intrinsic ? "w-full h-full object-cover" : "absolute inset-0 h-full w-full object-cover"}`}
        style={
          hoverPlay
            ? { opacity: 0, transition: "opacity 0.3s ease-out" }
            : undefined
        }
      />
      <GrainOverlay />
    </div>
  );
}

export function CoverImage({
  cover,
  slug,
  title,
  sizes,
  priority,
  intrinsic,
  width,
  height,
  poster,
  blurDataURL,
  hoverPlay,
  loop = true,
  lightbox,
  contained,
}: CoverImageProps) {
  // Default dimensions if not provided
  const imgWidth = width ?? 1200;
  const imgHeight = height ?? 630;
  const aspectRatio = imgWidth && imgHeight ? imgWidth / imgHeight : 16 / 9;

  if (cover) {
    // Contained mode: blurred bg + object-contain, self-sizing via aspect-ratio + max-height cap
    if (contained) {
      const bgBlurClass =
        "absolute inset-0 h-full w-full scale-150 object-cover blur-3xl opacity-60";
      const containerStyle: React.CSSProperties = {
        aspectRatio,
        ...(blurDataURL
          ? {
              backgroundImage: `url(${blurDataURL})`,
              backgroundSize: "cover",
            }
          : undefined),
      };

      if (isVideo(cover)) {
        return (
          <div
            className="relative w-full max-h-[32rem] overflow-hidden rounded-2xl"
            style={containerStyle}
          >
            {poster && (
              <img
                src={poster}
                alt=""
                aria-hidden
                draggable={false}
                className={bgBlurClass}
              />
            )}
            <video
              src={cover}
              autoPlay
              loop={loop}
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
            />
            <GrainOverlay />
          </div>
        );
      }

      if (isGif(cover)) {
        const content = (
          <div
            className="relative w-full max-h-[32rem] overflow-hidden rounded-2xl"
            style={containerStyle}
          >
            <img
              src={cover}
              alt=""
              aria-hidden
              draggable={false}
              className={bgBlurClass}
            />
            <img
              src={cover}
              alt={title}
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain"
            />
            <GrainOverlay />
          </div>
        );
        return lightbox ? (
          <Lightbox src={cover} alt={title}>
            {content}
          </Lightbox>
        ) : (
          content
        );
      }

      // Static image: blurred bg + object-contain via Next.js Image
      const content = (
        <div
          className="relative w-full max-h-[32rem] overflow-hidden rounded-2xl"
          style={containerStyle}
        >
          <img
            src={cover}
            alt=""
            aria-hidden
            draggable={false}
            className={bgBlurClass}
          />
          <Image
            src={cover}
            alt={title}
            fill
            draggable={false}
            className="object-contain"
            sizes={sizes ?? "100vw"}
            priority={priority}
          />
          <GrainOverlay />
        </div>
      );
      return lightbox ? (
        <Lightbox src={cover} alt={title}>
          {content}
        </Lightbox>
      ) : (
        content
      );
    }

    // Videos - use AnimatedCover for hover-play behavior
    if (isVideo(cover)) {
      return (
        <AnimatedCover
          src={cover}
          poster={poster}
          blurDataURL={blurDataURL}
          intrinsic={intrinsic ?? false}
          aspectRatio={aspectRatio}
          hoverPlay={hoverPlay ?? false}
          loop={loop}
        />
      );
    }

    // GIFs - if hoverPlay is requested and we have a poster, use overlay technique
    if (isGif(cover)) {
      if (hoverPlay && poster) {
        return (
          <div
            className={`group relative ${intrinsic ? "" : "h-full w-full"} overflow-hidden`}
            style={{
              ...(intrinsic ? { aspectRatio } : undefined),
              ...(blurDataURL
                ? {
                    backgroundImage: `url(${blurDataURL})`,
                    backgroundSize: "cover",
                  }
                : undefined),
            }}
          >
            <img
              src={poster}
              alt={title}
              draggable={false}
              className={`${intrinsic ? "w-full h-full object-cover" : "absolute inset-0 h-full w-full object-cover"} transition-opacity duration-300 group-hover:opacity-0`}
            />
            <img
              src={cover}
              alt={title}
              draggable={false}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 opacity-0 group-hover:opacity-100`}
            />
            <GrainOverlay />
          </div>
        );
      }
      return (
        <div
          className={`relative ${intrinsic ? "" : "h-full w-full"} overflow-hidden`}
          style={{
            ...(intrinsic ? { aspectRatio } : undefined),
            ...(blurDataURL
              ? {
                  backgroundImage: `url(${blurDataURL})`,
                  backgroundSize: "cover",
                }
              : undefined),
          }}
        >
          <img
            src={cover}
            alt={title}
            draggable={false}
            className={
              intrinsic
                ? "w-full h-full object-cover"
                : "absolute inset-0 h-full w-full object-cover"
            }
          />
          <GrainOverlay />
        </div>
      );
    }

    // Intrinsic mode for feed cards
    if (intrinsic) {
      const content = (
        <div
          className="relative overflow-hidden"
          style={{
            aspectRatio,
            ...(blurDataURL
              ? {
                  backgroundImage: `url(${blurDataURL})`,
                  backgroundSize: "cover",
                }
              : undefined),
          }}
        >
          <img
            src={cover}
            alt={title}
            draggable={false}
            className="w-full h-full object-cover"
          />
          <GrainOverlay />
        </div>
      );

      if (lightbox) {
        return (
          <Lightbox src={cover} alt={title}>
            {content}
          </Lightbox>
        );
      }

      return content;
    }
  }

  // Fallback gradient when no cover
  return (
    <div
      className={`relative ${intrinsic ? "aspect-[16/9]" : "h-full w-full"} overflow-hidden`}
      style={{ background: slugToGradient(slug) }}
    >
      <GrainOverlay />
    </div>
  );
}
