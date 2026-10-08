"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { Clip } from "@/lib/clip"
import { Playback } from "@/components/ui/playback"
import { Scrims } from "@/components/ui/scrims"
import { Video } from "@/components/ui/video"

// A glass frame for media (GlassFrame), and the display made of it that is a
// door (GlassDisplay) with what plays inside it while it is looked at.
// The media fills the display to the edge and the glass is only that edge: the
// material's half-pixel rim and inner light (liquid-glass's), laid over the
// media's border, with no fill, no blur and no frame around it. A caption sits at
// the foot on the scrim (scrims); `cover` makes the whole display one target.
// The display knows when it is being looked at (the pointer over it while the
// page is still, or focus inside it), and the media reads that: DisplayPlayback
// plays any clip on the
// playhead (a terminal session, a device stage, a chat), DisplayVideo plays an
// uploaded video, both at rest otherwise. Layers, bottom to top: media, cover,
// scrim, caption, edge.

const Looked = React.createContext(false)

// Whether the page is scrolling, one listener for every display: true from a
// scroll anywhere until it has been still for SETTLE ms. A display under the
// pointer waits for it: scrolling down the index used to wake every display
// the cursor crossed, each lifting and starting its clip as it passed, and the
// scroll lost its frames rebuilding layers for them. Once the page settles,
// the one under the pointer wakes without the pointer having to move.
const SETTLE = 150
let scrolling = false
let settle: ReturnType<typeof setTimeout> | undefined
const watchers = new Set<() => void>()
const tell = () => {
  for (const w of watchers) w()
}
const onScroll = () => {
  if (!scrolling) {
    scrolling = true
    tell()
  }
  clearTimeout(settle)
  settle = setTimeout(() => {
    scrolling = false
    tell()
  }, SETTLE)
}
function subscribeScrolling(watch: () => void) {
  // The wheel too: it arrives before the scroll it causes, and the browser can
  // report the pointer entering a display in between.
  if (watchers.size === 0)
    for (const type of ["wheel", "scroll"])
      window.addEventListener(type, onScroll, { capture: true, passive: true })
  watchers.add(watch)
  return () => {
    watchers.delete(watch)
    if (watchers.size === 0)
      for (const type of ["wheel", "scroll"])
        window.removeEventListener(type, onScroll, { capture: true })
  }
}
function usePageScrolling(): boolean {
  return React.useSyncExternalStore(
    subscribeScrolling,
    () => scrolling,
    () => false,
  )
}

/** Whether the display around this is being looked at: the pointer on it, or
 *  keyboard focus inside it. False outside a display. */
export function useDisplayHover(): boolean {
  return React.useContext(Looked)
}

export type GlassDisplayProps = {
  /** The media, filling the display edge to edge: an image, a video, or any
   *  component (a terminal, a device stage). */
  children: React.ReactNode
  /** What the display says, at its foot, over the scrim. It lets the pointer
   *  through to `cover`; give anything inside it that is itself interactive
   *  `pointer-events-auto`. */
  caption?: React.ReactNode
  /** What the whole display is, laid over the media and under the scrim: a link
   *  or a button filling it (`absolute inset-0`). */
  cover?: React.ReactNode
  /** The scrim under the caption: on whenever there is a caption. */
  scrim?: boolean
  /** How far up the scrim rises, any CSS length (default 60%). */
  scrimHeight?: string
  /** The edge's brightness, a multiple of the glass default (default 1.3). It
   *  rises while the display is looked at. */
  rim?: number
  /** The corner radius, any CSS length (default 1.25rem): the box, its clip and
   *  the rim all read it, so they cannot disagree. */
  radius?: string
  className?: string
} & Omit<React.ComponentPropsWithoutRef<"div">, "children">

/** The frame alone: the media to the edge, the glass only that edge, a scrim
 *  and caption at the foot, `cover` over it. It never moves and never
 *  answers the pointer: a frame for media that is looked at in place (a hero's
 *  picture, a video with its own controls). A display that is a door, and
 *  lifts and plays while looked at, is GlassDisplay, made of this. Size it
 *  with `className` (an aspect, a grid span). */
export function GlassFrame({
  children,
  caption,
  cover,
  scrim = caption !== undefined,
  scrimHeight = "60%",
  rim = 1.3,
  radius = "1.25rem",
  className,
  style,
  ...props
}: GlassDisplayProps & { ref?: React.Ref<HTMLDivElement> }) {
  const edge = `glass-display-edge-${React.useId().replace(/:/g, "")}`
  return (
    <div
      data-slot="glass-frame"
      className={cn(
        "group/display relative rounded-(--glass-display-radius) shadow-[0_6px_16px_-10px_rgb(0_0_0/0.5)]",
        className,
      )}
      style={
        {
          "--glass-display-radius": radius,
          "--glass-display-rim": rim,
          "--glass-display-scrim": scrimHeight,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {/* The body's own fill is the page's: media with a transparent ground
          floats on the page's dark, never on a grey slab. Cut by a mask
          (tokens' clip-rounded): a playing video or stage inside used to step at
          the corners, the fill showing round it. */}
      <div className="absolute inset-0 isolate clip-rounded rounded-[inherit] bg-background">
        <div className="absolute inset-0">{children}</div>
        {cover}
        {/* The scrim is its gradient alone, no backdrop blur: Chrome clips a
            backdrop blur to rounded corners without anti-aliasing, so the
            display's foot corners stepped (Safari drew them clean). The dark
            gradient is what makes the caption read. */}
        {scrim && (
          <Scrims
            top={false}
            position="absolute"
            mode="static"
            className="[-webkit-backdrop-filter:none] [backdrop-filter:none] [--scrim-bottom-height:var(--glass-display-scrim)] [--scrim-color:black]"
          />
        )}
        {caption !== undefined && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[25]">
            {caption}
          </div>
        )}
      </div>
      {/* The edge: liquid-glass's light, drawn where it stays smooth. Its
          inner light is the material's own inset shadows. Its specular rim
          (light catching at the top-left corner, fading along the sides, a
          softer catch at the bottom-right: the material's 135° gradient,
          same stops) is an SVG stroke, the one hairline a browser always
          anti-aliases round a curve; glass draws it with a masked ring, and a
          mask steps on the corners. It lies OUTSIDE the clipped body, one
          pixel wide entirely inside the edge (inset half a pixel, its corner
          radius less the same), at half the light: clipped by the body, its
          outer half was cut by a rounded mask whenever the media inside had a
          layer of its own (a video, a playing stage), and what was left, one
          device pixel on a 2x screen, stepped round the corners; two device
          pixels give the curve room to be smoothed. Being looked at fades the
          edge up, from rim/1.55 to full. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] opacity-(--edge) transition-opacity duration-300 [--edge:calc(var(--glass-display-rim)/1.55)] group-data-[looked]/display:[--edge:1]"
      >
        <div className="absolute inset-0 rounded-[inherit] shadow-[inset_1px_2px_4px_-2px_rgb(255_255_255/0.34),inset_-1px_-2px_4px_-2px_rgb(255_255_255/0.17)]" />
        <svg aria-hidden className="absolute inset-0 size-full">
          <defs>
            <linearGradient id={edge} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="white" stopOpacity={0.2} />
              <stop offset="0.28" stopColor="white" stopOpacity={0} />
              <stop offset="0.72" stopColor="white" stopOpacity={0} />
              <stop offset="1" stopColor="white" stopOpacity={0.11} />
            </linearGradient>
          </defs>
          <rect
            fill="none"
            stroke={`url(#${edge})`}
            strokeWidth={1}
            style={{
              x: "0.5px",
              y: "0.5px",
              width: "calc(100% - 1px)",
              height: "calc(100% - 1px)",
              rx: "calc(var(--glass-display-radius) - 0.5px)",
              ry: "calc(var(--glass-display-radius) - 0.5px)",
            }}
          />
        </svg>
      </div>
    </div>
  )
}

/** A display that is a door (an index card): the frame (GlassFrame), and
 *  while it is looked at it lifts and what is inside plays. It rises 2px on a
 *  smooth ease-out (no overshoot), its shadow deepens under it and its rim
 *  light comes up, and it ends the same size it started. It is its own
 *  compositing layer (`will-change: transform`), drawn once as at rest and
 *  moved as a finished picture: redrawn at the positions between pixels a
 *  rise passes through, the hairline, the rounded clip and the scrim's blur
 *  would shimmer; a swell (a scale, edges moving out) re-draws them at every
 *  size, so it never swells. Reduced motion keeps the light and the shadow,
 *  not the rise. Never for media with controls of its own: a frame that moves
 *  under the pointer moves the control being reached for. */
export function GlassDisplay({ className, ...props }: GlassDisplayProps) {
  const [pointer, setPointer] = React.useState(false)
  const [focus, setFocus] = React.useState(false)
  const scrolling = usePageScrolling()
  const looked = (pointer && !scrolling) || focus
  const root = React.useRef<HTMLDivElement>(null)
  // A pointer resting on the display sends no enter: not when the page loads
  // under it, not when a scroll stops with it there. The browser still knows
  // where it is (`:hover` follows the cursor through layout), so the display
  // asks on arriving and each time the page settles. Only where there is a
  // hovering pointer at all: a touch screen keeps `:hover` on the last tap.
  React.useEffect(() => {
    const el = root.current
    if (!el || scrolling || !matchMedia("(hover: hover)").matches) return
    setPointer(el.matches(":hover"))
  }, [scrolling])
  return (
    <Looked.Provider value={looked}>
      <GlassFrame
        ref={root}
        data-slot="glass-display"
        data-looked={looked || undefined}
        // Where the pointer is, even while the page scrolls under it; whether
        // that counts waits for the page to settle (usePageScrolling). Touch
        // has no hover; a tap is the cover's.
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch") setPointer(true)
        }}
        onPointerLeave={() => setPointer(false)}
        onFocus={() => setFocus(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false)
        }}
        className={cn(
          "transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform data-[looked]:-translate-y-[2px] data-[looked]:shadow-[0_22px_44px_-16px_rgb(0_0_0/0.75)] motion-reduce:data-[looked]:translate-y-0",
          className,
        )}
        {...props}
      />
    </Looked.Provider>
  )
}

/** A clip on the playhead, played while its display is looked at. The one
 *  contract every display keeps (DisplayVideo too): it first stands at
 *  `rest` (ms); looked at, it plays on from the frame it stands on, round to
 *  the top at the end; looked away, it holds that frame. It never moves once
 *  the pointer has left (no running on to an end, no rewinding to rest) and
 *  never cuts. Any component that reads the playhead goes inside (a terminal
 *  session, a device stage, a chat). */
export function DisplayPlayback({
  clip,
  rest,
  className,
  children,
}: {
  clip: Clip
  rest: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <Playback
      clip={clip}
      playing={useDisplayHover()}
      start={rest}
      className={className}
    >
      {children}
    </Playback>
  )
}

/** An uploaded video on the display's contract (DisplayPlayback): played while
 *  its display is looked at, holding its frame when looked away. ui/video does
 *  the rest: the poster (the video's first frame) is a real image underneath
 *  until the video has played (Safari will not reliably paint a preload="none"
 *  video's poster, and low-power modes can refuse quiet playback), and the video
 *  fades in once frames are actually coming. `className` places the picture
 *  inside the display (object-fit, padding). */
export function DisplayVideo({
  src,
  poster,
  className,
}: {
  src: string
  poster?: string
  className?: string
}) {
  return (
    <Video
      src={src}
      poster={poster}
      optimizePoster={false}
      play="follow"
      playing={useDisplayHover()}
      muted
      loop
      preload="none"
      label=""
      aria-hidden
      className="absolute inset-0"
      videoClassName={className}
    />
  )
}
