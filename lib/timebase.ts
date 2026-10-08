import type { Span } from "@/lib/clip"

export interface TimebaseState {
  /** The moment on screen, ms: for a video, the frame the browser presented. */
  at: number
  /** ms */
  duration: number
  /** Time is running forward at `rate`. */
  playing: boolean
  /** Frames per second, when the timebase knows its frames; null when it does not. */
  fps: number | null
  rate: number
  /** A moment shown without committing (a pointer over the bar), ms, or null. While
   *  set, the timebase holds: nothing plays underneath a preview. */
  preview: number | null
  /** The span it loops in, ms. */
  range: Span | null
  /** 0..1, or null when the timebase has no sound. */
  volume: number | null
  muted: boolean
  /** The duration and the first moment are known. */
  ready: boolean
}

export interface TimebaseControls {
  play(): void
  pause(): void
  toggle(): void
  /** Show `ms`; `play` starts it there (a seek from the bar is an intent to watch). */
  seek(ms: number, options?: { play?: boolean }): void
  /** Move `n` frames and hold. Only a timebase with `fps` steps; others throw. */
  step(n: number): void
  /** Move by `ms`, keeping the play state. */
  jump(ms: number): void
  /** Show `ms` without committing; the first call remembers where it was and holds. */
  preview(ms: number): void
  /** Back to where it was, playing again if it played. */
  endPreview(): void
  setRange(range: Span | null): void
  /** Present only where speed can change. */
  setRate?(rate: number): void
  /** Present only where there is sound. */
  setVolume?(volume: number): void
  toggleMute?(): void
}

export interface Timebase {
  get(): TimebaseState
  subscribe(listener: () => void): () => void
  controls: TimebaseControls
  /** The element the owner draws in: what fullscreen fills and gestures attach
   *  to. Null when the owner draws nothing of its own (a timebase the page holds). */
  root(): HTMLElement | null
}

/** The moment content draws: a preview when one is showing, else where it is. */
export function shownAt(s: TimebaseState): number {
  return s.preview ?? s.at
}

/** The observable state an owner writes and its followers read. Every write that
 *  changes nothing notifies no one, so a follower re-renders only on a real move. */
export class TimebaseStore {
  private state: TimebaseState
  private listeners = new Set<() => void>()
  constructor(initial: TimebaseState) {
    this.state = initial
  }
  get = (): TimebaseState => this.state
  set(patch: Partial<TimebaseState>) {
    let changed = false
    for (const k in patch) {
      const key = k as keyof TimebaseState
      if (!Object.is(this.state[key], patch[key])) {
        changed = true
        break
      }
    }
    if (!changed) return
    this.state = { ...this.state, ...patch }
    for (const l of this.listeners) l()
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

export function initialState(
  patch: Partial<TimebaseState> = {},
): TimebaseState {
  return {
    at: 0,
    duration: 0,
    playing: false,
    fps: null,
    rate: 1,
    preview: null,
    range: null,
    volume: null,
    muted: false,
    ready: false,
    ...patch,
  }
}

// ── frames ───────────────────────────────────────────────────────────────────────

/** The frame rates video is actually made at. A measured rate within 1% of one of
 *  these is that rate: 25.02 from a jittery clock is 25, 23.98 is 24000/1001. */
export const STANDARD_RATES = [
  24000 / 1001,
  24,
  25,
  30000 / 1001,
  30,
  48,
  50,
  60000 / 1001,
  60,
] as const

function assertRate(fps: number) {
  if (!(fps > 0 && fps < 1000))
    throw new Error(`timebase: ${fps} is not a frame rate`)
}

/** The frame shown at `ms`. The epsilon keeps a moment that IS a frame's start (frame
 *  12 at 25 fps is 480 ms, stored as 479.99999) from reading as the frame before. */
export function frameAt(ms: number, fps: number): number {
  assertRate(fps)
  return Math.max(0, Math.floor((ms * fps) / 1000 + 1e-6))
}

/** Where to seek to show `frame`: its middle, never its start. A seek to a frame's
 *  exact start lands on the frame before it often enough (decoders round
 *  presentation times) that a step of one would sometimes not move. */
export function frameTime(frame: number, fps: number): number {
  assertRate(fps)
  return ((Math.max(0, frame) + 0.5) * 1000) / fps
}

/** How many frames a duration holds. */
export function frameCount(durationMs: number, fps: number): number {
  assertRate(fps)
  return Math.max(0, Math.round((durationMs * fps) / 1000))
}

/** The editors' timecode (SMPTE): `00:01:04:12`, hours, minutes, seconds and the frame
 *  within that second, always all four, so it never reads as a decimal or a clock. How
 *  a person names one exact frame (a cut, a label); a display form, never data: time
 *  is ms everywhere else. */
export function timecode(ms: number, fps: number): string {
  assertRate(fps)
  const whole = Math.floor(Math.max(0, ms) / 1000)
  const frame = frameAt(ms, fps) - Math.floor(whole * fps + 1e-6)
  const two = (n: number) => String(n).padStart(2, "0")
  return `${two(Math.floor(whole / 3600))}:${two(Math.floor((whole % 3600) / 60))}:${two(whole % 60)}:${two(frame)}`
}

/** The instant as a person reads it, in one of three forms: `clock` (`0:02`), `frame`
 *  (the frame number beside the clock, `54 · 0:02`), `timecode` (`00:00:02:04`). The
 *  last two need the frame rate; without it every form is the clock. */
export type TimeForm = "clock" | "frame" | "timecode"
export function timeLabel(
  ms: number,
  form: TimeForm,
  fps: number | null,
): string {
  if (!fps || form === "clock") return clockTime(ms)
  if (form === "frame") return `${frameAt(ms, fps)} · ${clockTime(ms)}`
  return timecode(ms, fps)
}

/** `1:04`, `1:02:04`: a moment to the second, for a clock beside a bar. */
export function clockTime(ms: number): string {
  // Floored, as every player's clock is: 2.6 s is still the third second's start
  // not yet reached, and a clock that rounds disagrees with the frame-exact timecode.
  const whole = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(whole / 3600)
  const m = Math.floor((whole % 3600) / 60)
  const sec = String(whole % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`
}

/** The widest a changing readout can get, in its own shape: every digit as `0`. Over
 *  tabular figures every digit is as wide as every other, so a readout that reserves
 *  the shape of its largest value (a clock the duration's, a frame number the frame
 *  count's) never changes width as it counts. */
export function widest(text: string): string {
  return text.replace(/\d/g, "0")
}

/** The frame rate from the gaps between presented frames, ms (requestVideoFrameCallback
 *  `mediaTime` deltas while playing at 1×). The median ignores the frames a busy page
 *  dropped; a result near a standard rate snaps to it. Null until there are enough
 *  gaps to say. */
export function measureRate(gapsMs: number[]): number | null {
  const usable = gapsMs.filter((g) => g > 1 && g < 250).sort((a, b) => a - b)
  if (usable.length < 8) return null
  const median = usable[Math.floor(usable.length / 2)] as number
  const raw = 1000 / median
  const standard = STANDARD_RATES.find((r) => Math.abs(r - raw) / r < 0.01)
  return standard ?? raw
}
