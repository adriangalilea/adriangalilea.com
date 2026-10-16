import type { ReactNode } from "react";
import { Arrange, ArrangeCell } from "@/components/ui/arrange";

// THE FEED'S CARDS IN LANES: ui's arrange (masonry by each card's real height, placed
// before the first paint), with what is the site's own: a lane about 280 px wide (one
// on a phone, four on a wide screen, no breakpoints), the gap, and on a phone, where
// the cards flow in one lane, a hairline between them instead of a gap.

export type LaneItem = { path: string; tags: string[]; node: ReactNode };

const LANE_PX = 280;

/** Cards in lanes. `filterable` lets the feed's tag (`?tag=`, the tag filter's) hide the
 *  cards without it; a grid of recommendations is not filtered. */
export function Lanes({
  items,
  filterable = false,
}: {
  items: LaneItem[];
  filterable?: boolean;
}) {
  return (
    <Arrange
      laneWidth={LANE_PX}
      filter={filterable ? "tag" : undefined}
      className="gap-0 sm:gap-6"
    >
      {items.map((item) => (
        <ArrangeCell key={item.path} tags={item.tags}>
          <hr className="feed-divider sm:hidden [[data-first]>&]:hidden" />
          {item.node}
        </ArrangeCell>
      ))}
    </Arrange>
  );
}
