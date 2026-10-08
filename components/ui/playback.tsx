"use client";

// Playback: a clip's own clock, and the React side of a timebase (lib/timebase).
//
// `Playback` OWNS a timebase: a synthetic clock walking `at` toward a `target` at the
// clip's pace, only while the content is on screen and the tab is visible. Every
// driver is a way of setting the target: play aims at the end, pause aims where it
// is, a seek moves both, a scroll stage's act cues a span to be in. So a scroll stage
// and a player's bar move the SAME clock and whichever moved last wins.
//
// Everything inside FOLLOWS the timebase. Content on the clip contract (terminal,
// macos, telegram-chat) reads its moment with `usePlayhead`; a bar, keys or a
// filmstrip move it through `useTimebase`. A video's decoder is the other owner
// (ui/video `VideoPlayback`): the same followers work under either. `Playhead` is the
// third way to hold one: the page decides the moment (a range input, a fixed still).

import * as React from "react";
import { type Clip, type Outline, outlineOf, type Span } from "@/lib/clip";
import {
  frameAt,
  frameTime,
  initialState,
  shownAt,
  type Timebase,
  type TimebaseState,
  TimebaseStore,
} from "@/lib/timebase";

const TimebaseContext = React.createContext<Timebase | null>(null);

/** Hands a timebase to everything inside. Owners render it; a page that builds its own
 *  timebase can too. */
export function TimebaseProvider({
  timebase,
  children,
}: {
  timebase: Timebase;
  children: React.ReactNode;
}) {
  return (
    <TimebaseContext.Provider value={timebase}>
      {children}
    </TimebaseContext.Provider>
  );
}

/** The timebase around this component, to move it (`controls`) or read it. Outside
 *  any owner it throws: a bar with nothing to move is a mistake, not an empty bar. */
export function useTimebase(): Timebase {
  const timebase = React.useContext(TimebaseContext);
  if (!timebase)
    throw new Error(
      "no timebase: place this inside an owner (Playback, Player, VideoPlayback)",
    );
  return timebase;
}

/** A slice of the timebase's state; re-renders only when that slice changes:
 *  `useTimebaseState((s) => s.playing)`. Return a primitive or a stable value. */
export function useTimebaseState<T>(select: (s: TimebaseState) => T): T {
  const timebase = useTimebase();
  const read = () => select(timebase.get());
  return React.useSyncExternalStore(timebase.subscribe, read, read);
}

const OutlineContext = React.createContext<Outline | null>(null);

/** Hands the medium's outline (how it is cut, coarse to fine) to everything inside:
 *  the bar divides by it, keys move through it. Beside the timebase, never in it:
 *  the clock says where, the outline says how the medium is cut there. */
export function OutlineProvider({
  outline,
  children,
}: {
  outline: Outline;
  children: React.ReactNode;
}) {
  return (
    <OutlineContext.Provider value={outline}>
      {children}
    </OutlineContext.Provider>
  );
}

/** The outline around this component. A medium nobody cut is one level of one
 *  division (the whole), so a bar always has something to divide by. */
export function useOutline(): Outline {
  return React.useContext(OutlineContext) ?? WHOLE;
}

const WHOLE: Outline = [
  { name: "chapter", divisions: [{ start: 0, title: "" }] },
];

const NO_SUBSCRIBE = () => () => {};

/** The moment a component draws (`at`, 0..1): its own `progress` when given, else the
 *  timebase's around it (a preview when one shows). Neither is a component placed
 *  where nothing moves it, and that screams. `driven` says which: a driven component
 *  can change at any moment (a chat keeps a viewport that a landing message slides
 *  inside), one with its own progress is a still and never will. `playing` says time
 *  runs forward at the clip's pace, for content with a clock of its own (a video) to
 *  run alongside; anything else (paused, previewed, rewinding, a still) holds it on
 *  `at`. */
export function usePlayhead(progress: number | undefined): {
  at: number;
  driven: boolean;
  playing: boolean;
} {
  const timebase = React.useContext(TimebaseContext);
  if (progress === undefined && timebase === null)
    throw new Error(
      "no playhead: pass `progress`, or place the component inside a timebase owner (Playback, Player, Playhead)",
    );
  const subscribe = timebase?.subscribe ?? NO_SUBSCRIBE;
  const at = React.useSyncExternalStore(
    subscribe,
    () => (timebase ? progressOf(timebase.get()) : 0),
    () => (timebase ? progressOf(timebase.get()) : 0),
  );
  const playing = React.useSyncExternalStore(
    subscribe,
    () => !!timebase && moving(timebase.get()),
    () => !!timebase && moving(timebase.get()),
  );
  if (progress !== undefined)
    return { at: clamp01(progress), driven: false, playing: false };
  return { at, driven: true, playing };
}

const clamp01 = (p: number) => Math.min(1, Math.max(0, p));
const progressOf = (s: TimebaseState) =>
  s.duration > 0 ? clamp01(shownAt(s) / s.duration) : 0;
const moving = (s: TimebaseState) => s.playing && s.preview === null;

const held = (what: string) => () => {
  throw new Error(
    `Playhead: the page holds this timebase; ${what} it through the page's own state`,
  );
};

/** A timebase the PAGE holds: the moment is `progress` (0..1), and it plays only when
 *  the page says. A hand-made driver (a range input), or a still placed where content
 *  expects a driver. It has no length of its own, so nothing can move it from inside:
 *  a bar placed under it throws. */
export function Playhead({
  progress,
  playing = false,
  children,
}: {
  progress: number;
  playing?: boolean;
  children: React.ReactNode;
}) {
  const [store] = React.useState(
    () =>
      new TimebaseStore(
        initialState({
          at: clamp01(progress),
          duration: 1,
          playing,
          ready: true,
        }),
      ),
  );
  React.useLayoutEffect(() => {
    store.set({ at: clamp01(progress), playing });
  }, [store, progress, playing]);
  const timebase = React.useMemo<Timebase>(
    () => ({
      get: store.get,
      subscribe: store.subscribe,
      sound: () => null,
      controls: {
        play: held("play"),
        pause: held("pause"),
        toggle: held("toggle"),
        seek: held("seek"),
        step: held("step"),
        jump: held("jump"),
        preview: held("preview"),
        endPreview: held("end a preview of"),
        setRange: held("loop"),
      },
    }),
    [store],
  );
  return <TimebaseProvider timebase={timebase}>{children}</TimebaseProvider>;
}

export interface PlaybackOptions {
  /** Where it stands before it plays (ms): a story that opens mid-conversation. */
  start?: number;
  /** Time on screen before it starts to play (ms): lets a neighbour go first. */
  delay?: number;
  /** A span to be in, heading to its end: what a scroll stage's act asks for
   *  (`chapterSpan`). Behind it, the playhead jumps to `from` (the act's story, not a
   *  replay of everything before it); inside, it plays on to `to` and waits; past it,
   *  it rewinds to `to`. A new cue wins over the bar, and the bar over the last cue.
   *  A scrub that follows scroll exactly is no cue: it passes `progress`. */
  cue?: Span;
  /** Whether it plays, when the page decides (a card under the pointer): true plays
   *  on from the frame it stands on, to the end and round again from the top,
   *  never cutting away from what is on screen; false holds it on the frame it
   *  stands on. Looked away from, it stops: it neither runs on to an end nor
   *  rewinds to a rest frame. It starts at `start`. Set, it replaces playing once on
   *  screen. */
  playing?: boolean;
  /** Play once on screen, without anyone pressing play. Default true; a player whose
   *  person decides when it plays passes false. */
  autoPlay?: boolean;
}

/** How much faster than the clip an aim behind the playhead plays it backwards. */
const REWIND = 3;

/** The clock. Plays once, the first time the content is on screen (after `delay`),
 *  or while the page says `playing`; holds off screen and in a hidden tab; under
 *  reduced motion every aim lands at once. One rule for motion: an AIM travels
 *  (forward at the clip's pace times its rate, backward at `REWIND`x, so scrolling
 *  back an act unwinds it), a SEEK jumps (the bar). Returns the timebase it owns and
 *  the element whose visibility gates it. */
export function usePlayback(
  clip: Clip,
  { start = 0, delay = 0, cue, playing, autoPlay = true }: PlaybackOptions = {},
): { root: React.RefObject<HTMLDivElement | null>; timebase: Timebase } {
  const duration = clip.duration;
  if (!(duration > 0)) throw new Error("playback: duration must be positive");
  const clamp = (ms: number) => Math.min(duration, Math.max(0, ms));
  const root = React.useRef<HTMLDivElement>(null);
  const [store] = React.useState(() => {
    const at = clamp(Math.max(start, cue?.from ?? start));
    return new TimebaseStore(
      initialState({ at, duration, fps: clip.fps ?? null, ready: true }),
    );
  });
  // Where the clock is heading; `at` lives in the store. Moving forward is playing.
  const target = React.useRef(store.get().at);
  // Where a preview found it: its moment and where it was heading.
  const before = React.useRef<{ at: number; target: number } | null>(null);
  const reduced = React.useRef(false);
  const armed = React.useRef(false);
  const inView = React.useRef(false);
  const frame = React.useRef(0);
  const cueRef = React.useRef(cue);
  cueRef.current = cue;
  const pageDriven = playing !== undefined;

  React.useEffect(() => {
    store.set({ duration, fps: clip.fps ?? null });
  }, [store, duration, clip.fps]);

  // One loop walks `at` toward the target; it runs only while they differ.
  const tick = React.useRef<(now: number) => void>(() => {});
  const go = React.useCallback(
    (at: number, to: number) => {
      const d = store.get().duration;
      const t = Math.min(d, Math.max(0, to));
      const a = reduced.current ? t : Math.min(d, Math.max(0, at));
      target.current = t;
      store.set({ at: a, playing: a < t });
      if (a !== t && !frame.current) {
        let last = performance.now();
        tick.current = (now) => {
          const dt = now - last;
          last = now;
          const s = store.get();
          const goal = target.current;
          if (inView.current && !document.hidden && s.preview === null) {
            let next =
              s.at < goal
                ? Math.min(goal, s.at + dt * s.rate)
                : Math.max(goal, s.at - dt * REWIND);
            const r = s.range;
            if (r && s.at < goal && next >= r.to) next = r.from;
            store.set({ at: next, playing: next < goal });
            if (next === goal) {
              frame.current = 0;
              return;
            }
          }
          frame.current = requestAnimationFrame(tick.current);
        };
        frame.current = requestAnimationFrame(tick.current);
      }
    },
    [store],
  );
  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const timebase = React.useMemo<Timebase>(() => {
    const at = () => store.get().at;
    const end = () => store.get().duration;
    return {
      get: store.get,
      subscribe: store.subscribe,
      sound: () => null,
      controls: {
        play: () => {
          const a = at();
          go(a >= end() ? 0 : a, end());
        },
        pause: () => go(at(), at()),
        toggle: () => {
          if (store.get().playing) go(at(), at());
          else go(at() >= end() ? 0 : at(), end());
        },
        seek: (ms, options) => {
          before.current = null;
          store.set({ preview: null });
          go(ms, options?.play ? end() : ms);
        },
        step: (n) => {
          const fps = store.get().fps;
          if (!fps)
            throw new Error(
              "playback: this clip has no fps; it cannot step frames",
            );
          const ms = frameTime(frameAt(at(), fps) + n, fps);
          go(ms, ms);
        },
        jump: (ms) => {
          const next = at() + ms;
          go(next, store.get().playing ? Math.max(target.current, next) : next);
        },
        preview: (ms) => {
          if (!before.current)
            before.current = { at: at(), target: target.current };
          store.set({
            preview: Math.min(end(), Math.max(0, ms)),
            playing: false,
          });
        },
        endPreview: () => {
          const b = before.current;
          before.current = null;
          store.set({ preview: null });
          if (b) go(b.at, b.target);
        },
        setRange: (range) => store.set({ range }),
        setRate: (rate) =>
          store.set({ rate: Math.min(4, Math.max(0.25, rate)) }),
      },
    };
  }, [store, go]);

  // First time on screen (and `delay` later) it plays: to the cue's end, else the end.
  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;
    const settle = () => {
      reduced.current = motion.matches;
      if (reduced.current) go(target.current, target.current);
    };
    const arm = () => {
      armed.current = true;
      const c = cueRef.current;
      if (c) go(Math.max(store.get().at, c.from), c.to);
      else go(store.get().at, duration);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current =
          !!entry?.isIntersecting && el.getBoundingClientRect().height > 0;
        if (
          inView.current &&
          !armed.current &&
          !timer &&
          !pageDriven &&
          autoPlay
        )
          timer = window.setTimeout(arm, delay);
      },
      { threshold: 0.35 },
    );
    settle();
    io.observe(el);
    motion.addEventListener("change", settle);
    return () => {
      io.disconnect();
      motion.removeEventListener("change", settle);
      window.clearTimeout(timer);
    };
  }, [go, store, duration, delay, pageDriven, autoPlay]);

  // The page's word: play on from here, or hold here; played to the end while the
  // page still says play, round again from the top.
  React.useEffect(() => {
    if (playing === undefined) return;
    if (!playing) {
      go(store.get().at, store.get().at);
      return;
    }
    // Resting on its last frame (a card whose story is told), play starts it again
    // from the top: there is nowhere forward to go.
    const at = store.get().at;
    go(at >= duration ? 0 : at, duration);
    return store.subscribe(() => {
      const s = store.get();
      if (s.at >= s.duration && !s.playing && s.preview === null)
        go(0, s.duration);
    });
  }, [playing, go, store, duration]);

  // A new cue moves the playhead into its span; before the first view it only
  // decides where the story stands.
  const cueKey = cue ? `${cue.from}:${cue.to}` : "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: the cue's value is its key
  React.useEffect(() => {
    const c = cueRef.current;
    if (!c) return;
    const at = store.get().at;
    if (armed.current) go(Math.max(at, c.from), c.to);
    else go(Math.max(at, c.from), Math.max(at, c.from));
  }, [cueKey, go, store]);

  return { root, timebase };
}

export interface PlaybackProps extends PlaybackOptions {
  clip: Clip;
  children: React.ReactNode;
  className?: string;
}

/** A clip that plays once on screen, with no controls: a film in a card. The same
 *  clock as the player, so a still, a playback and a player are one component apart. */
export function Playback({
  clip,
  children,
  className,
  ...options
}: PlaybackProps) {
  const { root, timebase } = usePlayback(clip, options);
  const outline = React.useMemo(() => outlineOf(clip), [clip]);
  return (
    <div ref={root} data-slot="playback" className={className}>
      <TimebaseProvider timebase={timebase}>
        <OutlineProvider outline={outline}>{children}</OutlineProvider>
      </TimebaseProvider>
    </div>
  );
}
