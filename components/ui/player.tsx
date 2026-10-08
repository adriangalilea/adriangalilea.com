"use client"

// The controls for a timebase (lib/timebase), whoever owns it: a clip's own clock
// (ui/playback) or a video's decoder (ui/video). `PlayerBar` is the timeline: thick,
// cut into the chapters, the played part in the accent; hovering it shows that exact
// moment (the timebase holds while it previews, the chapter and the time above the
// pointer) and leaving returns to where it was; a click or a drag commits and plays
// from there; under the keyboard it is a slider. `Player` is the preset for drawn
// content: `<Player clip={clip}><Terminal session={s} /></Player>` is a Playback with
// the bar under the content, a click on the content plays and pauses, a horizontal
// swipe scrubs. Keys on the bar: space plays and pauses, ← and → move between
// chapters, Home and End go to the ends. Reduced motion starts paused on the last
// frame.

import { Menu } from "@base-ui/react/menu"
import { Popover } from "@base-ui/react/popover"
import { Slider } from "@base-ui/react/slider"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Clip,
  type Division,
  divisionSpans,
  type Level,
  outlineOf,
} from "@/lib/clip"
import { visibleRect } from "@/lib/picture-zoom"
import {
  createSwipe,
  type PlayerAction,
  resolveKey,
  type SwipeEffect,
} from "@/lib/player-input"
import {
  clockTime,
  type TimeForm,
  timeLabel,
  widest,
} from "@/lib/timebase"
import { Img } from "@/components/ui/image"
import { Kbd, KeysText } from "@/components/ui/kbd"
import {
  OutlineProvider,
  PLAYER_FLASH,
  type PlaybackOptions,
  type Playlist,
  type PlaylistEntry,
  TimebaseProvider,
  toggleFullscreen,
  useOutline,
  usePictureZoom,
  usePictureZoomState,
  usePlayback,
  usePlayerLayer,
  usePlaylist,
  useTimebase,
  useTimebaseState,
} from "@/components/ui/playback"
import { Tip } from "@/components/ui/tooltip"

/** What a click on the elapsed side will show next. */
const FORM_NEXT: Record<TimeForm, string> = {
  clock: "show the clock",
  frame: "show the frame",
  timecode: "show the timecode",
}

/** A mouse press on a player's controls leaves focus where it was, as players do: a
 *  clicked control holding focus made the page-wide keys answer to it instead (← → on
 *  a clicked bar moved chapters, not frames), and the next key press showed the focus
 *  ring on it, since a key with focus somewhere is the browser's cue that a keyboard
 *  is in use. The keyboard still reaches every control with Tab, ringed as it should
 *  be. Put on the controls' containers (PlayerBar, PlayerChrome), it covers every
 *  control inside, the ones added later too; a portaled popup (the speed menu) is not
 *  inside in the DOM, so it keeps managing its own focus. */
export function keepFocus(e: React.MouseEvent) {
  if (e.button === 0 && e.currentTarget.contains(e.target as Node))
    e.preventDefault()
}

/** How long the pointer must stay on the bar, moving slowly, before hovering previews:
 *  long enough that a hand crossing it on the way elsewhere never scrubs, short enough
 *  that a hand meaning it does not wait. */
const INTENT_MS = 120
/** Faster than this the pointer is passing by, not looking (px per ms). */
const SLOW_PX_PER_MS = 0.6
/** After the page scrolls, how long the pointer is still not a hover: a scroll slides
 *  the bar under a still pointer, which chose nothing. */
const SCROLL_QUIET_MS = 200

let lastScroll = 0
let scrollWatchers = 0
const onScroll = () => {
  lastScroll = performance.now()
}
/** One passive listener for every bar, counted so the last bar to leave removes it. */
function watchScroll() {
  if (scrollWatchers++ === 0)
    window.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    })
  return () => {
    if (--scrollWatchers === 0)
      window.removeEventListener("scroll", onScroll, { capture: true })
  }
}

/** The gap between two chapters on the bar, px. */
const GAP = 3
/** How close the pointer must come to a chapter's start to be pulled onto it, px. */
const SNAP_PX = 10

/** A division's title as its kind reads: a command in mono, as typed; words with
 *  their shortcuts drawn as keys. */
function ChapterTitle({ chapter }: { chapter: Division | undefined }) {
  if (!chapter?.title) return null
  return chapter.code ? (
    <code className="font-mono">{chapter.title}</code>
  ) : (
    <KeysText>{chapter.title}</KeysText>
  )
}

export interface PlayerBarProps {
  /** Accessible name of the timeline. */
  label: string
  /** The played part of the bar. By default a quiet foreground: the bar is a
   *  control, and a page's accent belongs to what it wants seen first. */
  accent?: string
  /** Where the chapter is named. `"line"`: the chapter on screen, on a line under
   *  the bar. `"hover"`: only under the pointer, for content that captions itself
   *  (a scene's captions) or a page that wants nothing but the picture. */
  chapters?: "line" | "hover"
  /** Things on the row beside the bar, after the time (a sound or speed control). */
  children?: React.ReactNode
  /** The play button at the bar's start. Off where a PlayerTransport already has one,
   *  so a picture never shows two. Default true. */
  playButton?: boolean
  /** How the elapsed time first reads: `clock` (`0:02`, default), `frame` (`54 ·
   *  0:02`) or `timecode` (`00:00:02:04`); a click moves through them. The last two
   *  only where the timebase knows its frames. */
  time?: TimeForm
  className?: string
}

/** The play button, the timeline and the time, over the timebase around it. */
export function PlayerBar({
  label,
  accent,
  chapters = "line",
  children,
  playButton = true,
  time = "clock",
  className,
}: PlayerBarProps) {
  const timebase = useTimebase()
  const { controls } = timebase
  const at = useTimebaseState((s) => s.at)
  const preview = useTimebaseState((s) => s.preview)
  const duration = useTimebaseState((s) => s.duration)
  const playing = useTimebaseState((s) => s.playing)
  // The bar divides by the outline's first level (chapters). Finer levels show when
  // the view zooms into a division (TimeAxis, to come).
  const level = useOutline()[0] as Level
  const spans = React.useMemo(
    () => divisionSpans(level, Math.max(1, duration)),
    [duration, level],
  )
  const [snapped, setSnapped] = React.useState(false)
  // The right-hand clock shows the length, or what is left of it.
  const [remaining, setRemaining] = React.useState(false)
  // How finely the elapsed side reads; frames only where the timebase knows them.
  const fps = useTimebaseState((s) => s.fps)
  const forms: TimeForm[] = fps ? ["clock", "frame", "timecode"] : ["clock"]
  const [chosen, setForm] = React.useState<TimeForm>(time)
  const form = forms.includes(chosen) ? chosen : "clock"
  const nextForm = forms[(forms.indexOf(form) + 1) % forms.length] as TimeForm
  const keysOn = useKeysListening()
  const track = React.useRef<HTMLDivElement>(null)
  const dragging = React.useRef(false)

  // Where a pointer points on the bar, pulled to a chapter's start when it is close
  // enough that the hand meant it (measured on the bar, in px).
  const pointAt = (clientX: number): { ms: number; snapped: boolean } => {
    const r = track.current?.getBoundingClientRect()
    if (!r || !duration) return { ms: 0, snapped: false }
    const ms = Math.min(
      duration,
      Math.max(0, ((clientX - r.left) / r.width) * duration),
    )
    const reach = (SNAP_PX / r.width) * duration
    const near = spans
      .map((c) => c.start)
      .filter((s) => s > 0 && Math.abs(s - ms) <= reach)
      .sort((a, b) => Math.abs(a - ms) - Math.abs(b - ms))[0]
    return near === undefined
      ? { ms, snapped: false }
      : { ms: near, snapped: true }
  }
  const show = (clientX: number) => {
    const p = pointAt(clientX)
    setSnapped(p.snapped)
    controls.preview(p.ms)
  }

  // Hovering previews only with intent (see `INTENT_MS`): a pointer passing over on its
  // way somewhere, or the page scrolling the bar under a still pointer, never scrubs.
  const intent = React.useRef({
    engaged: false,
    timer: 0,
    x: 0,
    t: 0,
  })
  React.useEffect(() => watchScroll(), [])
  React.useEffect(() => () => window.clearTimeout(intent.current.timer), [])
  const hover = (e: React.PointerEvent) => {
    const i = intent.current
    if (i.engaged) return show(e.clientX)
    const now = performance.now()
    const speed = i.t ? Math.abs(e.clientX - i.x) / Math.max(1, now - i.t) : 0
    i.x = e.clientX
    i.t = now
    if (now - lastScroll < SCROLL_QUIET_MS || speed > SLOW_PX_PER_MS) {
      window.clearTimeout(i.timer)
      i.timer = 0
      return
    }
    if (i.timer) return
    i.timer = window.setTimeout(() => {
      i.timer = 0
      i.engaged = true
      show(i.x)
    }, INTENT_MS)
  }
  const leave = () => {
    const i = intent.current
    window.clearTimeout(i.timer)
    const was = i.engaged
    intent.current = { engaged: false, timer: 0, x: 0, t: 0 }
    if (was) controls.endPreview()
  }

  const chapterAt = (ms: number) =>
    spans.findLast((c) => ms >= c.start) ?? spans[0]
  const ended = duration > 0 && at >= duration
  const onKey = (e: React.KeyboardEvent) => {
    const here = spans.findLastIndex((c) => at >= c.start)
    const map: Record<string, () => void> = {
      " ": controls.toggle,
      k: controls.toggle,
      ArrowRight: () => controls.seek(spans[here + 1]?.start ?? duration),
      // Back to this chapter's start, or the one before when already there.
      ArrowLeft: () =>
        controls.seek(
          at - (spans[here]?.start ?? 0) > 1500
            ? (spans[here]?.start ?? 0)
            : (spans[here - 1]?.start ?? 0),
        ),
      Home: () => controls.seek(0),
      End: () => controls.seek(duration),
    }
    const act = map[e.key]
    if (!act) return
    e.preventDefault()
    act()
  }

  const shown = preview ?? at
  const hovered = preview === null ? null : chapterAt(preview)

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: only keeps a mouse press from taking focus; the controls inside are the interactive ones
    <div
      data-slot="player-bar"
      onMouseDown={keepFocus}
      className={className}
      style={
        {
          "--player-accent":
            accent ?? "color-mix(in oklab, var(--foreground) 55%, transparent)",
        } as React.CSSProperties
      }
    >
      <div className="flex select-none items-center gap-3">
        {/* Pulled out by the space its circle leaves around the icon,
            (2rem - 0.875rem) / 2, so the icon's ink, not its hit area, starts
            on the stage's edge, where the caption below starts too. */}
        {playButton && (
          <Tip
            content={ended ? "replay" : playing ? "pause" : "play"}
            keys={keysOn ? "space" : undefined}
          >
            <button
              type="button"
              data-slot="player-play"
              onClick={controls.toggle}
              aria-label={ended ? "replay" : playing ? "pause" : "play"}
              className="-ml-[calc((2rem-0.875rem)/2)] grid size-8 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/8 hover:text-foreground [&_svg]:size-3.5"
            >
              {ended ? (
                <PlayerIcon.replay />
              ) : playing ? (
                <PlayerIcon.pause />
              ) : (
                <PlayerIcon.play />
              )}
            </button>
          </Tip>
        )}
        {/* Elapsed on the bar's left, the length on its right: each end of the bar
            says what it stands for. A click on the elapsed side changes how finely
            it reads (the clock; the frame beside it; the editors' timecode), each in
            the width of its own widest, so the bar holds still while it counts. */}
        <Tip content={FORM_NEXT[nextForm]}>
          <button
            type="button"
            data-slot="player-elapsed"
            aria-label={FORM_NEXT[nextForm]}
            disabled={forms.length < 2}
            onClick={() => setForm(nextForm)}
            className="shrink-0 cursor-pointer rounded-sm font-mono text-[11px] text-muted-foreground transition-colors enabled:hover:text-foreground disabled:cursor-default"
          >
            <PlayerReadout
              value={timeLabel(shown, form, fps)}
              widest={widest(timeLabel(duration, form, fps))}
            />
          </button>
        </Tip>
        <div
          ref={track}
          data-slot="player-track"
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(at)}
          aria-valuetext={`${clockTime(at)} of ${clockTime(duration)}${
            chapterAt(at)?.title ? `, ${chapterAt(at)?.title}` : ""
          }`}
          onKeyDown={onKey}
          // No ring around the bar: under the keyboard the bar itself answers,
          // lifted as under the pointer, the chapter you are in lit, so focus
          // reads as the control waking rather than a box drawn round it.
          className="group relative h-7 flex-1 cursor-pointer touch-none outline-none"
          onPointerMove={hover}
          onPointerLeave={() => {
            if (dragging.current) return
            setSnapped(false)
            leave()
          }}
          // A press is intent whatever came before it.
          onPointerDown={(e) => {
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            window.clearTimeout(intent.current.timer)
            intent.current.engaged = true
            show(e.clientX)
          }}
          // Letting go is an intent to watch there: it plays from where it is let go.
          onPointerUp={(e) => {
            dragging.current = false
            setSnapped(false)
            controls.seek(pointAt(e.clientX).ms, { play: true })
          }}
        >
          {spans.map((c) => {
            const from = c.start / Math.max(1, duration)
            const width = (c.end - c.start) / Math.max(1, duration)
            const fill = (to: number) =>
              Math.min(1, Math.max(0, (to - c.start) / (c.end - c.start)))
            const lit = hovered === c
            const here = preview === null && chapterAt(at) === c
            return (
              <div
                key={c.start}
                className={cn(
                  "absolute top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full transition-[height,background-color] duration-150 group-hover:h-2.5 group-focus-visible:h-2.5",
                  lit ? "bg-foreground/25" : "bg-foreground/12",
                  here && "group-focus-visible:bg-foreground/25",
                )}
                style={{
                  left: `${from * 100}%`,
                  width: `calc(${width * 100}% - ${spans.length > 1 ? GAP : 0}px)`,
                }}
              >
                {preview !== null && (
                  <div
                    className="absolute inset-y-0 left-0 bg-foreground/15"
                    style={{ width: `${fill(preview) * 100}%` }}
                  />
                )}
                <div
                  className="absolute inset-y-0 left-0 bg-[var(--player-accent)]"
                  style={{ width: `${fill(at) * 100}%` }}
                />
              </div>
            )
          })}
          {/* Pulled onto a chapter's start: a marker stands at the boundary. */}
          {preview !== null && snapped && (
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
              style={{ left: `${(preview / duration) * 100}%` }}
            />
          )}
          {preview !== null && (
            <div
              className="pointer-events-none absolute bottom-full mb-1.5 flex -translate-x-1/2 flex-col items-center gap-0.5 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-popover-foreground text-xs shadow-md"
              style={{
                left: `clamp(4rem, ${(preview / duration) * 100}%, calc(100% - 4rem))`,
              }}
            >
              {hovered?.title && (
                <span
                  className={
                    snapped ? "font-medium" : "text-popover-foreground/70"
                  }
                >
                  <ChapterTitle chapter={hovered} />
                </span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {snapped
                  ? `chapter start · ${clockTime(preview)}`
                  : clockTime(preview)}
              </span>
            </div>
          )}
        </div>
        {/* The length, or on a click what is left of it: both in the same reserved
            width, so the switch never moves the bar. What is left rounds up, so
            elapsed and left always add up to the length. */}
        <Tip content={remaining ? "show the length" : "show the time left"}>
          <button
            type="button"
            data-slot="player-duration"
            aria-label={remaining ? "show the length" : "show the time left"}
            onClick={() => setRemaining((r) => !r)}
            className="shrink-0 cursor-pointer rounded-sm font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <PlayerReadout
              value={
                remaining
                  ? `-${clockTime(Math.ceil(Math.max(0, duration - shown) / 1000) * 1000)}`
                  : clockTime(duration)
              }
              widest={`-${widest(clockTime(duration))}`}
            />
          </button>
        </Tip>
        {children}
      </div>
      {/* The chapter on screen, on its own line under the bar, aligned with it: its
          width changes with every chapter, and beside the bar it resized the bar
          under the pointer. The line is reserved, so no chapter moves the page. */}
      {chapters === "line" && (
        <p
          data-slot="player-chapter"
          aria-hidden="true"
          className="mt-1 truncate pl-[calc(2.75rem-(2rem-0.875rem)/2)] text-muted-foreground text-xs leading-5"
        >
          <ChapterTitle chapter={chapterAt(shown)} />
          &#8203;
        </p>
      )}
    </div>
  )
}

export interface PlayerProps extends PlaybackOptions {
  /** The content: components on the clip contract read the moment from the player. */
  children: React.ReactNode
  /** What it plays: its length and its chapters. */
  clip: Clip
  /** Accessible name of the player. */
  label: string
  accent?: string
  chapters?: "line" | "hover"
  className?: string
}

/** Drawn content with its bar: a Playback, the content, and PlayerBar under it. */
export function Player({
  children,
  clip,
  label,
  accent,
  chapters = "line",
  className,
  ...options
}: PlayerProps) {
  const { root, timebase } = usePlayback(clip, options)
  const outline = React.useMemo(() => outlineOf(clip), [clip])

  // A horizontal swipe scrubs; a vertical one stays the page's.
  React.useEffect(() => {
    const el = root.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      const width = el.getBoundingClientRect().width || 1
      timebase.controls.jump((e.deltaX / width) * timebase.get().duration)
    }
    el.addEventListener("wheel", wheel, { passive: false })
    return () => el.removeEventListener("wheel", wheel)
  }, [root, timebase])

  return (
    <div ref={root} data-slot="player" className={className}>
      <TimebaseProvider timebase={timebase}>
        <OutlineProvider outline={outline}>
          {/* A click anywhere on the content plays and pauses, as on a video; a control
            inside the content (a reaction pill) keeps its own click. The bar's button
            is the keyboard's way. */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: the bar's button is the accessible control */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: space and k toggle on the bar */}
          <div
            data-slot="player-content"
            onClick={(e) => {
              if (
                (e.target as Element).closest(
                  "button, a, input, select, textarea, [role=button], [role=slider]",
                )
              )
                return
              timebase.controls.toggle()
            }}
          >
            {children}
          </div>
          {/* --player-gap: the stage-to-controls gap, for a page that spaces its
            parts by its own step (default 1rem). */}
          <PlayerBar
            label={label}
            accent={accent}
            chapters={chapters}
            className="mt-(--player-gap,1rem)"
          />
        </OutlineProvider>
      </TimebaseProvider>
    </div>
  )
}

// ── the rest of a player: each a part over the timebase around it, shown only when
// the timebase can do what it controls ─────────────────────────────────────────────

const READOUT = "font-mono text-[11px] text-muted-foreground tabular-nums"
const BUTTON =
  "inline-flex h-7 shrink-0 cursor-pointer items-center justify-center rounded-md px-1.5 text-foreground/70 transition-colors hover:bg-foreground/8 hover:text-foreground"

/** A number that changes, at a width that never does: the value drawn over an
 *  invisible copy of the widest it can ever be (`widest`), right-aligned, in tabular
 *  figures. Every counting readout in a player goes through here, so a clock ticking
 *  from 9 to 10 or a frame number from 99 to 100 can never move the row it sits in. */
export function PlayerReadout({
  value,
  widest: wide,
  align = "end",
  className,
}: {
  value: string
  /** The widest value this readout will show, in its own shape (lib/timebase
   *  `widest`). */
  widest: string
  /** Where the value sits in its reserved width: `end` for a number that counts (its
   *  last digit never moves), `center` for a label inside a button (a speed). */
  align?: "end" | "center"
  className?: string
}) {
  return (
    <span className={cn("inline-grid tabular-nums", className)}>
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {wide.length >= value.length ? wide : widest(value)}
      </span>
      <span
        className={cn(
          "col-start-1 row-start-1",
          align === "end" ? "text-right" : "text-center",
        )}
      >
        {value}
      </span>
    </span>
  )
}

// ── the curated controls. Each is logic once (a hook over the timebase) and a face:
// the plain faces here, their glass counterparts in liquid-glass's glass-player, both
// drawing the same icons. ─────────────────────────────────────────────────────────

/** The player's icons, drawn once for every face, plain and glass. 16-unit boxes, the
 *  ink `currentColor`, sized by the button that holds them. */
export const PlayerIcon = {
  playlist: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2.5 4h7M2.5 8h7M2.5 12h4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M11 9.5v5l3.8-2.5z" fill="currentColor" />
    </svg>
  ),
  play: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 2.8 13 8l-8.5 5.2z" fill="currentColor" />
    </svg>
  ),
  pause: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 3h2.6v10H4zM9.4 3H12v10H9.4z" fill="currentColor" />
    </svg>
  ),
  replay: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v2.6h2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  previous: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 3h1.8v10H3.5zM13 3v10L6 8z" fill="currentColor" />
    </svg>
  ),
  next: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10.7 3h1.8v10h-1.8zM3 3v10l7-5z" fill="currentColor" />
    </svg>
  ),
  /** A circular arrow round the seconds it jumps: back (counter-clockwise) or forward. */
  jump: ({ seconds, back }: { seconds: number; back: boolean }) => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <g transform={back ? undefined : "translate(16 0) scale(-1 1)"}>
        <path
          d="M5.2 3.1A6 6 0 1 1 2.3 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M5.9 0.9 5.2 3.1l2.3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <text
        x="8"
        y="10.6"
        textAnchor="middle"
        fontSize="6.4"
        fontWeight="600"
        fill="currentColor"
        fontFamily="ui-sans-serif, system-ui"
      >
        {seconds}
      </text>
    </svg>
  ),
  /** The speaker, its waves the loudness: none (muted or 0), one, two. */
  sound: ({ level }: { level: 0 | 1 | 2 }) => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 6h2.5L8.5 3v10L5 10H2.5z" fill="currentColor" />
      {level === 0 ? (
        <path
          d="M11 6l3.5 4M14.5 6L11 10"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={
            level === 1
              ? "M11 5.5a3.5 3.5 0 0 1 0 5"
              : "M11 5.5a3.5 3.5 0 0 1 0 5M12.6 3.8a6 6 0 0 1 0 8.4"
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      )}
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

/** How far into an item or a division "previous" goes back to its start rather than to
 *  the one before, ms: a person a few seconds in means "again", at the start "before". */
const RESTART_MS = 1500

/** Play, pause, the jumps and the neighbours, as the transport faces use them. The
 *  neighbours are the playlist's items when there is a playlist (`unit` "item"), else
 *  the outline's divisions (`unit` "chapter"); `previous`/`next` are null where there
 *  is none to go to. */
export function useTransport() {
  const { controls } = useTimebase()
  const playing = useTimebaseState((s) => s.playing)
  const at = useTimebaseState((s) => s.at)
  const duration = useTimebaseState((s) => s.duration)
  const level = useOutline()[0] as Level
  const playlist = usePlaylist()
  return {
    playing,
    ended: duration > 0 && at >= duration,
    toggle: controls.toggle,
    jump: controls.jump,
    ...neighbours(at, duration, level, playlist, controls.seek),
  }
}

/** Where previous and next go from `at`: the playlist's items when it has more than one
 *  (`unit` "item"), else the level's divisions (`unit` "chapter"). Previous goes back to
 *  the start of the one it is in, or to the one before when already there. Null where
 *  there is none. */
function neighbours(
  at: number,
  duration: number,
  level: Level,
  playlist: Playlist | null,
  seek: (ms: number) => void,
): {
  unit: "item" | "chapter"
  previous: (() => void) | null
  next: (() => void) | null
} {
  if (playlist && playlist.items.length > 1) {
    const before = playlist.previous
    return {
      unit: "item",
      previous: () => (at > RESTART_MS || !before ? seek(0) : before()),
      next: playlist.next,
    }
  }
  const spans = divisionSpans(level, Math.max(1, duration))
  if (spans.length < 2) return { unit: "chapter", previous: null, next: null }
  const here = spans.findLastIndex((d) => at >= d.start)
  const start = spans[here]?.start ?? 0
  return {
    unit: "chapter",
    previous: () =>
      seek(at - start > RESTART_MS ? start : (spans[here - 1]?.start ?? 0)),
    next: () => seek(spans[here + 1]?.start ?? duration),
  }
}

/** The speeds a person picks from, slow to fast. */
export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const

/** The speed and the way to set it; null where speed cannot change. */
export function useSpeed(): {
  rate: number
  set: (rate: number) => void
} | null {
  const { controls } = useTimebase()
  const rate = useTimebaseState((s) => s.rate)
  return controls.setRate ? { rate, set: controls.setRate } : null
}

/** Speed as a person reads it: `1×`, `1.5×`, `0.25×`. */
export const speedLabel = (rate: number) => `${Math.round(rate * 100) / 100}×`

/** The widest a speed label gets: two decimals (`0.25×`, or a swiped `2.65×`). */
export const WIDEST_SPEED = "0.00×"

/** The sound and the ways to change it; null where there is no sound. */
export function useSound(): {
  volume: number
  muted: boolean
  level: 0 | 1 | 2
  setVolume: (volume: number) => void
  toggleMute: () => void
} | null {
  const { controls } = useTimebase()
  const volume = useTimebaseState((s) => s.volume)
  const muted = useTimebaseState((s) => s.muted)
  if (volume === null || !controls.setVolume || !controls.toggleMute)
    return null
  return {
    volume,
    muted,
    level: muted || volume === 0 ? 0 : volume < 0.5 ? 1 : 2,
    setVolume: controls.setVolume,
    toggleMute: controls.toggleMute,
  }
}

/** A round icon button over a picture, the plain face: a dark disc, light ink. */
const DISC =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white transition-[background-color,scale] duration-150 hover:bg-black/60 active:scale-95 motion-reduce:active:scale-100 [&_svg]:pointer-events-none"

/** The transport over the middle of the picture: the outline's previous and next
 *  divisions (when it has more than one), a jump back and forward, and play and pause
 *  in the middle, larger. Place it in PlayerChrome so it shows and hides with it. */
export function PlayerTransport({
  jump = 10_000,
  className,
}: {
  /** ms the circular arrows jump. */
  jump?: number
  className?: string
}) {
  const buttons = useTransportButtons(jump)
  const size = {
    sm: "size-8 [&_svg]:size-3.5",
    md: "size-10 [&_svg]:size-5",
    lg: "size-14 [&_svg]:size-6",
  }
  return (
    <div data-slot="player-transport" className={cn(TRANSPORT, className)}>
      {buttons.map((b) => (
        <Tip key={b.id} content={b.label} keys={b.keys}>
          <button
            type="button"
            aria-label={b.label}
            onClick={b.onClick}
            className={cn(DISC, size[b.size])}
          >
            {b.icon}
          </button>
        </Tip>
      ))}
    </div>
  )
}

/** Where the transport sits: centred over the picture, taking the pointer itself. */
export const TRANSPORT =
  "pointer-events-auto absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3"

/** The transport's buttons as data, in order, for every face to draw: what each says
 *  (its name, and its key where PlayerKeys listens), how large it is, what it shows
 *  and does. Previous and next appear only when the outline has more than one
 *  division. */
export function useTransportButtons(jump: number): {
  id: string
  label: string
  keys?: string
  size: "sm" | "md" | "lg"
  icon: React.ReactNode
  onClick: () => void
}[] {
  const t = useTransport()
  const keysOn = useKeysListening()
  const seconds = Math.round(jump / 1000)
  return [
    ...(t.previous
      ? [
          {
            id: "previous",
            label: `previous ${t.unit === "item" ? "video" : "chapter"}`,
            keys: keysOn ? "P" : undefined,
            size: "sm" as const,
            icon: <PlayerIcon.previous />,
            onClick: t.previous,
          },
        ]
      : []),
    {
      id: "back",
      label: `back ${seconds} s`,
      size: "md" as const,
      icon: <PlayerIcon.jump seconds={seconds} back />,
      onClick: () => t.jump(-jump),
    },
    {
      id: "play",
      label: t.ended ? "replay" : t.playing ? "pause" : "play",
      keys: keysOn ? "space" : undefined,
      size: "lg" as const,
      icon: t.ended ? (
        <PlayerIcon.replay />
      ) : t.playing ? (
        <PlayerIcon.pause />
      ) : (
        <PlayerIcon.play />
      ),
      onClick: t.toggle,
    },
    {
      id: "forward",
      label: `forward ${seconds} s`,
      size: "md" as const,
      icon: <PlayerIcon.jump seconds={seconds} back={false} />,
      onClick: () => t.jump(jump),
    },
    ...(t.next
      ? [
          {
            id: "next",
            label: `next ${t.unit === "item" ? "video" : "chapter"}`,
            keys: keysOn ? "N" : undefined,
            size: "sm" as const,
            icon: <PlayerIcon.next />,
            onClick: t.next,
          },
        ]
      : []),
  ]
}

/** The speed: a button showing it, opening the speeds with the current one checked,
 *  under the hand or on a press. Absent where speed cannot change. */
export function PlayerSpeed({ className }: { className?: string }) {
  const speed = useSpeed()
  const layer = usePlayerLayer()
  if (!speed) return null
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        // Opens under the hand like the volume does; the close waits a beat so the
        // hand can travel up into the menu.
        openOnHover
        delay={60}
        closeDelay={150}
        data-slot="player-speed"
        aria-label={`speed ${speedLabel(speed.rate)}`}
        className={cn(
          BUTTON,
          READOUT,
          "data-popup-open:bg-foreground/8",
          className,
        )}
      >
        <PlayerReadout
          value={speedLabel(speed.rate)}
          widest={WIDEST_SPEED}
          align="center"
        />
      </Menu.Trigger>
      <Menu.Portal container={layer}>
        <Menu.Positioner
          side="top"
          align="end"
          sideOffset={6}
          className="z-50 outline-none"
        >
          <Menu.Popup className="min-w-24 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none transition-[opacity,translate] duration-150 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0">
            <SpeedItems
              speed={speed}
              item="flex cursor-default items-center justify-between gap-3 rounded-md px-2 py-1 font-mono text-xs tabular-nums outline-none data-highlighted:bg-foreground/8"
            />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

/** The speed rows, one radio group, for any menu face: plain or glass. */
export function SpeedItems({
  speed,
  item,
}: {
  speed: { rate: number; set: (rate: number) => void }
  /** Classes on each row. */
  item?: string
}) {
  return (
    <Menu.RadioGroup
      value={speed.rate}
      onValueChange={(v: number) => speed.set(v)}
    >
      {[...SPEEDS].reverse().map((r) => (
        <Menu.RadioItem key={r} value={r} closeOnClick className={item}>
          {speedLabel(r)}
          <Menu.RadioItemIndicator className="[&_svg]:size-3.5">
            <PlayerIcon.check />
          </Menu.RadioItemIndicator>
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  )
}

/** The volume as a slider, ink `currentColor`, for any face. */
export function PlayerVolume({ className }: { className?: string }) {
  const sound = useSound()
  if (!sound) return null
  return (
    <Slider.Root
      data-slot="player-volume"
      aria-label="volume"
      orientation="vertical"
      min={0}
      max={1}
      step={0.01}
      value={sound.muted ? 0 : sound.volume}
      onValueChange={(v: number) => sound.setVolume(v)}
      className={cn("flex h-20 w-6 justify-center", className)}
    >
      <Slider.Control className="flex h-full w-full cursor-pointer justify-center">
        <Slider.Track className="relative h-full w-1 rounded-full bg-current/20">
          <Slider.Indicator className="rounded-full bg-current/80" />
          <Slider.Thumb className="size-2.5 rounded-full bg-current outline-none focus-visible:ring-2 focus-visible:ring-current/40" />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  )
}

/** Where a sound control's volume opens: straight above its button, floating, so the
 *  row it sits in never moves. Shown under the hand or focus; the padding below the
 *  panel joins it to the button, so the hand moving up onto it keeps it open. */
export const SOUND_REVEAL =
  "pointer-events-none absolute bottom-full left-1/2 z-20 -translate-x-1/2 pb-1.5 opacity-0 transition-opacity duration-150 ease-out group-focus-within/sound:pointer-events-auto group-focus-within/sound:opacity-100 group-hover/sound:pointer-events-auto group-hover/sound:opacity-100 motion-reduce:transition-none"

/** Sound: mute and unmute, and the volume opening above it under the hand or focus.
 *  Absent where there is no sound. */
export function PlayerSound({ className }: { className?: string }) {
  const sound = useSound()
  if (!sound) return null
  return (
    <div
      data-slot="player-sound"
      className={cn("group/sound relative flex items-center", className)}
    >
      <button
        type="button"
        aria-label={sound.level === 0 ? "unmute" : "mute"}
        aria-pressed={sound.level === 0}
        onClick={sound.toggleMute}
        className={cn(BUTTON, "[&_svg]:size-3.5")}
      >
        <PlayerIcon.sound level={sound.level} />
      </button>
      <div className={SOUND_REVEAL}>
        <div className="rounded-lg border border-border bg-popover px-1 py-2 text-popover-foreground shadow-md">
          <PlayerVolume />
        </div>
      </div>
    </div>
  )
}

/** The controls' layer over a picture (a VideoPicture): shown while the picture is
 *  hovered or holds keyboard focus, and while it is paused or previewed; hidden while
 *  it plays untouched, so the picture is all there is. Holds a PlayerTransport in the
 *  middle and a PlayerFoot at the bottom (or their glass counterparts). Dark-scoped:
 *  whatever it holds is drawn in light ink in either theme. The layer itself takes no
 *  pointer: a click between the controls is the picture's (play and pause). */
export function PlayerChrome({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const playing = useTimebaseState((s) => s.playing)
  const preview = useTimebaseState((s) => s.preview)
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: only keeps a mouse press from taking focus; the controls inside are the interactive ones
    <div
      data-slot="player-chrome"
      onMouseDown={keepFocus}
      data-shown={!playing || preview !== null ? "" : undefined}
      className={cn(
        "dark pointer-events-none absolute inset-0 z-10 text-foreground opacity-0 transition-opacity duration-200 ease-out focus-within:opacity-100 group-hover/picture:opacity-100 data-shown:opacity-100 motion-reduce:transition-none",
        className,
      )}
    >
      {children}
    </div>
  )
}

/** The bottom row of the chrome on a scrim: where a PlayerBar goes, with its sound and
 *  speed beside it. */
export function PlayerFoot({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="player-foot"
      className={cn(
        "pointer-events-auto absolute inset-x-0 bottom-0 cursor-default bg-linear-to-t from-black/75 via-black/35 to-transparent px-4 pt-10 pb-1",
        className,
      )}
    >
      {children}
    </div>
  )
}

const listening = new Set<symbol>()
const keyWatchers = new Set<() => void>()

/** Whether a PlayerKeys listens on this page: a control's tooltip names its key only
 *  then, since a key nobody listens to would be a promise the page does not keep. */
export function useKeysListening(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      keyWatchers.add(onChange)
      return () => {
        keyWatchers.delete(onChange)
      }
    },
    () => listening.size > 0,
    () => false,
  )
}

/** The playlist around it, every face's rows: each item's poster with its length on it,
 *  its name whole (wrapped, never cut), the one playing lit and named so to a screen
 *  reader. A pick plays it, then `onPick` (a popover closes). The faces: PlayerPlaylist
 *  (a list beside or under the player), PlayerPlaylistButton (a card from the bar), and
 *  liquid-glass's GlassPlayerPlaylist; or your own around these rows. */
export function PlaylistRows({
  onPick,
  className,
}: {
  onPick?: () => void
  className?: string
}) {
  const playlist = usePlaylist<PlaylistEntry>()
  if (!playlist)
    throw new Error("PlaylistRows: place it inside a PlaylistProvider")
  return (
    <ol
      data-slot="playlist-rows"
      className={cn("flex flex-col gap-1", className)}
    >
      {playlist.items.map((item, i) => {
        const current = i === playlist.index
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: an item's place is its identity here (the same film twice is two places)
          <li key={i}>
            <button
              type="button"
              aria-current={current || undefined}
              onClick={() => {
                playlist.go(i)
                onPick?.()
              }}
              className="flex w-full cursor-pointer items-start gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-foreground/5 aria-current:bg-foreground/8 motion-reduce:transition-none"
            >
              {/* The stage in small: a picture of another shape fits inside it on
                  black, exactly as the player shows it, never cropped. */}
              <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-black">
                {item.poster && (
                  <Img
                    src={item.poster}
                    alt=""
                    className="size-full object-contain"
                  />
                )}
                {item.duration !== undefined && (
                  <span className="absolute right-1 bottom-1 rounded-sm bg-black/70 px-1 font-mono text-[10px] text-white tabular-nums leading-4">
                    {clockTime(item.duration)}
                  </span>
                )}
              </span>
              <span className="min-w-0 pt-0.5 text-sm leading-5">
                <span
                  className={cn(
                    "block text-pretty",
                    current ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
                {current && (
                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                    playing
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/** The playlist as a list on the page, beside the player or under it. */
export function PlayerPlaylist({
  label = "playlist",
  className,
}: {
  /** The list's accessible name. */
  label?: string
  className?: string
}) {
  return (
    <nav
      aria-label={label}
      data-slot="player-playlist"
      className={cn("min-w-0", className)}
    >
      <PlaylistRows />
    </nav>
  )
}

/** The playlist as a card over the picture, opened from a button in the bar (where a
 *  library sits in a watching app): the rows in a popover above it, closed by a pick,
 *  a press outside or Escape. In the player's root, so it shows in fullscreen too.
 *  Absent without a playlist of more than one item. */
export function PlayerPlaylistButton({
  label = "playlist",
  className,
}: {
  label?: string
  className?: string
}) {
  const playlist = usePlaylist()
  const layer = usePlayerLayer()
  const [open, setOpen] = React.useState(false)
  if (!playlist || playlist.items.length < 2) return null
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip content={label}>
        <Popover.Trigger
          aria-label={label}
          data-slot="player-playlist-button"
          className={cn(
            BUTTON,
            "data-popup-open:bg-foreground/8 [&_svg]:size-4",
            className,
          )}
        >
          <PlayerIcon.playlist />
        </Popover.Trigger>
      </Tip>
      <Popover.Portal container={layer}>
        <Popover.Positioner
          side="top"
          align="end"
          sideOffset={8}
          className="z-50 outline-none"
        >
          <Popover.Popup className="max-h-(--available-height) w-80 max-w-(--available-width) overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none transition-[opacity,translate] duration-150 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0 motion-reduce:transition-none">
            <PlaylistRows onPick={() => setOpen(false)} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export interface PlayerZoomFinderProps {
  /** px. Its height follows the stage's shape. */
  width?: number
  floating?: boolean
  always?: boolean
  className?: string
}

/** Where a zoomed picture is looking: the whole frame in small, live, with the part
 *  the stage shows outlined and the rest dimmed. A press or drag on it moves there.
 *  It shows while the picture is zoomed past fit (`always` keeps it). Floating over the
 *  picture's corner by default (place it in VideoPicture); `floating={false}` puts it
 *  in the page's flow anywhere inside the VideoPlayback, beside the player or under it. */
export function PlayerZoomFinder({
  width = 160,
  floating = true,
  always = false,
  frame = "rounded-md bg-black shadow-lg ring-1 ring-white/25",
  className,
}: PlayerZoomFinderProps & {
  /** The face around the picture (liquid-glass's GlassPlayerZoomFinder is glass). */
  frame?: string
}) {
  const zoom = usePictureZoom()
  if (!zoom)
    throw new Error(
      "PlayerZoomFinder: place it inside a VideoPlayback with `zoom`",
    )
  const view = usePictureZoomState((s) => s.view)
  const box = usePictureZoomState((s) => s.box)
  const stage = usePictureZoomState((s) => s.stage)
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const shown = always || view.s > 1.001
  const height = stage ? Math.round((width * stage.h) / stage.w) : 0
  // The stage at fit, in small: px of the stage to px of the finder.
  const k = stage ? width / stage.w : 0
  const offset =
    box && stage
      ? { x: ((stage.w - box.w) / 2) * k, y: ((stage.h - box.h) / 2) * k }
      : { x: 0, y: 0 }

  // The frame, drawn on every new frame the picture presents while the finder shows.
  React.useEffect(() => {
    const video = zoom.picture()
    const c = canvas.current
    if (!shown || !video || !c || !box || !stage) return
    const ctx = c.getContext("2d")
    if (!ctx) throw new Error("PlayerZoomFinder: no 2d context")
    const dpr = window.devicePixelRatio || 1
    c.width = Math.round(width * dpr)
    c.height = Math.round(height * dpr)
    const draw = () => {
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, c.width, c.height)
      if (video.readyState < 2) return
      ctx.drawImage(
        video,
        offset.x * dpr,
        offset.y * dpr,
        box.w * k * dpr,
        box.h * k * dpr,
      )
    }
    let handle = 0
    const onFrame = () => {
      draw()
      handle = video.requestVideoFrameCallback(onFrame)
    }
    draw()
    handle = video.requestVideoFrameCallback(onFrame)
    video.addEventListener("seeked", draw)
    return () => {
      video.cancelVideoFrameCallback(handle)
      video.removeEventListener("seeked", draw)
    }
  }, [zoom, shown, box, stage, width, height, k, offset.x, offset.y])

  if (!shown || !box || !stage) return null
  const r = visibleRect(view, box, stage)
  // A point of the finder, as px of the fitted picture.
  const toPicture = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left - offset.x) / k,
      y: (e.clientY - rect.top - offset.y) / k,
    }
  }
  return (
    <div
      data-slot="player-zoom-finder"
      aria-hidden
      className={cn(
        "w-fit",
        frame,
        floating && "absolute top-3 right-3 z-10",
        className,
      )}
    >
      {/* The picture in small: what a press maps from, whatever the frame adds. */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation()
          e.currentTarget.setPointerCapture(e.pointerId)
          zoom.centreOn(toPicture(e))
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            zoom.centreOn(toPicture(e))
        }}
        onPointerUp={() => zoom.end()}
        onPointerCancel={() => zoom.end()}
        className="relative cursor-move touch-none overflow-hidden rounded-[inherit] bg-black"
        style={{ width, height }}
      >
        <canvas ref={canvas} className="block size-full" />
        {/* The part the stage shows; everything around it dimmed by its own shadow. */}
        <span
          className="pointer-events-none absolute rounded-[2px] shadow-[0_0_0_999px_rgb(0_0_0/0.5)] ring-1 ring-white"
          style={{
            left: offset.x + r.x * k,
            top: offset.y + r.y * k,
            width: r.w * k,
            height: r.h * k,
          }}
        />
      </div>
    </div>
  )
}

/** ms J, L and the playing arrows jump, and with shift. */
const JUMP_MS = 5000
const FAR_MS = 30000

/** The player's keys as a legend, each drawn as keys: for a hint card beside a player
 *  (`<TipHint card content={<PlayerKeysCard />} />`). Give it the `jump` and `far`
 *  its PlayerKeys was given; `frames` false leaves out the frame steps, for a timebase
 *  that does not know its frames. */
export function PlayerKeysCard({
  jump = JUMP_MS,
  far = FAR_MS,
  frames = true,
  zoom = false,
}: {
  jump?: number
  far?: number
  frames?: boolean
  /** The picture zooms: its keys too. */
  zoom?: boolean
}) {
  const s = (ms: number) => `${ms / 1000} s`
  const rows: [string[], string][] = [
    [["space", "K"], "play, pause"],
    [["J", "L"], `back, forward ${s(jump)}`],
    [["⇧J", "⇧L"], `back, forward ${s(far)}`],
    [
      ["←", "→"],
      frames
        ? `a frame paused, ${s(jump)} playing`
        : `back, forward ${s(jump)}`,
    ],
    ...(frames ? [[[",", "."], "a frame"] as [string[], string]] : []),
    [["home", "end"], "start, end"],
    [["P", "N"], "previous, next video or chapter"],
    ...(zoom
      ? [
          [["+", "-"], "zoom in, out"] as [string[], string],
          [["0"], "whole picture"] as [string[], string],
        ]
      : []),
    [["F"], "fullscreen"],
    [["M"], "mute"],
  ]
  return (
    <div data-slot="player-keys-card" className="space-y-2.5">
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
        {rows.map(([caps, what]) => (
          <React.Fragment key={what}>
            <dt className="flex gap-1">
              {caps.map((cap) => (
                <Kbd key={cap} keys={cap} className="text-[11px]" />
              ))}
            </dt>
            <dd className="whitespace-nowrap">{what}</dd>
          </React.Fragment>
        ))}
      </dl>
      <p className="max-w-56 text-muted-foreground">
        Presses add up: three quick ones go three times as far. ⇧ with the
        arrows goes {s(far)} too.
      </p>
    </div>
  )
}

/** The player's keys, page-wide while it is mounted (lib/player-input's table): space
 *  and K play, ← → step a frame on a paused picture that knows its frames and jump
 *  `jump` otherwise, J and L jump `jump`, shift with any of the four jumps `far`, , and
 *  . step a frame, Home and End, P and N the previous and next video of a playlist (or
 *  chapter), F fullscreen, M mute. Presses add up: three fast ones
 *  move three times as far, counted from where the picture is heading. One player per
 *  page listens; a second throws, since both would answer the same press. Typing in a
 *  field is never a key here. */
export function PlayerKeys({
  jump = JUMP_MS,
  far = FAR_MS,
}: {
  /** ms J, L and the playing arrows jump. */
  jump?: number
  /** ms they jump with shift. */
  far?: number
}) {
  const timebase = useTimebase()
  const level = useOutline()[0] as Level
  const playlist = usePlaylist()
  const pictureZoom = usePictureZoom()
  const onKey = React.useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
    const target = event.target
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.closest("[role=slider]"))
    )
      return
    const s = timebase.get()
    const action = resolveKey(event.key, {
      playing: s.playing,
      frames: s.fps !== null,
      shift: event.shiftKey,
    })
    if (!action) return
    // The zoom keys belong to a picture that zooms; elsewhere they stay the page's.
    if (action.startsWith("zoom-") && !pictureZoom) return
    event.preventDefault()
    run(action)
  })
  function run(action: PlayerAction) {
    const { controls } = timebase
    const { at, duration: end } = timebase.get()
    const near = () => neighbours(at, end, level, playlist, controls.seek)
    switch (action) {
      case "previous":
        return near().previous?.()
      case "next":
        return near().next?.()
      case "zoom-in":
        return pictureZoom?.step(1)
      case "zoom-out":
        return pictureZoom?.step(-1)
      case "zoom-fit":
        return pictureZoom?.fit()
      case "toggle":
        return controls.toggle()
      case "back":
        return controls.jump(-jump)
      case "forward":
        return controls.jump(jump)
      case "back-far":
        return controls.jump(-far)
      case "forward-far":
        return controls.jump(far)
      case "frame-back":
        return controls.step(-1)
      case "frame-forward":
        return controls.step(1)
      case "start":
        return controls.seek(0)
      case "end":
        return controls.seek(end)
      case "fullscreen":
        return toggleFullscreen(timebase.root())
      case "mute":
        return controls.toggleMute?.()
    }
  }
  React.useEffect(() => {
    const me = Symbol("player-keys")
    if (listening.size > 0)
      throw new Error(
        "PlayerKeys: a second player listens to the keyboard; both would answer the same press. Keep one PlayerKeys per page.",
      )
    listening.add(me)
    for (const tell of keyWatchers) tell()
    document.addEventListener("keydown", onKey)
    return () => {
      listening.delete(me)
      for (const tell of keyWatchers) tell()
      document.removeEventListener("keydown", onKey)
    }
  }, [])
  return null
}

/** Accumulated pinch that flips fullscreen. */
const PINCH = 60
/** Silence that ends a wheel swipe: browsers report no gesture phases. */
const WHEEL_END_MS = 150

/** Swipes and pinches on whatever it is placed in (a VideoPicture, a player's
 *  content): horizontal scrubs, a pinch out is fullscreen and in leaves it
 *  (lib/player-input's grammar). A vertical swipe is the PAGE's scroll and passes
 *  through, wheel and touch alike, unless `vertical` opts the player into it: volume
 *  on the left half and speed on the right (each only where the timebase has it), for
 *  a player that owns the screen. It takes swipes only while its parent is wholly on
 *  screen, so scrolling the page through a half-shown player never turns into a
 *  scrub. What a swipe did flashes over the picture. */
export function PlayerGestures({
  vertical = false,
}: {
  /** Vertical swipes set volume (left half) and speed (right half) instead of
   *  scrolling the page. For a player that owns the screen; off in a page. */
  vertical?: boolean
}) {
  const timebase = useTimebase()
  // A picture that zooms owns the pinch (it zooms, it does not go fullscreen) and,
  // while zoomed, every drag and scroll (they pan, they do not scrub).
  const pictureZoom = usePictureZoom()
  const anchor = React.useRef<HTMLSpanElement>(null)
  const [flash, setFlash] = React.useState<string | null>(null)

  React.useEffect(() => {
    const el = anchor.current?.parentElement
    if (!el)
      throw new Error("PlayerGestures: rendered with no parent to listen on")
    const { controls } = timebase
    const zoomed = () => (pictureZoom?.get().view.s ?? 1) > 1.001
    let flashTimer = 0
    const show = (text: string) => {
      setFlash(text)
      window.clearTimeout(flashTimer)
      flashTimer = window.setTimeout(() => setFlash(null), 700)
    }
    const apply = (effect: SwipeEffect | null) => {
      if (!effect) return
      const s = timebase.get()
      if (effect.kind === "seek") {
        controls.jump(effect.ms)
        show(
          timeLabel(
            Math.min(s.duration, Math.max(0, s.at + effect.ms)),
            "frame",
            s.fps,
          ),
        )
      } else if (!vertical) {
        return
      } else if (effect.kind === "volume") {
        if (s.volume === null || !controls.setVolume) return
        const v = Math.min(1, Math.max(0, s.volume + effect.delta))
        controls.setVolume(v)
        show(`volume ${Math.round(v * 100)}%`)
      } else {
        if (!controls.setRate) return
        const r =
          Math.round(
            Math.min(4, Math.max(0.25, s.rate + effect.steps * 0.1)) * 10,
          ) / 10
        controls.setRate(r)
        show(`${r}×`)
      }
    }
    let pinch = 0
    const zoom = (d: number) => {
      pinch += d
      if (pinch > PINCH) toggleFullscreen(timebase.root(), true)
      else if (pinch < -PINCH) toggleFullscreen(timebase.root(), false)
      else return
      pinch = 0
    }
    const leftHalf = (clientX: number) => {
      const r = el.getBoundingClientRect()
      return clientX - r.left < r.width / 2
    }
    let whole = false
    const grab = () => whole || document.fullscreenElement !== null
    const io = new IntersectionObserver(
      ([entry]) => {
        whole = (entry?.intersectionRatio ?? 0) >= 0.99
        // Without `vertical`, a finger's vertical pan stays the page's. A zooming
        // picture sets its own (the page's vertical when whole, none when zoomed).
        if (!pictureZoom)
          el.style.touchAction = grab() ? (vertical ? "none" : "pan-y") : ""
      },
      { threshold: [0, 0.99, 1] },
    )
    io.observe(el)

    // A wheel swipe decides grab-or-pass at its first tick and keeps it: a page
    // scroll that carries the player into view must not turn into a scrub.
    const wheel = createSwipe({ slop: 6 })
    let session: "grab" | "pass" | null = null
    let wheelEnd = 0
    const onWheel = (e: WheelEvent) => {
      if (pictureZoom && (e.ctrlKey || zoomed())) return
      window.clearTimeout(wheelEnd)
      wheelEnd = window.setTimeout(() => {
        session = null
        pinch = 0
        wheel.end()
      }, WHEEL_END_MS)
      // Without `vertical`, a swipe that starts vertical is the page's scroll.
      if (session === null)
        session =
          grab() &&
          (vertical || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY))
            ? "grab"
            : "pass"
      if (session === "pass") return
      e.preventDefault()
      // A trackpad pinch arrives as a ctrl-wheel; spreading is a negative deltaY.
      if (e.ctrlKey) return zoom(-e.deltaY)
      apply(wheel.feed(-e.deltaX, e.deltaY, leftHalf(e.clientX)))
    }

    // Touch: one finger swipes, two pinch.
    const touch = createSwipe({ slop: 10 })
    const fingers = new Map<number, { x: number; y: number }>()
    let spread = 0
    const distance = () => {
      const [a, b] = [...fingers.values()]
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !grab()) return
      if (pictureZoom && (zoomed() || fingers.size > 0)) {
        // A second finger is the zoom's pinch; a swipe already under way ends.
        fingers.clear()
        touch.end()
        return
      }
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (fingers.size === 2) {
        spread = distance()
        touch.end()
      }
    }
    const onMove = (e: PointerEvent) => {
      const prev = fingers.get(e.pointerId)
      if (!prev) return
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (fingers.size >= 2) {
        const d = distance()
        zoom(d - spread)
        spread = d
        return
      }
      apply(
        touch.feed(e.clientX - prev.x, prev.y - e.clientY, leftHalf(e.clientX)),
      )
    }
    const onUp = (e: PointerEvent) => {
      fingers.delete(e.pointerId)
      if (fingers.size === 0) pinch = 0
      if (fingers.size <= 1) touch.end()
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerup", onUp)
    el.addEventListener("pointercancel", onUp)
    return () => {
      io.disconnect()
      el.style.touchAction = ""
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", onUp)
      el.removeEventListener("pointercancel", onUp)
      window.clearTimeout(wheelEnd)
      window.clearTimeout(flashTimer)
    }
  }, [timebase, vertical, pictureZoom])

  return (
    <span
      ref={anchor}
      data-slot="player-gestures"
      aria-hidden
      className="contents"
    >
      {flash && <span className={PLAYER_FLASH}>{flash}</span>}
    </span>
  )
}
