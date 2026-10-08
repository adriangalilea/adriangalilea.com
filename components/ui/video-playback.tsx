"use client"

// A video's decoder as the owner of a timebase (lib/timebase): the other owner beside
// ui/playback's clip clock, read by the same followers. `VideoPlayback` owns it;
// `VideoPicture` is where the picture goes, anywhere inside; ui/player's PlayerBar,
// PlayerKeys, PlayerGestures, PlayerTransport, PlayerSpeed and PlayerSound move and
// read it like any other.
//
//   <VideoPlayback src="/film.mp4" label="the film" fps={25}>
//     <VideoPicture><PlayerGestures /></VideoPicture>
//     <PlayerBar label="the film"><PlayerSpeed /><PlayerSound /></PlayerBar>
//     <PlayerKeys />
//   </VideoPlayback>
//
// The instant is the frame the browser PRESENTED (requestVideoFrameCallback), never the
// clock's coarse `timeupdate`, so a follower that says "frame 112" means the frame on
// screen. Seeks coalesce (a sweep never queues stale frames behind the pointer) and a
// step counts from where the picture is heading, so three fast presses move three
// frames whatever the decoder's pace. A preview pauses and shows its instant; ending
// it returns where it was and plays again if it played. `range` loops a span. A
// refused autoplay plays muted and the first press anywhere brings the sound back.
// Volume, mute and speed are remembered across visits unless `remember={false}`.

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Chapter,
  type Outline,
  outlineOf,
  type Span,
} from "@/lib/clip"
import { zoomAt } from "@/lib/lightbox-motion"
import {
  centreOn,
  clampView,
  FIT_VIEW,
  fitted,
  pinchRaw,
  pinchScale,
  type Size,
  settle,
  stepIn,
  stepOut,
  stopsOf,
  type View,
  zoomLabel,
} from "@/lib/picture-zoom"
import {
  frameAt,
  frameTime,
  initialState,
  measureRate,
  type Timebase,
  TimebaseStore,
} from "@/lib/timebase"
import {
  OutlineProvider,
  type PictureZoom,
  PictureZoomProvider,
  type PictureZoomState,
  PLAYER_FLASH,
  PlayerLayer,
  TimebaseProvider,
  toggleFullscreen,
  usePictureZoomState,
  useTimebase,
} from "@/components/ui/playback"
import { Video, type VideoProps } from "@/components/ui/video"

const REMEMBER = "ag-video-playback"

interface Remembered {
  volume?: number
  muted?: boolean
  rate?: number
}

function remembered(): Remembered {
  return JSON.parse(localStorage.getItem(REMEMBER) ?? "{}") as Remembered
}

function remember(patch: Remembered) {
  localStorage.setItem(REMEMBER, JSON.stringify({ ...remembered(), ...patch }))
}

type PictureProps = Pick<
  VideoProps,
  | "src"
  | "label"
  | "poster"
  | "blurDataURL"
  | "sizes"
  | "optimizePoster"
  | "width"
  | "height"
  | "muted"
  | "loop"
  | "preload"
> & {
  /** When it plays by itself, ui/video's automatic policies: "visible" (a feature
   *  demo that plays on sight), "hover", "once". Default "manual": the person decides.
   *  Whichever starts it, the player's controls work the same. */
  play?: "manual" | "hover" | "visible" | "once"
}

/** How far a pinch may carry the scale past the ladder's ends before it settles back:
 *  under fit and over the most, the hand still feels the picture move. */
const PINCH_UNDER = 0.8
const PINCH_OVER = 1.15

/** The zoom of one picture: lib/picture-zoom's ladder over a view, measured by
 *  VideoPicture, moved by gestures, keys and a finder. */
function createPictureZoom(
  element: () => HTMLVideoElement | null,
): PictureZoom & { measure: (stage: Size, natural: Size) => void } {
  let state: PictureZoomState = {
    view: FIT_VIEW,
    box: null,
    stage: null,
    fill: 1,
    max: 1,
    moving: false,
    said: null,
  }
  const listeners = new Set<() => void>()
  let natural: Size | null = null
  let said = 0
  // The raw stretch a pinch began at (lib/picture-zoom's pinchRaw).
  let pinchBase = 1
  const set = (patch: Partial<PictureZoomState>) => {
    state = { ...state, ...patch }
    for (const l of listeners) l()
  }
  // A new view, kept in bounds, its change named when the name changes.
  const show = (view: View, moving: boolean) => {
    const { box, stage, fill } = state
    if (!box || !stage) return
    const next = clampView(view, box, stage)
    const before = zoomLabel(state.view.s, fill)
    const after = zoomLabel(next.s, fill)
    set({
      view: next,
      moving,
      said: before === after ? state.said : { text: after, n: ++said },
    })
  }
  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    measure: (stage, size) => {
      const box = fitted(size, stage)
      const { fill, max } = stopsOf(box, stage)
      // Another picture (a playlist's next) starts whole; the same one on a resized
      // stage keeps its scale.
      const same =
        natural !== null && natural.w === size.w && natural.h === size.h
      natural = size
      const view = same ? clampView(state.view, box, stage) : FIT_VIEW
      set({ box, stage, fill, max: Math.max(max, 1), view })
    },
    pinch: (stretch, at, start) => {
      if (start) pinchBase = pinchRaw(state.view.s, state.fill)
      const scale = Math.min(
        Math.max(pinchScale(pinchBase * stretch, state.fill), PINCH_UNDER),
        state.max * PINCH_OVER,
      )
      show(zoomAt(state.view, scale, at), true)
    },
    pan: (dx, dy) =>
      show({ ...state.view, x: state.view.x + dx, y: state.view.y + dy }, true),
    step: (direction, at = { x: 0, y: 0 }) => {
      const s = state.view.s
      const scale =
        direction > 0
          ? stepIn(s, state.fill, state.max)
          : stepOut(s, state.fill)
      show(zoomAt(state.view, scale, at), false)
    },
    fit: () => show(FIT_VIEW, false),
    centreOn: (point) => {
      const { box, stage } = state
      if (box && stage) show(centreOn(point, state.view, box, stage), true)
    },
    end: () => {
      const scale = settle(state.view.s, state.max)
      show(zoomAt(state.view, scale, { x: 0, y: 0 }), false)
    },
    picture: element,
  }
}

const PictureContext = React.createContext<{
  picture: PictureProps
  attach: (el: HTMLVideoElement | null) => void
  zoom: ReturnType<typeof createPictureZoom> | null
} | null>(null)

export interface VideoPlaybackProps extends PictureProps {
  /** Frames per second when known; otherwise measured from the frames presented while
   *  it plays at 1×, and stepping waits until it is known. */
  fps?: number
  /** The video's chapters, the first level of its outline. */
  chapters?: Chapter[]
  /** Loop this span, ms. */
  range?: Span
  /** Where it starts, ms. */
  start?: number
  autoPlay?: boolean
  /** Remember volume, mute and speed across visits: the watching player's ergonomic
   *  (a film picks up at the volume you left it). Default: on when the person decides
   *  when it plays, off for a video that plays itself (a feature demo starts muted
   *  and playing on every load, its sound the page's decision). */
  remember?: boolean
  /** It reached its end (not under `loop`): a playlist's `advance`. */
  onEnded?: () => void
  /** The picture zooms (lib/picture-zoom): a pinch or ctrl-wheel at the hand, + - 0
   *  with PlayerKeys, a drag or scroll pans while zoomed, PlayerZoomFinder shows where. */
  zoom?: boolean
  className?: string
  children: React.ReactNode
}

export function VideoPlayback({
  fps,
  chapters,
  range,
  start = 0,
  autoPlay = false,
  remember: rememberProp,
  onEnded,
  zoom: zooms = false,
  className,
  children,
  ...picture
}: VideoPlaybackProps) {
  const ended = React.useEffectEvent(() => onEnded?.())
  const rememberSettings =
    rememberProp ?? (picture.play ?? "manual") === "manual"
  const root = React.useRef<HTMLDivElement>(null)
  const [el, setEl] = React.useState<HTMLVideoElement | null>(null)
  const video = React.useRef<HTMLVideoElement | null>(null)
  video.current = el
  const zoom = React.useMemo(
    () => (zooms ? createPictureZoom(() => video.current) : null),
    [zooms],
  )
  const [store] = React.useState(
    () =>
      new TimebaseStore(
        initialState({ at: start, fps: fps ?? null, range: range ?? null }),
      ),
  )
  // Seeks coalesce: while one is in flight only the newest target is kept. `target` is
  // where the picture is heading, which is where the next step or jump counts from.
  const seeking = React.useRef({
    busy: false,
    next: null as number | null,
    target: start,
  })
  // Where a preview found it, and whether it played.
  const held = React.useRef<{ at: number; playing: boolean } | null>(null)
  const gaps = React.useRef<number[]>([])
  // Muted by the player because the browser refused sound, not by the person.
  const autoMuted = React.useRef(false)

  const rawSeek = React.useCallback((ms: number) => {
    const v = video.current
    if (!v) return
    const end = Number.isFinite(v.duration)
      ? v.duration * 1000
      : Number.POSITIVE_INFINITY
    const t = Math.min(Math.max(0, ms), Math.max(0, end - 1))
    seeking.current.target = t
    if (seeking.current.busy) {
      seeking.current.next = t
      return
    }
    seeking.current.busy = true
    v.currentTime = t / 1000
  }, [])
  const here = React.useCallback(
    () => (seeking.current.busy ? seeking.current.target : store.get().at),
    [store],
  )
  const play = React.useCallback(() => {
    const v = video.current
    if (!v) return
    v.play().catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "AbortError") return
      if (
        e instanceof DOMException &&
        e.name === "NotAllowedError" &&
        !v.muted
      ) {
        autoMuted.current = true
        v.muted = true
        v.play().catch(() => {})
        return
      }
      throw e
    })
  }, [])

  const timebase = React.useMemo<Timebase>(
    () => ({
      get: store.get,
      subscribe: store.subscribe,
      root: () => root.current,
      controls: {
        setVolume: (volume) => {
          const v = video.current
          if (!v) return
          v.volume = Math.min(1, Math.max(0, volume))
          if (v.volume > 0) v.muted = false
        },
        toggleMute: () => {
          const v = video.current
          if (!v) return
          autoMuted.current = false
          v.muted = !v.muted
        },
        play,
        pause: () => video.current?.pause(),
        toggle: () => {
          if (video.current?.paused) play()
          else video.current?.pause()
        },
        seek: (ms, options) => {
          held.current = null
          store.set({ preview: null })
          rawSeek(ms)
          if (options?.play) play()
        },
        step: (n) => {
          const rate = store.get().fps
          if (!rate)
            throw new Error(
              "VideoPlayback: the frame rate is not known yet; pass `fps`, or step once it has played",
            )
          video.current?.pause()
          rawSeek(frameTime(frameAt(here(), rate) + n, rate))
        },
        jump: (ms) => rawSeek(here() + ms),
        preview: (ms) => {
          const v = video.current
          if (!v) return
          if (!held.current) {
            held.current = { at: store.get().at, playing: !v.paused }
            v.pause()
          }
          store.set({ preview: ms })
          rawSeek(ms)
        },
        endPreview: () => {
          const h = held.current
          held.current = null
          store.set({ preview: null })
          if (!h) return
          rawSeek(h.at)
          if (h.playing) play()
        },
        setRange: (r) => store.set({ range: r }),
        setRate: (rate) => {
          const v = video.current
          if (v) v.playbackRate = Math.min(4, Math.max(0.25, rate))
        },
      },
    }),
    [store, rawSeek, here, play],
  )

  React.useEffect(() => {
    store.set({ range: range ?? null })
  }, [store, range])
  React.useEffect(() => {
    if (fps) store.set({ fps })
  }, [store, fps])

  // The presented frame, every frame: the one clock the followers read.
  React.useEffect(() => {
    if (!el) return
    let handle = 0
    let last: number | null = null
    const onFrame = (_now: number, meta: VideoFrameCallbackMetadata) => {
      const at = meta.mediaTime * 1000
      const s = store.get()
      if (!el.paused && el.playbackRate === 1 && last !== null)
        gaps.current.push(at - last)
      if (gaps.current.length > 60) gaps.current.shift()
      last = el.paused ? null : at
      const rate = fps ?? s.fps ?? measureRate(gaps.current)
      store.set({ at, fps: rate })
      const r = s.range
      if (r && !el.paused && s.preview === null && at >= r.to) rawSeek(r.from)
      handle = el.requestVideoFrameCallback(onFrame)
    }
    handle = el.requestVideoFrameCallback(onFrame)
    return () => el.cancelVideoFrameCallback(handle)
  }, [el, store, fps, rawSeek])

  // The element's events into the store.
  React.useEffect(() => {
    if (!el) return
    if (rememberSettings) {
      const saved = remembered()
      if (typeof saved.volume === "number") el.volume = saved.volume
      if (typeof saved.muted === "boolean") el.muted = saved.muted
      if (typeof saved.rate === "number") el.playbackRate = saved.rate
    }
    // A video has sound to set from the start: its volume is state like the rest.
    store.set({ volume: el.volume, muted: el.muted, rate: el.playbackRate })
    const on: Record<string, () => void> = {
      loadedmetadata: () => {
        if (Number.isFinite(el.duration))
          store.set({ duration: el.duration * 1000, ready: true })
        if (start > 0) rawSeek(start)
        if (autoPlay) play()
      },
      play: () => store.set({ playing: true }),
      pause: () => store.set({ playing: false }),
      ended: () => {
        store.set({ playing: false })
        ended()
      },
      seeked: () => {
        seeking.current.busy = false
        const next = seeking.current.next
        seeking.current.next = null
        if (next !== null) rawSeek(next)
        else if (el.paused) store.set({ at: el.currentTime * 1000 })
      },
      ratechange: () => {
        store.set({ rate: el.playbackRate })
        gaps.current = []
        if (rememberSettings) remember({ rate: el.playbackRate })
      },
      volumechange: () => {
        store.set({ volume: el.volume, muted: el.muted })
        if (rememberSettings && !autoMuted.current)
          remember({ volume: el.volume, muted: el.muted })
      },
      emptied: () => {
        seeking.current = { busy: false, next: null, target: 0 }
        gaps.current = []
      },
    }
    for (const [name, handler] of Object.entries(on))
      el.addEventListener(name, handler)
    return () => {
      for (const [name, handler] of Object.entries(on))
        el.removeEventListener(name, handler)
    }
  }, [el, store, rawSeek, play, start, autoPlay, rememberSettings])

  // The first press anywhere after an autoplay the browser muted brings the sound
  // back. It runs after the press's own handlers, so a press on the mute button is the
  // person's choice and wins.
  React.useEffect(() => {
    if (!autoPlay) return
    const unmute = () =>
      window.setTimeout(() => {
        const v = video.current
        if (!v || !autoMuted.current) return
        autoMuted.current = false
        v.muted = false
      }, 0)
    window.addEventListener("pointerdown", unmute, {
      once: true,
      capture: true,
    })
    window.addEventListener("keydown", unmute, { once: true, capture: true })
    return () => {
      window.removeEventListener("pointerdown", unmute, { capture: true })
      window.removeEventListener("keydown", unmute, { capture: true })
    }
  }, [autoPlay])

  const outline = React.useMemo<Outline>(
    () => outlineOf({ duration: 1, chapters: chapters ?? [] }),
    [chapters],
  )
  // A plain value: VideoPlayback re-renders only when its props change or its element
  // attaches; the instant reaches followers through the store, not through here.
  const pictureValue = { picture, attach: setEl, zoom }

  return (
    <div
      ref={root}
      data-slot="video-playback"
      className={cn("relative flex flex-col gap-2", className)}
    >
      <PlayerLayer>
        <TimebaseProvider timebase={timebase}>
          <OutlineProvider outline={outline}>
            <PictureZoomProvider zoom={zoom}>
              <PictureContext.Provider value={pictureValue}>
                {children}
              </PictureContext.Provider>
            </PictureZoomProvider>
          </OutlineProvider>
        </TimebaseProvider>
      </PlayerLayer>
    </div>
  )
}

/** Quiet that ends a wheel's pinch or pan: browsers report no wheel phases. */
const WHEEL_END_MS = 150
/** px a press travels before it is a pan, not a click. */
const PAN_SLOP = 4
/** Scale per px of a ctrl-wheel (a trackpad's pinch arrives as one). */
const WHEEL_SCALE = 0.01

/** The picture's zoom from the hand, on the stage: measured (the stage and the
 *  picture's own size, and again when either changes), a pinch (a trackpad's, which
 *  arrives as a ctrl-wheel, or two fingers) at the hand, and while zoomed a scroll, a
 *  drag or one finger pans. PlayerGestures stands down for all of these when the
 *  picture zooms. */
function useZoomInput(
  zoom: ReturnType<typeof createPictureZoom> | null,
  stage: React.RefObject<HTMLDivElement | null>,
  el: HTMLVideoElement | null,
  panned: React.RefObject<boolean>,
) {
  React.useEffect(() => {
    const box = stage.current
    if (!zoom || !box || !el) return
    const measure = () => {
      const r = box.getBoundingClientRect()
      if (!(el.videoWidth > 0 && r.width > 0 && r.height > 0)) return
      zoom.measure(
        { w: r.width, h: r.height },
        { w: el.videoWidth, h: el.videoHeight },
      )
    }
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(box)
    el.addEventListener("loadedmetadata", measure)
    el.addEventListener("resize", measure)
    // A point of the stage, as px from its centre.
    const fromCentre = (clientX: number, clientY: number) => {
      const r = box.getBoundingClientRect()
      return {
        x: clientX - r.left - r.width / 2,
        y: clientY - r.top - r.height / 2,
      }
    }
    const zoomed = () => zoom.get().view.s > 1.001
    const onChrome = (target: EventTarget | null) =>
      target instanceof Element &&
      target.closest(
        "[data-slot=player-chrome] button, [data-slot=player-chrome] [role=slider], [data-slot=player-bar], [data-slot=player-zoom-finder]",
      ) !== null

    // A wheel: with ctrl (a trackpad's pinch), zoom at the hand; zoomed, a scroll pans.
    let wheel: "pinch" | "pan" | null = null
    let stretch = 1
    let wheelEnd = 0
    const onWheel = (e: WheelEvent) => {
      if (onChrome(e.target)) return
      if (!e.ctrlKey && !zoomed() && wheel === null) return
      e.preventDefault()
      window.clearTimeout(wheelEnd)
      wheelEnd = window.setTimeout(() => {
        wheel = null
        zoom.end()
      }, WHEEL_END_MS)
      if (e.ctrlKey) {
        const start = wheel !== "pinch"
        if (start) stretch = 1
        wheel = "pinch"
        stretch *= Math.exp(-e.deltaY * WHEEL_SCALE)
        zoom.pinch(stretch, fromCentre(e.clientX, e.clientY), start)
        return
      }
      wheel = "pan"
      zoom.pan(-e.deltaX, -e.deltaY)
    }

    // Pointers: a mouse or pen drag pans while zoomed; two fingers pinch, one pans.
    const points = new Map<number, { x: number; y: number }>()
    let spread = 0
    let pressed: { x: number; y: number } | null = null
    const twoFingers = () => {
      const [a, b] = [...points.values()]
      if (!a || !b) return null
      return {
        d: Math.hypot(a.x - b.x, a.y - b.y),
        mid: fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2),
      }
    }
    const onDown = (e: PointerEvent) => {
      if (onChrome(e.target)) return
      if (e.pointerType !== "touch" && (!zoomed() || e.button !== 0)) return
      points.set(e.pointerId, { x: e.clientX, y: e.clientY })
      pressed = { x: e.clientX, y: e.clientY }
      panned.current = false
      const two = twoFingers()
      if (two) {
        spread = two.d
        zoom.pinch(1, two.mid, true)
      }
    }
    const onMove = (e: PointerEvent) => {
      const prev = points.get(e.pointerId)
      if (!prev) return
      points.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const two = twoFingers()
      if (two) {
        if (spread > 0) zoom.pinch(two.d / spread, two.mid)
        panned.current = true
        return
      }
      if (!zoomed()) return
      if (
        pressed &&
        Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) < PAN_SLOP &&
        !panned.current
      )
        return
      panned.current = true
      zoom.pan(e.clientX - prev.x, e.clientY - prev.y)
    }
    const onUp = (e: PointerEvent) => {
      if (!points.delete(e.pointerId)) return
      if (points.size === 1) {
        // From two fingers to one: the pinch is over, the pan goes on from here.
        zoom.end()
        spread = 0
        return
      }
      if (points.size === 0) {
        pressed = null
        if (panned.current) zoom.end()
      }
    }
    // Zoomed, a finger is the picture's on both axes; whole, the page keeps scrolling.
    const touch = () => {
      box.style.touchAction = zoomed() ? "none" : "pan-y"
    }
    touch()
    const unsubscribe = zoom.subscribe(touch)
    box.addEventListener("wheel", onWheel, { passive: false })
    box.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      resize.disconnect()
      unsubscribe()
      box.style.touchAction = ""
      el.removeEventListener("loadedmetadata", measure)
      el.removeEventListener("resize", measure)
      box.removeEventListener("wheel", onWheel)
      box.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      window.clearTimeout(wheelEnd)
    }
  }, [zoom, stage, el, panned])
}

/** Where the picture goes. A click plays and pauses; a double click is fullscreen.
 *  Children sit over the picture (PlayerGestures, a caption, an answering layer).
 *
 *  Its shape: the video's own (`width` and `height`), else 16:9 until the caller sizes
 *  it, or `aspect`, a stage of one shape whatever plays in it. A playlist wants the
 *  stage: its videos differ in shape, and the player must not change size between
 *  them; a video of another shape fits inside, whole, with black on two sides. */
export function VideoPicture({
  aspect,
  className,
  videoClassName,
  children,
}: {
  /** The stage's shape, as CSS writes it ("16 / 9", "1"). */
  aspect?: string
  className?: string
  videoClassName?: string
  children?: React.ReactNode
}) {
  const ctx = React.useContext(PictureContext)
  if (!ctx) throw new Error("VideoPicture: place it inside a VideoPlayback")
  const { controls, root } = useTimebase()
  const click = React.useRef(0)
  const stage = React.useRef<HTMLDivElement>(null)
  const [el, setEl] = React.useState<HTMLVideoElement | null>(null)
  const { attach, zoom } = ctx
  const attachHere = React.useCallback(
    (node: HTMLVideoElement | null) => {
      attach(node)
      setEl(node)
    },
    [attach],
  )
  // A drag that panned is not a click.
  const panned = React.useRef(false)
  useZoomInput(zoom, stage, el, panned)
  const view = usePictureZoomState((s) => s.view)
  const moving = usePictureZoomState((s) => s.moving)
  const said = usePictureZoomState((s) => s.said)
  const [saying, setSaying] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!said) return
    setSaying(said.text)
    const t = window.setTimeout(() => setSaying(null), 700)
    return () => window.clearTimeout(t)
  }, [said])
  const zoomed = view.s > 1.001
  // Under a stage the video fills it and fits inside (its own size would give its
  // frame its own shape, and the stage would cut it).
  const picture = aspect
    ? { ...ctx.picture, width: undefined, height: undefined }
    : ctx.picture
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the bar's play button and the keys are the accessible controls
    // biome-ignore lint/a11y/useKeyWithClickEvents: PlayerKeys handles the keyboard
    <div
      ref={stage}
      data-slot="video-picture"
      data-zoomed={zoomed || undefined}
      // `group/picture`: chrome over it (ui/player's PlayerChrome) shows on its hover.
      className={cn(
        "group/picture relative cursor-pointer overflow-hidden rounded-xl bg-black",
        zoomed && "cursor-grab active:cursor-grabbing",
        !aspect && !(picture.width && picture.height) && "aspect-video",
        className,
      )}
      style={aspect ? { aspectRatio: aspect } : undefined}
      // A double click must not also toggle twice: the single click waits a beat. A
      // click on a control or on the chrome is the control's, never a toggle, and
      // neither is the release of a drag that panned.
      onClick={(e) => {
        if (panned.current) {
          panned.current = false
          return
        }
        if (
          (e.target as Element).closest(
            "button, a, input, [role=slider], [data-slot=player-chrome], [data-slot=player-zoom-finder]",
          )
        )
          return
        window.clearTimeout(click.current)
        click.current = window.setTimeout(controls.toggle, 220)
      }}
      onDoubleClick={(e) => {
        if (
          (e.target as Element).closest(
            "[data-slot=player-chrome], [data-slot=player-zoom-finder]",
          )
        )
          return
        window.clearTimeout(click.current)
        toggleFullscreen(root())
      }}
    >
      {/* The view: one transform over the whole picture, from the stage's centre.
          Eased when it settles or steps, never under a hand. */}
      <div
        data-slot="video-picture-view"
        className={cn(
          "size-full origin-center",
          zoom && !moving && "transition-transform duration-200 ease-out",
          "motion-reduce:transition-none",
        )}
        style={
          zoom
            ? {
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
              }
            : undefined
        }
      >
        <Video
          {...picture}
          ref={attachHere}
          play={picture.play ?? "manual"}
          controls={false}
          className="rounded-[inherit]"
          videoClassName={cn("object-contain", videoClassName)}
        />
      </div>
      {children}
      {zoom && (
        <span role="status" className="sr-only">
          {said ? `zoom ${said.text}` : ""}
        </span>
      )}
      {saying && (
        <span aria-hidden className={PLAYER_FLASH}>
          {saying}
        </span>
      )}
    </div>
  )
}
