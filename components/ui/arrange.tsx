"use client";

import * as React from "react";
import {
  type BentoSize,
  breakRows,
  laneCount,
  pack,
  placeLane,
  TOLERANCE,
} from "@/lib/layouts";
import { cn } from "@/lib/utils";

// THINGS ARRANGED: any cards, in the page's flow, placed by one of the registry's
// arrangements (`layouts`). What a cell holds is the consumer's (a quote, a post, a
// card-link, a picture); the arrangement never knows, and a cell never knows which
// arrangement it is in, so the same cards go into lanes on a feed and a plain grid on a
// shelf. What a layout needs to know about a cell is a fact about what the cell holds,
// said on `ArrangeCell`: its `size` in a bento's cells, its `aspect` in justified rows.
//
//   lanes      masonry: every cell at the lane's width, placed by its real height with
//              the lanes rule (`placeLane`: the lane whose bottom is highest, lanes
//              within a tolerance counted level and taken in reading order, so a level
//              stretch reads 1 2 3 / 4 5 6 and only a clearly shorter lane pulls a cell
//              out of order)
//   grid       rows of equal lanes, each row as tall as its tallest cell
//   bento      an ordered bento (`pack`): rows of one height, cells of one, two side by
//              side or two by two (`size`), every cell aligned to the rows, none
//              stretched; two or three columns, and one lane (a phone) is no bento,
//              every cell at its natural height in the set's order
//   justified  rows filled edge to edge (`breakRows`, loom's greedy rows): every cell at
//              its `aspect`, every row as tall as fills the width, toward `rowHeight`,
//              the last row never taller
//
// THE LANE IS THE UNIT (lanes, grid, bento): `laneWidth` is the width a lane should
// have, and as many fit as do (the same count CSS's auto-fill gives, `laneCount`; a
// bento takes at most three), so one number holds on a phone (one lane, the cells
// flowing) and on a wide screen, with no breakpoints. A justified row's unit is its
// height. The gap is the container's own (`gap-*` in its className).
//
// PLACED BEFORE THE FIRST PAINT: lanes need the cells' heights and every layout the
// container's width, which exist only in the page, so the first placement is an inline
// script right after the container, run while the page is still parsing; nothing moves
// once shown. It is `lay` below, given the rules its layout needs as arguments, each
// inlined as its own source (all of them self-contained), so the rule the script runs
// is the one the library runs. After hydration the same `lay` runs again on every
// render, whenever the container changes size, and in lanes whenever a cell does
// (fonts arriving, an image, a comment loading). Without JavaScript the cells stand in
// the grid CSS draws from the same numbers (justified: wrapped rows, each cell grown in
// proportion to its aspect).
//
// WHAT `lay` WRITES is only what React does not render: styles, `hidden`, `data-first`
// on the first cell shown, and in a bento drawn in columns `data-bento` on the
// container and `data-across` on a cell that takes the whole row, so what a cell holds
// can follow (`in-data-bento:`, `in-data-across:`).
//
// A FILTER IN THE ADDRESS: `filter="tag"` shows only the cells whose `tags` hold the
// address's `?tag=`, from the first paint (the script reads it too), and
// `setArrangeFilter("tag", "ai")` changes it in place (replacing the history entry).
// Read through useSyncExternalStore, never useSearchParams, which in a static page makes
// everything up to its Suspense boundary render on the client only. A filter of the
// consumer's own (a search) is a cell's `hidden`, and where it ranks what it found is
// a cell's `order`: the cells stay mounted and in place in the document, so what they
// hold keeps its state (a switch flipped, a video playing).

export type ArrangeLayout = "lanes" | "grid" | "bento" | "justified";

type Lay = {
  layout: ArrangeLayout;
  laneWidth: number;
  rowHeight: number;
  tolerance: number;
  filter: string | null;
};

/** The rules a layout places by, inlined into the page as their own source. */
type Rules = {
  count?: typeof laneCount;
  place?: typeof placeLane;
  pack?: typeof pack;
  rows?: typeof breakRows;
};

const RULES: Record<ArrangeLayout, Rules> = {
  lanes: { count: laneCount, place: placeLane },
  grid: {},
  bento: { count: laneCount, pack },
  justified: { rows: breakRows },
};

/** Places the container's cells. Self-contained, no name from outside it: it is
 *  inlined into the page as its own source. Every placement starts from the cells as
 *  React drew them, so a change of layout leaves nothing of the last one behind. */
function lay(container: HTMLElement, rules: Rules, o: Lay): void {
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
  for (const p of [
    "display",
    "height",
    "grid-template-columns",
    "grid-auto-rows",
    "align-items",
  ])
    container.style.removeProperty(p);
  container.toggleAttribute("data-bento", false);
  for (const cell of cells) {
    for (const p of [
      "position",
      "top",
      "left",
      "width",
      "height",
      "transform",
      "order",
      "grid-column",
      "grid-row",
    ])
      cell.style.removeProperty(p);
    cell.toggleAttribute("data-across", false);
    cell.toggleAttribute("data-first", false);
  }
  const shown = cells
    .map((cell, i) => {
      const at =
        cell.dataset.order === undefined ? i : Number(cell.dataset.order);
      if (!Number.isFinite(at))
        throw new Error(`arrange: a cell's order is ${cell.dataset.order}`);
      return { cell, at };
    })
    .filter(({ cell }) => {
      const on =
        cell.dataset.hidden === undefined &&
        (!wanted ||
          (JSON.parse(cell.dataset.tags ?? "[]") as string[]).includes(wanted));
      cell.hidden = !on;
      return on;
    })
    .sort((a, b) => a.at - b.at)
    .map(({ cell }) => cell);
  shown[0]?.toggleAttribute("data-first", true);
  const width = container.clientWidth;
  /** In the grid CSS draws, in the arrangement's order. */
  const flow = () => {
    shown.forEach((cell, n) => {
      cell.style.order = String(n);
    });
  };

  if (o.layout === "grid") {
    flow();
    return;
  }

  if (o.layout === "justified") {
    if (!rules.rows)
      throw new Error("arrange: justified without its rows rule");
    const aspects = shown.map((cell) => {
      const a = Number(cell.dataset.aspect);
      if (!(a > 0) || !Number.isFinite(a))
        throw new Error(
          `arrange: a justified cell needs its aspect, width over height (${cell.dataset.aspect})`,
        );
      return a;
    });
    container.style.display = "block";
    let top = 0;
    let start = 0;
    for (const { end, height } of rules.rows(
      aspects,
      width,
      o.rowHeight,
      gapX,
    )) {
      let x = 0;
      for (let j = start; j < end; j++) {
        const cell = shown[j] as HTMLElement;
        const w = (aspects[j] as number) * height;
        cell.style.position = "absolute";
        cell.style.top = "0";
        cell.style.left = "0";
        cell.style.width = `${w}px`;
        cell.style.height = `${height}px`;
        cell.style.transform = `translate(${x}px, ${top}px)`;
        x += w + gapX;
      }
      top += height + gapY;
      start = end;
    }
    container.style.height = `${Math.max(0, top - gapY)}px`;
    return;
  }

  if (!rules.count) throw new Error(`arrange: ${o.layout} without laneCount`);
  const lanes = rules.count(width, o.laneWidth, gapX);

  if (o.layout === "bento") {
    if (!rules.pack) throw new Error("arrange: bento without pack");
    const cols = Math.min(3, lanes);
    if (cols === 1) {
      flow();
      return;
    }
    const sizes = shown.map((cell) => {
      const size = cell.dataset.size ?? "card";
      if (size !== "card" && size !== "wide" && size !== "large")
        throw new Error(`arrange: a bento cell's size is ${size}`);
      return size as BentoSize;
    });
    const packed = rules.pack(sizes, cols as 2 | 3);
    container.toggleAttribute("data-bento", true);
    container.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    container.style.gridAutoRows = `minmax(${o.rowHeight}px, auto)`;
    container.style.alignItems = "stretch";
    shown.forEach((cell, n) => {
      cell.style.order = String(packed.order[n]);
      if (packed.across[n]) {
        cell.style.gridColumn = `span ${cols}`;
        cell.toggleAttribute("data-across", true);
      } else if (sizes[n] !== "card") cell.style.gridColumn = "span 2";
      if (sizes[n] === "large") cell.style.gridRow = "span 2";
    });
    return;
  }

  if (!rules.place) throw new Error("arrange: lanes without placeLane");
  if (lanes === 1) {
    flow();
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
    const l = (rules.place as typeof placeLane)(bottoms, cursor, o.tolerance);
    cell.style.transform = `translate(${l * (lane + gapX)}px, ${(bottoms[l] ?? 0) * lane}px)`;
    bottoms[l] = (bottoms[l] ?? 0) + ((heights[i] ?? 0) + gapY) / lane;
    cursor = l + 1;
  });
  container.style.height = `${Math.max(0, Math.max(...bottoms) * lane - gapY)}px`;
}

/** The rules' source, as the inline script passes them to `lay`. */
const rulesSource = (rules: Rules) =>
  `{${Object.entries(rules)
    .map(([name, rule]) => `${name}:${rule}`)
    .join(",")}}`;

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

type Shared = {
  /** The address's parameter whose value a cell's `tags` must hold to be shown. */
  filter?: string;
  className?: string;
  children: React.ReactNode;
};

export type ArrangeProps = Shared &
  (
    | {
        layout?: "lanes";
        /** The width a lane should have, css px: as many lanes fit as do. */
        laneWidth: number;
        /** How close two lanes count as level, a share of the lane's width. */
        tolerance?: number;
      }
    | {
        layout: "grid";
        /** The width a lane should have, css px: as many lanes fit as do. */
        laneWidth: number;
      }
    | {
        layout: "bento";
        /** The width a column should have, css px: as many fit as do, at most three. */
        laneWidth: number;
        /** A row's height, css px, the height of a one-cell card; a row grows only
         *  when what a cell holds needs more. */
        rowHeight: number;
      }
    | {
        layout: "justified";
        /** The height rows are filled toward, css px: a full row is at most this
         *  tall, the last row never taller. */
        rowHeight: number;
      }
  );

export function Arrange(props: ArrangeProps) {
  const { filter, className, children } = props;
  const layout = props.layout ?? "lanes";
  const ref = React.useRef<HTMLDivElement>(null);
  const observer = React.useRef<ResizeObserver | null>(null);
  // Subscribed so a filter set elsewhere renders this, which lays out again below.
  useArrangeFilter(filter ?? "");
  const laneWidth = "laneWidth" in props ? props.laneWidth : 0;
  const rowHeight = "rowHeight" in props ? props.rowHeight : 0;
  const key = JSON.stringify({
    layout,
    laneWidth,
    rowHeight,
    tolerance:
      ("tolerance" in props ? props.tolerance : undefined) ?? TOLERANCE,
    filter: filter ?? null,
  } satisfies Lay);
  const rules = RULES[layout];

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
        lay(container, rules, JSON.parse(key) as Lay),
      );
    });
    watch.observe(container);
    observer.current = watch;
    return () => {
      cancelAnimationFrame(frame);
      watch.disconnect();
      observer.current = null;
    };
  }, [key, rules]);

  // Every render: a cell added, removed, hidden or ranked, a filter set. Measuring n
  // cells is cheap. Only lanes place by a cell's height, so only lanes watch every cell,
  // a new one included (observing twice is a no-op).
  React.useLayoutEffect(() => {
    const container = ref.current;
    if (!container) throw new Error("arrange: no container to lay out");
    lay(container, rules, JSON.parse(key) as Lay);
    if (layout === "lanes")
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
          layout === "justified"
            ? "relative flex flex-wrap"
            : "relative grid grid-cols-[repeat(auto-fill,minmax(min(var(--ag-arrange-lane),100%),1fr))] items-start",
          className,
        )}
        style={
          layout === "justified"
            ? ({ "--ag-arrange-row": `${rowHeight}px` } as React.CSSProperties)
            : ({ "--ag-arrange-lane": `${laneWidth}px` } as React.CSSProperties)
        }
      >
        {children}
      </div>
      <script
        // The server's and the client's bundles print the functions differently.
        suppressHydrationWarning
        // biome-ignore lint/security/noDangerouslySetInnerHtml: our own functions, as source
        dangerouslySetInnerHTML={{
          __html: `(${lay})(document.currentScript.previousElementSibling,${rulesSource(rules)},${key})`,
        }}
      />
    </>
  );
}

/** Without JavaScript, a justified cell in the wrapped rows CSS draws: as wide as its
 *  aspect at the row's height, grown in proportion to its aspect, so a row's cells
 *  share one height. The basis is the one product left to CSS: the aspect is the
 *  cell's and the row's height the container's, and only the page has both. */
const JUSTIFIED_FALLBACK =
  "[[data-layout=justified]>&]:aspect-(--ag-arrange-aspect) [[data-layout=justified]>&]:grow-(--ag-arrange-aspect) [[data-layout=justified]>&]:basis-[calc(var(--ag-arrange-aspect)*var(--ag-arrange-row))]";

/** One cell of an arrangement: what it holds is anything. The first cell shown
 *  carries `data-first` (a divider drawn above every cell but the first:
 *  `[[data-first]>&]:hidden`). */
export function ArrangeCell({
  tags,
  size,
  aspect,
  hidden,
  order,
  className,
  children,
}: {
  /** What an address filter (`Arrange`'s `filter`) matches. */
  tags?: readonly string[];
  /** Bento: the cells it takes, one (`card`, the default), two side by side and no
   *  taller (`wide`) or two by two (`large`). */
  size?: BentoSize;
  /** Justified: the cell's shape, its width over its height (a picture's own, or
   *  layouts' `clampAspect` of it to keep a panorama from becoming a sliver); what it
   *  holds fills the cell. */
  aspect?: number;
  /** Left out by a filter of the consumer's own: still mounted, its state kept, and
   *  the rest close up. */
  hidden?: boolean;
  /** Its place in the arrangement when that is not its place among the children (a
   *  search showing what it names first), so nothing moves in the document; equal
   *  places keep the children's order. */
  order?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="arrange-cell"
      data-tags={tags ? JSON.stringify(tags) : undefined}
      data-size={size}
      data-aspect={aspect}
      data-hidden={hidden || undefined}
      data-order={order}
      suppressHydrationWarning
      className={cn(aspect !== undefined && JUSTIFIED_FALLBACK, className)}
      style={
        aspect === undefined
          ? undefined
          : ({ "--ag-arrange-aspect": aspect } as React.CSSProperties)
      }
    >
      {children}
    </div>
  );
}
