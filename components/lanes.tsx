"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";
import { useTag } from "@/components/tag-query";

// THE FEED'S MASONRY: every card rendered ONCE, in date order, and placed in lanes by
// its real height. It used to be rendered four times (a list for phones and a 2, 3 and
// 4 column split, three of them hidden by CSS) and split by guessed heights, so the
// home page was 3.8 MB of HTML and the lanes ran uneven wherever a guess was wrong.
//
// How many lanes is CSS's (`--lanes`, by breakpoint, on the container); where each card
// goes is `layLanes`, which needs the cards' heights, so it runs where they exist. The
// FIRST placement is an inline script right after the container, run while the page is
// still parsing, before it is painted: no card moves once shown. After hydration the
// same function runs again whenever a card or the container changes size (fonts
// arriving, comments loading, a resize) and when the tag filter changes. In development
// React warns once that a script it renders on the client never runs: on a client-side
// navigation the effect lays the lanes out instead, which is the point.

export type LaneItem = { path: string; tags: string[]; node: ReactNode };

/** Places the container's cards in lanes: the CSS Grid Lanes rule. A card goes to the
 *  lane whose bottom is highest; lanes within a share of a lane's width of that count
 *  as level, and among level lanes it takes the first at or after the lane following
 *  the previous card's, so a level stretch reads across, 1 2 3 / 4 5 6, and only a
 *  clearly shorter lane pulls a card out of reading order. With one lane the cards
 *  flow. A tag hides the cards without it. Writes only what React does not render:
 *  styles, `hidden`, `data-first`. Self-contained, no outer name: it is also inlined
 *  as a script, as its own source. */
function layLanes(container: HTMLElement, tag: string | null): void {
  const TOLERANCE = 0.15;
  const style = getComputedStyle(container);
  const lanes = Number(style.getPropertyValue("--lanes"));
  if (!Number.isInteger(lanes) || lanes < 1)
    throw new Error(`lanes: --lanes is "${style.getPropertyValue("--lanes")}"`);
  const cards = Array.from(container.children) as HTMLElement[];
  const shown = cards.filter((card) => {
    const on =
      !tag || (JSON.parse(card.dataset.tags ?? "[]") as string[]).includes(tag);
    card.hidden = !on;
    card.toggleAttribute("data-first", false);
    return on;
  });
  shown[0]?.toggleAttribute("data-first", true);
  if (lanes === 1) {
    container.style.display = "";
    container.style.height = "";
    for (const card of shown) {
      card.style.position = "";
      card.style.width = "";
      card.style.transform = "";
    }
    return;
  }
  const gapX = Number.parseFloat(style.columnGap) || 0;
  const gapY = Number.parseFloat(style.rowGap) || 0;
  const lane = (container.clientWidth - gapX * (lanes - 1)) / lanes;
  container.style.display = "block";
  for (const card of shown) {
    card.style.position = "absolute";
    card.style.top = "0";
    card.style.left = "0";
    card.style.width = `${lane}px`;
  }
  const heights = shown.map((card) => card.getBoundingClientRect().height);
  const bottoms: number[] = new Array(lanes).fill(0);
  let cursor = 0;
  shown.forEach((card, i) => {
    const lowest = Math.min(...bottoms);
    let pick = 0;
    for (let k = 0; k < lanes; k++) {
      const at = (cursor + k) % lanes;
      if ((bottoms[at] ?? 0) - lowest <= TOLERANCE * lane) {
        pick = at;
        break;
      }
    }
    card.style.transform = `translate(${pick * (lane + gapX)}px, ${bottoms[pick]}px)`;
    bottoms[pick] = (bottoms[pick] ?? 0) + (heights[i] ?? 0) + gapY;
    cursor = (pick + 1) % lanes;
  });
  container.style.height = `${Math.max(0, Math.max(...bottoms) - gapY)}px`;
}

const firstPlacement = (filterable: boolean) =>
  `(${layLanes.toString()})(document.currentScript.previousElementSibling,${filterable ? 'new URLSearchParams(location.search).get("tag")' : "null"})`;

/** Cards in lanes. `filterable` lets the feed's tag (`?tag=`) hide the cards without
 *  it; a grid of recommendations is not filtered. */
export function Lanes({
  items,
  filterable = false,
}: {
  items: LaneItem[];
  filterable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tag = useTag();
  const active = filterable ? tag : null;

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) throw new Error("lanes: no container to lay out");
    // A new set of cards (another feed under the same component) is observed afresh.
    if (container.children.length !== items.length)
      throw new Error(
        `lanes: ${container.children.length} cards drawn for ${items.length} items`,
      );
    layLanes(container, active);
    // Sizes change after layout (fonts, comments, a resize). Laying out again from the
    // observer's own callback would resize what it observes inside it, so the next
    // frame does it.
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => layLanes(container, active));
    });
    observer.observe(container);
    for (const card of Array.from(container.children)) observer.observe(card);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [active, items]);

  return (
    <>
      <div
        ref={ref}
        data-slot="lanes"
        suppressHydrationWarning
        className="relative grid grid-cols-[repeat(var(--lanes),minmax(0,1fr))] items-start gap-0 [--lanes:1] sm:gap-6 sm:[--lanes:2] lg:[--lanes:3] xl:[--lanes:4]"
      >
        {items.map((item) => (
          <div
            key={item.path}
            data-tags={JSON.stringify(item.tags)}
            suppressHydrationWarning
          >
            <hr className="feed-divider sm:hidden [[data-first]>&]:hidden" />
            {item.node}
          </div>
        ))}
      </div>
      <script
        // The server's and the client's bundles print the function differently.
        suppressHydrationWarning
        // biome-ignore lint/security/noDangerouslySetInnerHtml: our own function, as source
        dangerouslySetInnerHTML={{ __html: firstPlacement(filterable) }}
      />
    </>
  );
}
