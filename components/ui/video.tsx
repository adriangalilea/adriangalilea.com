"use client";

// The one video element. Every `<video>` the registry draws is this one, so the three
// questions every video answers are answered once:
//
//   WHEN IT PLAYS: `play`.
//     "manual"  the person decides (the browser's bar with `controls`, or a player
//               around it). The default.
//     "hover"   while the pointer or focus is on it (or on `interactionRef`, the card
//               it belongs to); on touch, while it is on screen.
//     "visible" while it is on screen.
//     "once"    on arriving on screen, then again only on a fresh hover or focus.
//     "follow"  the page decides: `playing` says whether, and `at` (ms), when given,
//               the instant it must show (a stage whose clock moves the video). It is
//               held unseen until it shows that instant, the poster standing in.
//     Automatic plays ("hover", "visible", "once") are muted, wait out reduced motion
//     and a hidden tab, and a pause from `pauseButton` survives them.
//   WHAT STANDS IN BEFORE ITS FIRST FRAME: the poster, at the frame's aspect when
//     `width` and `height` are given (the space is reserved), the video fading in once
//     frames arrive. Without them the frame fills a parent the caller sizes.
//   WHAT IT SHOWS WHEN IT STOPS: `rest`. "hold" stays on the frame it reached; "poster"
//     goes back to the start and the poster.
//
// And what every video owes the page: one plays with sound at a time (a second one
// starting with sound pauses the first), and it releases its media when it leaves
// (pause, drop the source, reload empty), because a detached element that was
// playing keeps its sound by the spec's own rule. The source is set by an effect, not
// by the attribute, so a remount (React's dev double mount) puts back what the
// release took.

import {
  type ComponentProps,
  type RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Image, Img } from "@/components/ui/image";
import { useMediaIntent } from "@/components/ui/image-intent";
import { cn } from "@/lib/utils";

export type VideoPlay = "manual" | "hover" | "visible" | "once" | "follow";

export type VideoProps = Omit<
  ComponentProps<"video">,
  "width" | "height" | "className" | "autoPlay" | "src" | "controls" | "poster"
> & {
  src: string;
  /** The accessible name. */
  label: string;
  /** When it plays (see the header). Default "manual". */
  play?: VideoPlay;
  /** "follow": whether the page wants it playing. */
  playing?: boolean;
  /** "follow": the instant it must show, ms. */
  at?: number;
  /** What it shows when it stops: the frame it reached, or the poster. Default "hold". */
  rest?: "hold" | "poster";
  /** Where it starts, ms. */
  start?: number;
  /** The browser's own bar. Default on for "manual". */
  controls?: boolean;
  /** A small play/pause button over an automatic play: the person can always stop it. */
  pauseButton?: boolean;
  /** The frame's intrinsic size: the space is reserved at its aspect before it loads. */
  width?: number;
  height?: number;
  poster?: string;
  blurDataURL?: string;
  /** Responsive poster width, using the same sizes syntax as Image. */
  sizes?: string;
  /** Pass the poster through Next's optimizer (default). False for any-origin posters
   *  the optimizer is not configured for (a CDN frame, an avatar). */
  optimizePoster?: boolean;
  /** How an unoptimized poster arrives: "fade" in once decoded (the registry's
   *  picture arrival), or "instant", in the first paint (a still that must stand
   *  for the video from the server's HTML on, like a stage resting mid-clip). */
  posterArrival?: "fade" | "instant";
  className?: string;
  videoClassName?: string;
  /** The element whose hover and focus count as looking at this video (its card). */
  interactionRef?: RefObject<HTMLElement | null>;
};

/** How far the video may be from `at` and still be showing it, ms. */
const FOLLOW_TOLERANCE = 150;

const audible = new Set<HTMLVideoElement>();
/** One video plays with sound at a time: the one that starts silences the rest. */
function claimSound(video: HTMLVideoElement) {
  for (const other of audible) if (other !== video) other.pause();
  audible.clear();
  audible.add(video);
}

/** A refused or interrupted play is the next decision, not an error: a pause landing
 *  while play() is pending rejects it (AbortError), a low-power mode refuses quiet
 *  playback (NotAllowedError). Anything else is real and throws. */
function tolerate(error: unknown) {
  const expected =
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "NotAllowedError");
  if (!expected) throw error;
}

/** Stops a video the way `rest` says. True when it went back to the poster. */
function stopAt(el: HTMLVideoElement, rest: "hold" | "poster"): boolean {
  el.pause();
  if (rest !== "poster" || el.readyState === 0 || el.ended) return false;
  el.currentTime = 0;
  return true;
}

export function Video({ src, ...props }: VideoProps) {
  return <VideoSource key={src} src={src} {...props} />;
}

function VideoSource({
  src,
  label,
  play = "manual",
  playing: wanted,
  at,
  rest = "hold",
  start,
  controls = play === "manual",
  pauseButton = false,
  width,
  height,
  poster,
  blurDataURL,
  sizes = "100vw",
  optimizePoster = true,
  posterArrival = "fade",
  className,
  videoClassName,
  interactionRef,
  children,
  onPlaying,
  onPause,
  onEnded,
  onError,
  ref,
  ...props
}: VideoProps) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => video.current as HTMLVideoElement, []);
  const automatic = play === "hover" || play === "visible" || play === "once";
  const follows = play === "follow";
  if (follows && wanted === undefined)
    throw new Error(`Video "${label}": play="follow" needs \`playing\``);
  const intent = useMediaIntent(frame, interactionRef);
  const { setManual } = intent;
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  // A frame has been shown: from then on, "hold" keeps the video over the poster.
  const [shown, setShown] = useState(false);
  // The video knows its size (the empty frame's ground can go), and has decoded a
  // frame (the poster can go, unless the video is held unseen).
  const [sized, setSized] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // "follow" with `at`: the video has shown an instant asked of it.
  const [onInstant, setOnInstant] = useState(false);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  // What the automatic plays want right now.
  const autoWants = useRef(false);

  // The source is the effect's to set and to release (see the header).
  useEffect(() => {
    const el = video.current;
    if (!el) throw new Error(`Video "${label}" rendered no element`);
    el.src = src;
    return () => {
      audible.delete(el);
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [src, label]);

  // Automatic plays: hover, visible, once.
  const trigger =
    play === "once"
      ? completedAt === null
        ? "visible"
        : "intent"
      : play === "visible"
        ? "visible"
        : "intent";
  const autoPlay =
    automatic &&
    intent.active(trigger) &&
    (completedAt === null || intent.activation > completedAt);
  useEffect(() => {
    if (!automatic) return;
    const el = video.current;
    if (!el) return;
    autoWants.current = autoPlay;
    if (autoPlay) {
      setFailed(false);
      el.play().catch((e: unknown) => {
        tolerate(e);
        if (e instanceof DOMException && e.name === "NotAllowedError") {
          setFailed(true);
          setManual(false);
        }
      });
    } else if (stopAt(el, rest)) setShown(false);
    return () => {
      autoWants.current = false;
    };
  }, [automatic, autoPlay, setManual, rest]);

  // The page's word: play, hold, and (with `at`) the instant to show.
  useEffect(() => {
    if (!follows) return;
    const el = video.current;
    if (!el) return;
    if (at !== undefined) {
      const ms = el.currentTime * 1000;
      // Once it has shown an asked instant it stays seen while it seeks to the
      // next: the poster is one still, and flashing it back mid-scrub would show
      // the wrong picture.
      if (Math.abs(ms - at) > FOLLOW_TOLERANCE) el.currentTime = at / 1000;
      else if (el.readyState >= 2) setOnInstant(true);
    }
    if (wanted && el.paused) el.play().catch(tolerate);
    if (!wanted && !el.paused && stopAt(el, rest)) setShown(false);
  });

  const onFrameCheck = () => {
    const el = video.current;
    if (!el || at === undefined) return;
    if (
      el.readyState >= 2 &&
      Math.abs(el.currentTime * 1000 - at) <= FOLLOW_TOLERANCE
    )
      setOnInstant(true);
  };

  // Unseen until it can honestly stand for the picture: automatic plays until frames
  // come (and again at rest under "poster"), a followed instant until it shows it.
  const hidden =
    follows && at !== undefined
      ? !onInstant
      : (automatic || follows) && !playing && !shown;

  return (
    <div
      ref={frame}
      data-slot="video"
      data-playing={playing}
      // Nothing stays under a painted video: whatever does shows through its
      // anti-aliased rounded edge as a light, stepped rim. The ground is for an empty
      // frame with no poster, until the video knows its size; the poster (below)
      // only while it stands in.
      className={cn(
        "not-prose relative isolate block max-w-full overflow-hidden",
        width && height ? "aspect-(--video-aspect)" : "size-full",
        width && height && !poster && !sized && "bg-foreground/4",
        className,
      )}
      style={
        width && height
          ? ({
              "--video-aspect": `${width} / ${height}`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {poster &&
        (hidden || !loaded) &&
        (optimizePoster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes={sizes}
            blurDataURL={blurDataURL}
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            imageClassName={cn(
              "rounded-[inherit] object-cover",
              videoClassName,
            )}
          />
        ) : posterArrival === "fade" ? (
          <Img
            src={poster}
            alt=""
            className={cn(
              "pointer-events-none absolute inset-0 size-full rounded-[inherit] object-cover",
              videoClassName,
            )}
          />
        ) : (
          // biome-ignore lint/performance/noImgElement: a still that must be in the first paint, any origin
          <img
            src={poster}
            alt=""
            className={cn(
              "pointer-events-none absolute inset-0 size-full rounded-[inherit] object-cover",
              videoClassName,
            )}
          />
        ))}
      <video
        {...props}
        ref={video}
        width={width}
        height={height}
        aria-label={label}
        playsInline
        // Focus is how a keyboard asks a hover or once video to play; a video that
        // plays on sight alone takes no stop in the tab order.
        tabIndex={play === "hover" || play === "once" ? 0 : undefined}
        muted={automatic || props.muted}
        controls={controls}
        loop={
          play === "once"
            ? completedAt !== null && autoPlay && props.loop
            : props.loop
        }
        preload={props.preload ?? (automatic ? "none" : "metadata")}
        // Rounded on its own layer: Chrome clips a composited video to a parent's
        // rounded corners without anti-aliasing (a stepped corner), and rounds an
        // element's own corners smoothly.
        className={cn(
          "relative block size-full rounded-[inherit] object-cover transition-[opacity,filter] duration-300 ease-out motion-reduce:transition-none",
          // Only where scripts run: without them nothing would ever reveal it.
          hidden &&
            "[@media(scripting:enabled)]:opacity-0 motion-safe:[@media(scripting:enabled)]:blur-sm",
          videoClassName,
        )}
        onLoadedMetadata={(e) => {
          setSized(true);
          if (start !== undefined) e.currentTarget.currentTime = start / 1000;
          props.onLoadedMetadata?.(e);
        }}
        onLoadedData={(e) => {
          setLoaded(true);
          onFrameCheck();
          props.onLoadedData?.(e);
        }}
        onSeeked={(e) => {
          onFrameCheck();
          props.onSeeked?.(e);
        }}
        onPlaying={(e) => {
          const el = e.currentTarget;
          if (automatic && !autoWants.current) {
            el.pause();
            return;
          }
          if (!el.muted) claimSound(el);
          setPlaying(true);
          setShown(true);
          onPlaying?.(e);
        }}
        onPause={(e) => {
          setPlaying(false);
          onPause?.(e);
        }}
        onEnded={(e) => {
          setPlaying(false);
          if (play === "once") setCompletedAt(intent.activation);
          onEnded?.(e);
        }}
        onError={(e) => {
          setFailed(true);
          setPlaying(false);
          onError?.(e);
        }}
      >
        {children}
      </video>
      {automatic && pauseButton && (
        <button
          type="button"
          data-slot="video-pause"
          aria-label={`${playing ? "Pause" : "Play"} ${label}`}
          aria-pressed={playing}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!playing) setCompletedAt(null);
            setManual(!playing);
          }}
          className="absolute right-2 bottom-2 rounded-full bg-black/60 px-3 py-2 text-white text-xs"
        >
          {failed ? "retry" : playing ? "pause" : "play"}
        </button>
      )}
    </div>
  );
}
