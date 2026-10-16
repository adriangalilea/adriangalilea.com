// HOW A SET OF THINGS IS ARRANGED, framework-free: the rules every arrangement in the
// registry places by, whatever it holds (pictures in the gallery, cards in a feed, a
// shelf of examples). Nothing here knows what an item is; a component measures or
// knows the items' shapes and hands them in.
//
// THE LANES RULE is one decision, `placeLane`, made by everything that places in lanes:
// the rect engine below for items whose aspect is known (pictures), and arrange's
// layout for items measured in the page (cards), which runs it before the first paint
// as an inline script of its own source. It is self-contained for that reason: no name
// from outside it.
//
// The rect engines. In: every item's aspect (width over height) in set order, and a
// width. Out: one rect per item, in set order, plus what a grid needs to move around
// them (which lane or row each sits in, the neighbour above and below, a window of what
// a viewport shows). Two engines behind one interface, so the grid, the keyboard,
// selection and virtualization never know which drew the rects:
//
// LANES (the default) is the CSS Grid Lanes placement rule with a tolerance and a
// sweeping cursor: an item goes to the lane with the least running bottom, every lane
// within `tolerance` of that minimum counts as tied, and among tied lanes it takes the
// first one at or after the cursor (the lane after the previous item's), else the
// first. So a level stretch reads 1 2 3 / 4 5 6, and only a lane that is clearly the
// shortest (a whole hole, more than the tolerance) pulls an item out of reading order.
//
// Every DECISION is made in units of the lane width: a height is 1 / aspect, the
// tolerance is a share of the lane, the gap is converted at the lane count's reference
// width (where a lane is exactly `laneWidth`). The decisions are therefore the same at
// every container width that keeps the lane count: resizing scales pixels and never
// moves an item to another lane. The PIXELS are then laid with the real gap.
//
// JUSTIFIED is loom's greedy rows: fill a row until its exact-fit height drops to the
// target, emit it, repeat; the last row never stretches past the target.
//
// Both are prefix-stable: an item's rect depends only on the items before it, so
// appending a page never moves an earlier item (justified excepted for its last row,
// which re-breaks; the price of rows).

export type Engine = "lanes" | "justified";

/** The narrowest and widest aspect a cell is drawn at: a panorama never becomes a
 *  sliver, a tall screenshot never owns a screen. The cell crops to it. */
export const ASPECT_MIN = 0.5;
export const ASPECT_MAX = 2.4;
/** The default tolerance, a share of the lane width: lanes this close count as level. */
export const TOLERANCE = 0.15;
export const LANE_WIDTH = 240;
export const ROW_HEIGHT = 200;
export const GAP = 8;

export interface LayoutOptions {
  engine?: Engine;
  /** The container's inner width, css px. */
  width: number;
  /** Lanes: the target lane width; the count is how many fit. */
  laneWidth?: number;
  /** Justified: the target row height. */
  rowHeight?: number;
  gap?: number;
  /** Lanes: how close two lanes must be to count as level, as a share of the lane. */
  tolerance?: number;
  clamp?: readonly [min: number, max: number];
}

export interface Layout {
  engine: Engine;
  width: number;
  count: number;
  x: Float64Array;
  y: Float64Array;
  w: Float64Array;
  h: Float64Array;
  /** The lane an item sits in (lanes) or its row (justified). */
  line: Int32Array;
  /** How many lanes, or rows. */
  lines: number;
  /** The item drawn directly above / below in the same lane; -1 at the ends. Lanes
   *  only (rows find their neighbour by x, `step`). */
  above: Int32Array;
  below: Int32Array;
  /** Justified: where each row starts, `lines + 1` long. Lanes: empty. */
  rowStart: Int32Array;
  /** The whole content's height. */
  height: number;
  /** The running maximum of tops and the running minimum of tops from the end: both
   *  sorted, so a viewport's window is two binary searches (`windowOf`). */
  topMax: Float64Array;
  bottomMin: Float64Array;
  tallest: number;
}

export function clampAspect(
  aspect: number,
  clamp: readonly [number, number] = [ASPECT_MIN, ASPECT_MAX],
): number {
  if (!(aspect > 0) || !Number.isFinite(aspect))
    throw new Error(`layouts: aspect ${aspect} is not a positive number`);
  return Math.min(clamp[1], Math.max(clamp[0], aspect));
}

/** How many lanes of about `laneWidth` fit: at least one. Self-contained, like
 *  `placeLane`: arrange inlines its source into the page. */
export function laneCount(width: number, laneWidth: number, gap: number) {
  return Math.max(1, Math.floor((width + gap) / (laneWidth + gap)));
}

/** THE RULE, one decision: which lane the next item takes, given every lane's running
 *  bottom, the cursor (the lane after the previous item's) and the tolerance, all in
 *  one unit. The tied lanes are those within `tolerance` of the lowest bottom; the
 *  item takes the first tied lane at or after the cursor, else the first tied lane.
 *  Self-contained (no name from outside it): arrange inlines its source into the page
 *  to place cards before the first paint. */
export function placeLane(
  bottoms: ArrayLike<number>,
  cursor: number,
  tolerance: number,
): number {
  let m = Number.POSITIVE_INFINITY;
  for (let l = 0; l < bottoms.length; l++)
    m = Math.min(m, bottoms[l] as number);
  // A float's 1.1 + 0.15 must still admit 1.25: the epsilon is far below a pixel.
  const ceiling = m + tolerance + 1e-9;
  let first = -1;
  for (let l = 0; l < bottoms.length; l++) {
    if ((bottoms[l] as number) > ceiling) continue;
    if (first < 0) first = l;
    if (l >= cursor) return l;
  }
  return first;
}

function empty(engine: Engine, width: number, count: number): Layout {
  return {
    engine,
    width,
    count,
    x: new Float64Array(count),
    y: new Float64Array(count),
    w: new Float64Array(count),
    h: new Float64Array(count),
    line: new Int32Array(count),
    lines: 0,
    above: new Int32Array(count).fill(-1),
    below: new Int32Array(count).fill(-1),
    rowStart: new Int32Array(0),
    height: 0,
    topMax: new Float64Array(count),
    bottomMin: new Float64Array(count),
    tallest: 0,
  };
}

function finish(out: Layout): Layout {
  let max = Number.NEGATIVE_INFINITY;
  let bottom = 0;
  let tallest = 0;
  for (let i = 0; i < out.count; i++) {
    max = Math.max(max, out.y[i] as number);
    out.topMax[i] = max;
    bottom = Math.max(bottom, (out.y[i] as number) + (out.h[i] as number));
    tallest = Math.max(tallest, out.h[i] as number);
  }
  let min = Number.POSITIVE_INFINITY;
  for (let i = out.count - 1; i >= 0; i--) {
    min = Math.min(min, out.y[i] as number);
    out.bottomMin[i] = min;
  }
  out.height = bottom;
  out.tallest = tallest;
  return out;
}

/** Lanes: the grid-lanes rule, decided in lane units, laid in pixels. */
export function layoutLanes(
  aspects: ArrayLike<number>,
  options: LayoutOptions,
): Layout {
  const gap = options.gap ?? GAP;
  const target = options.laneWidth ?? LANE_WIDTH;
  const tolerance = options.tolerance ?? TOLERANCE;
  const width = Math.max(0, options.width);
  const n = laneCount(width, target, gap);
  const lane = (width - (n - 1) * gap) / n;
  const gapUnits = gap / target;
  const out = empty("lanes", width, aspects.length);
  out.lines = n;
  const units = new Float64Array(n);
  const pixels = new Float64Array(n);
  const last = new Int32Array(n).fill(-1);
  let cursor = 0;
  for (let i = 0; i < aspects.length; i++) {
    const a = clampAspect(aspects[i] as number, options.clamp);
    const l = placeLane(units, cursor, tolerance);
    const h = lane / a;
    out.x[i] = l * (lane + gap);
    out.y[i] = pixels[l] as number;
    out.w[i] = lane;
    out.h[i] = h;
    out.line[i] = l;
    const prev = last[l] as number;
    if (prev >= 0) {
      out.above[i] = prev;
      out.below[prev] = i;
    }
    last[l] = i;
    units[l] = (units[l] as number) + 1 / a + gapUnits;
    pixels[l] = (pixels[l] as number) + h + gap;
    cursor = l + 1;
  }
  return finish(out);
}

/** Justified rows: loom's greedy fill, the last row at most the target height. */
export function layoutJustified(
  aspects: ArrayLike<number>,
  options: LayoutOptions,
): Layout {
  const gap = options.gap ?? GAP;
  const target = options.rowHeight ?? ROW_HEIGHT;
  const width = Math.max(0, options.width);
  const out = empty("justified", width, aspects.length);
  const starts: number[] = [];
  let top = 0;
  let start = 0;
  let sum = 0;
  const emit = (end: number, h: number) => {
    let x = 0;
    for (let j = start; j < end; j++) {
      const a = clampAspect(aspects[j] as number, options.clamp);
      out.x[j] = x;
      out.y[j] = top;
      out.w[j] = a * h;
      out.h[j] = h;
      out.line[j] = starts.length;
      x += a * h + gap;
    }
    starts.push(start);
    top += h + gap;
    start = end;
    sum = 0;
  };
  for (let i = 0; i < aspects.length; i++) {
    sum += clampAspect(aspects[i] as number, options.clamp);
    const h = (width - gap * (i - start)) / sum;
    if (h <= target) emit(i + 1, h);
  }
  if (start < aspects.length)
    emit(
      aspects.length,
      Math.min(target, (width - gap * (aspects.length - 1 - start)) / sum),
    );
  starts.push(aspects.length);
  out.lines = starts.length - 1;
  out.rowStart = Int32Array.from(starts);
  return finish(out);
}

export function layout(
  aspects: ArrayLike<number>,
  options: LayoutOptions,
): Layout {
  return (options.engine ?? "lanes") === "lanes"
    ? layoutLanes(aspects, options)
    : layoutJustified(aspects, options);
}

/** The first index whose value is >= v in a non-decreasing array. */
function lowerBound(a: Float64Array, v: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((a[mid] as number) < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Every item intersecting the band [top, bottom), in set order. Two binary searches
 *  bound the candidates (no item before `lo` reaches the band, none from `hi` starts
 *  above its end), then each is tested. */
export function visible(out: Layout, top: number, bottom: number): number[] {
  const lo = lowerBound(out.topMax, top - out.tallest);
  const hi = lowerBound(out.bottomMin, bottom);
  const found: number[] = [];
  for (let i = lo; i < hi; i++) {
    const y = out.y[i] as number;
    if (y < bottom && y + (out.h[i] as number) > top) found.push(i);
  }
  return found;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Every item a rectangle touches (a marquee), in set order. */
export function inArea(out: Layout, area: Rect): number[] {
  return visible(out, area.y, area.y + area.h).filter((i) => {
    const x = out.x[i] as number;
    return x < area.x + area.w && x + (out.w[i] as number) > area.x;
  });
}

export type Direction = "left" | "right" | "up" | "down";

/** Where an arrow goes from `index`. Left and right walk the set order (reading
 *  order). Up and down stay in the lane (lanes) or take the item of the next row
 *  nearest `goal`, the x the hand is keeping (justified), so a column of presses does
 *  not drift. Returns the same index at an end, and the goal to keep. */
export function step(
  out: Layout,
  index: number,
  direction: Direction,
  goal?: number,
): { index: number; goal: number } {
  const center = (i: number) => (out.x[i] as number) + (out.w[i] as number) / 2;
  if (out.count === 0) return { index: -1, goal: 0 };
  if (direction === "left" || direction === "right") {
    const next = Math.min(
      out.count - 1,
      Math.max(0, index + (direction === "left" ? -1 : 1)),
    );
    return { index: next, goal: center(next) };
  }
  const keep = goal ?? center(index);
  if (out.engine === "lanes") {
    const next = (direction === "up" ? out.above : out.below)[index] as number;
    return { index: next < 0 ? index : next, goal: keep };
  }
  const row = (out.line[index] as number) + (direction === "up" ? -1 : 1);
  if (row < 0 || row >= out.lines) return { index, goal: keep };
  let best = out.rowStart[row] as number;
  for (let j = best; j < (out.rowStart[row + 1] as number); j++)
    if (Math.abs(center(j) - keep) < Math.abs(center(best) - keep)) best = j;
  return { index: best, goal: keep };
}

/** A viewport at a time: the item in the same lane (or nearest `goal` in a row) whose
 *  top is nearest `distance` px above or below this one's. */
export function page(
  out: Layout,
  index: number,
  direction: "up" | "down",
  distance: number,
  goal?: number,
): { index: number; goal: number } {
  const want =
    (out.y[index] as number) + (direction === "up" ? -1 : 1) * distance;
  let at = {
    index,
    goal: goal ?? (out.x[index] as number) + (out.w[index] as number) / 2,
  };
  for (;;) {
    const next = step(out, at.index, direction, at.goal);
    if (next.index === at.index) return at;
    const before = Math.abs((out.y[at.index] as number) - want);
    if (Math.abs((out.y[next.index] as number) - want) > before) return at;
    at = next;
  }
}

/** The item whose rect is nearest a point's y (for holding the view still across a
 *  reflow: the cell nearest the viewport's upper third). */
export function nearest(out: Layout, y: number): number {
  let best = -1;
  let gapTo = Number.POSITIVE_INFINITY;
  for (const i of visible(out, y - out.tallest, y + out.tallest)) {
    const top = out.y[i] as number;
    const d =
      y < top
        ? top - y
        : y > top + (out.h[i] as number)
          ? y - top - (out.h[i] as number)
          : 0;
    if (d < gapTo) {
      gapTo = d;
      best = i;
    }
  }
  return best;
}

// AN ORDERED BENTO: cards of three sizes on a grid of equal rows, every card aligned to
// it, nothing stretched, no free masonry. One cell (a small example), two side by side
// and no taller ("wide": a strip, a table), two by two ("large": a player, a
// terminal). A card keeps its cells at two columns and at three, so what it holds is
// judged against one box; only the order changes, which `pack` gives for the grid's own
// auto-placement (sparse, so the order is the one given). One column (a phone) is no
// bento: every card in the set's order, at its natural height.
//
//   2 columns  a wide card the whole row, a large one the whole width and two rows,
//              single cells in pairs
//   3 columns  a wide card and one single make a row; a large card and two singles
//              stacked beside it make two; singles in threes
//
// The set's order is kept as far as that allows: a wide or large card takes the
// singles waiting before it, then the next ones after it. Two cards two cells wide
// never share a row of three, so a set of more large cards than pairs of singles
// would leave a column empty beside each of the rest: a wide or large card with no
// single left at all takes the whole row instead (`across`), as both do at two
// columns.

/** The cells a card spans: one, two across, two by two. */
export type BentoSize = "card" | "wide" | "large";

/** Where `pack` puts the cards, each by its index in `sizes`: its place in the order,
 *  and whether it spans the whole row (three columns only). */
export type Packed = { order: number[]; across: boolean[] };

export function pack(sizes: BentoSize[], cols: 2 | 3): Packed {
  const across = sizes.map(() => false);
  const used = new Set<number>();
  /** The next single not placed yet, in the set's order. */
  const single = () => {
    const at = sizes.findIndex((s, i) => !used.has(i) && s === "card");
    if (at === -1) return undefined;
    used.add(at);
    return at;
  };
  /** `n` singles: the waiting ones first, then the next ones. */
  const singles = (waiting: number[], n: number) => {
    const got = waiting.splice(0, n);
    while (got.length < n) {
      const next = single();
      if (next === undefined) break;
      got.push(next);
    }
    return got;
  };
  const sequence: number[] = [];
  let row: number[] = [];
  sizes.forEach((size, i) => {
    if (used.has(i)) return;
    used.add(i);
    if (size === "card") {
      row.push(i);
      if (row.length === cols) {
        sequence.push(...row);
        row = [];
      }
      return;
    }
    if (cols === 2) {
      // The whole width: an unpaired single is paired first, or waits for a row.
      const pair = row.length === 1 ? singles(row, 2) : [];
      if (pair.length === 1) row.push(...pair);
      else sequence.push(...pair);
      sequence.push(i);
      return;
    }
    // Three columns: the singles that fill the rest of its rows; with none left at
    // all, the whole row. One single beside a large card stays beside it (one cell
    // empty under it): sent to a row of its own it would leave two.
    const beside = singles(row, size === "wide" ? 1 : 2);
    if (beside.length === 0) across[i] = true;
    sequence.push(i, ...beside);
  });
  sequence.push(...row);
  const order = new Array<number>(sizes.length);
  sequence.forEach((i, n) => {
    order[i] = n;
  });
  return { order, across };
}
