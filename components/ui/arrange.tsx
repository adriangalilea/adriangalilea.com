"use client";

import * as React from "react";
import { laneCount, placeLane } from "@/lib/layouts";
import { cn } from "@/lib/utils";

// THINGS ARRANGED: any cards, in the page's flow, placed by one of the registry's
// arrangements (`layouts`). What a cell holds is the consumer's (a quote, a post, a
// card-link); the arrangement never knows, and a cell never knows which arrangement it
// is in, so the same cards go into lanes on a feed and a plain grid on a shelf.
//
//   lanes  masonry: every cell at the lane's width, placed by its real height with the
//          lanes rule (`placeLane`: the lane whose bottom is highest, lanes within a
//          tolerance counted level and taken in reading order, so a level stretch reads
//          1 2 3 / 4 5 6 and only a clearly shorter lane pulls a cell out of order)
//   grid   rows of equal lanes, each row as tall as its tallest cell
//
// THE LANE IS THE UNIT: `laneWidth` is the width a lane should have, and as many fit as
// do (the same count CSS's auto-fill gives, `laneCount`), so one number holds on a
// phone (one lane, the cells flowing) and on a wide screen, with no breakpoints. The
// gap is the container's own (`gap-*` in its className).
//
// PLACED BEFORE THE FIRST PAINT: lanes need the cells' heights, which exist only in the
// page, so the first placement is an inline script right after the container, run while
// the page is still parsing; nothing moves once shown. It is `lay` below, given
// `laneCount` and `placeLane` as arguments, each inlined as its own source (all three
// self-contained), so the rule the script runs is the one the library runs. After
// hydration the same `lay` runs again whenever a cell or the container changes size
// (fonts arriving, an image, a comment loading, a resize) and when the filter changes.
// Without JavaScript the cells stand in the grid CSS draws from the same numbers.
//
// A FILTER IN THE ADDRESS: `filter="tag"` shows only the cells whose `tags` hold the
// address's `?tag=`, from the first paint (the script reads it too), and
// `setArrangeFilter("tag", "ai")` changes it in place (replacing the history entry).
// Read through useSyncExternalStore, never useSearchParams, which in a static page makes
// everything up to its Suspense boundary render on the client only.

export type ArrangeLayout = "lanes" | "grid";

type Lay = {
  masonry: boolean;
  laneWidth: number;
  tolerance: number;
  filter: string | null;
};

/** Places the container's cells. Self-contained, no name from outside it: it is
 *  inlined into the page as its own source. Writes only what React does not render:
 *  styles, `hidden`, `data-first` on the first cell shown. */
function lay(
  container: HTMLElement,
  count: (width: number, laneWidth: number, gap: number) => number,
  place: (bottoms: number[], cursor: number, tolerance: number) => number,
  o: Lay,
): void {
  const style = getComputedStyle(container);
  const gapX = Number.parseFloat(style.columnGap) || 0;
  const gapY = Number.parseFloat(style.rowGap) || 0;
  const wanted =
    o.filter === null
      ? null
      : new URLSearchParams(window.location.search).get(o.filter);
  const cells = Array.from(container.children) as HTMLElement[];
  for (const cell of cells)
    if (cell.dataset.slot !== "arrange-cell")
      throw new Error(
        `arrange: a child is not an ArrangeCell (${cell.tagName})`,
      );
  const shown = cells.filter((cell) => {
    const on =
      !wanted ||
      (JSON.parse(cell.dataset.tags ?? "[]") as string[]).includes(wanted);
    cell.hidden = !on;
    cell.toggleAttribute("data-first", false);
    return on;
  });
  shown[0]?.toggleAttribute("data-first", true);
  const width = container.clientWidth;
  const lanes = count(width, o.laneWidth, gapX);
  if (!o.masonry || lanes === 1) {
    container.style.display = "";
    container.style.height = "";
    for (const cell of cells) {
      cell.style.position = "";
      cell.style.width = "";
      cell.style.transform = "";
    }
    return;
  }
  const lane = (width - gapX * (lanes - 1)) / lanes;
  container.style.display = "block";
  for (const cell of shown) {
    cell.style.position = "absolute";
    cell.style.top = "0";
    cell.style.left = "0";
    cell.style.width = `${lane}px`;
  }
  // Decided in lane units, as the library decides: a height is a share of the lane.
  const heights = shown.map((cell) => cell.getBoundingClientRect().height);
  const bottoms: number[] = new Array(lanes).fill(0);
  let cursor = 0;
  shown.forEach((cell, i) => {
    const l = place(bottoms, cursor, o.tolerance);
    cell.style.transform = `translate(${l * (lane + gapX)}px, ${(bottoms[l] ?? 0) * lane}px)`;
    bottoms[l] = (bottoms[l] ?? 0) + ((heights[i] ?? 0) + gapY) / lane;
    cursor = l + 1;
  });
  container.style.height = `${Math.max(0, Math.max(...bottoms) * lane - gapY)}px`;
}

const CHANGE = "ag-arrange-filter";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("popstate", onChange);
  };
}

/** The address's `?<param>=`: null on the server and while hydrating (a static page is
 *  the same for every query), the address's right after. */
export function useArrangeFilter(param: string): string | null {
  return React.useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(param),
    () => null,
  );
}

/** Sets the address's `?<param>=` in place, replacing the history entry, so Back
 *  leaves the page rather than stepping through filters. */
export function setArrangeFilter(param: string, value: string | null): void {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(param, value);
  else url.searchParams.delete(param);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(CHANGE));
}

export function Arrange({
  layout = "lanes",
  laneWidth,
  tolerance = 0.15,
  filter,
  className,
  children,
}: {
  layout?: ArrangeLayout;
  /** The width a lane should have, css px: as many lanes fit as do. */
  laneWidth: number;
  /** Lanes: how close two lanes count as level, a share of the lane's width. */
  tolerance?: number;
  /** The address's parameter whose value a cell's `tags` must hold to be shown. */
  filter?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const observer = React.useRef<ResizeObserver | null>(null);
  // Subscribed so a filter set elsewhere renders this, which lays out again below.
  useArrangeFilter(filter ?? "");
  const key = JSON.stringify({
    masonry: layout === "lanes",
    laneWidth,
    tolerance,
    filter: filter ?? null,
  } satisfies Lay);

  // Sizes change after layout (fonts, images, comments, a resize). Laying out again
  // from the observer's own callback would resize what it observes inside it, so the
  // next frame does it.
  React.useLayoutEffect(() => {
    const container = ref.current;
    if (!container) throw new Error("arrange: no container to observe");
    let frame = 0;
    const watch = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        lay(container, laneCount, placeLane, JSON.parse(key) as Lay),
      );
    });
    watch.observe(container);
    observer.current = watch;
    return () => {
      cancelAnimationFrame(frame);
      watch.disconnect();
      observer.current = null;
    };
  }, [key]);

  // Every render: a cell added or removed, a filter set. Measuring n cells is cheap;
  // every cell is watched, a new one included (observing twice is a no-op).
  React.useLayoutEffect(() => {
    const container = ref.current;
    if (!container) throw new Error("arrange: no container to lay out");
    lay(container, laneCount, placeLane, JSON.parse(key) as Lay);
    for (const cell of Array.from(container.children))
      observer.current?.observe(cell);
  });

  return (
    <>
      <div
        ref={ref}
        data-slot="arrange"
        data-layout={layout}
        suppressHydrationWarning
        className={cn(
          "relative grid grid-cols-[repeat(auto-fill,minmax(min(var(--ag-arrange-lane),100%),1fr))] items-start",
          className,
        )}
        style={{ "--ag-arrange-lane": `${laneWidth}px` } as React.CSSProperties}
      >
        {children}
      </div>
      <script
        // The server's and the client's bundles print the functions differently.
        suppressHydrationWarning
        // biome-ignore lint/security/noDangerouslySetInnerHtml: our own functions, as source
        dangerouslySetInnerHTML={{
          __html: `(${lay})(document.currentScript.previousElementSibling,${laneCount},${placeLane},${key})`,
        }}
      />
    </>
  );
}

/** One cell of an arrangement: what it holds is anything. `tags` are what a filter
 *  matches. The first cell shown carries `data-first` (a divider drawn above every
 *  cell but the first: `[[data-first]>&]:hidden`). */
export function ArrangeCell({
  tags,
  className,
  children,
}: {
  tags?: readonly string[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="arrange-cell"
      data-tags={tags ? JSON.stringify(tags) : undefined}
      suppressHydrationWarning
      className={className}
    >
      {children}
    </div>
  );
}
