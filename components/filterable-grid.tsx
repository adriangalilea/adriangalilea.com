"use client";

import { useQueryState } from "nuqs";
import type { ReactNode } from "react";

type Item = {
  path: string;
  tags: string[];
  height: number;
  content: ReactNode;
};

type Props = {
  items: Item[];
};

function distribute<T extends { height: number }>(
  items: T[],
  cols: number,
): T[][] {
  const columns: T[][] = Array.from({ length: cols }, () => []);
  const heights: number[] = Array(cols).fill(0);

  // Keep original order (date sorted), distribute to shortest column
  for (const item of items) {
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push(item);
    heights[shortest] += item.height;
  }

  return columns;
}

export function Grid({ items }: { items: Item[] }) {
  const c2 = distribute(items, 2);
  const c3 = distribute(items, 3);
  const c4 = distribute(items, 4);

  const render = (col: Item[]) => (
    <div className="flex flex-col gap-6">
      {col.map((item) => (
        <div key={item.path}>{item.content}</div>
      ))}
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-0 sm:hidden">
        {items.map((item, i) => (
          <div key={item.path}>
            {i > 0 && <hr className="feed-divider" />}
            {item.content}
          </div>
        ))}
      </div>
      <div className="hidden sm:grid lg:hidden grid-cols-2 gap-6 items-start">
        {c2
          .filter((col) => col.length > 0)
          .map((col) => (
            <div key={col[0].path}>{render(col)}</div>
          ))}
      </div>
      <div className="hidden lg:grid xl:hidden grid-cols-3 gap-6 items-start">
        {c3
          .filter((col) => col.length > 0)
          .map((col) => (
            <div key={col[0].path}>{render(col)}</div>
          ))}
      </div>
      <div className="hidden xl:grid grid-cols-4 gap-6 items-start">
        {c4
          .filter((col) => col.length > 0)
          .map((col) => (
            <div key={col[0].path}>{render(col)}</div>
          ))}
      </div>
    </>
  );
}

export function FilterableGrid({ items }: Props) {
  const [tag] = useQueryState("tag");
  const filteredItems = tag
    ? items.filter((item) => item.tags.includes(tag))
    : items;
  return <Grid items={filteredItems} />;
}

// Server fallback
export function GridFallback({ items }: { items: Item[] }) {
  return <Grid items={items} />;
}
