"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

// Batch context for feed/collection pages
const ViewCountsContext = createContext<Record<string, number> | null>(null);

export function ViewCountsProvider({
  slugs,
  children,
}: {
  slugs: string[];
  children: ReactNode;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const slugsKey = slugs.join(",");

  useEffect(() => {
    if (!slugsKey) return;
    fetch(`/api/views/batch?slugs=${encodeURIComponent(slugsKey)}`)
      .then((r) => r.json())
      .then((data) => setCounts(data.counts ?? {}))
      .catch(() => {});
  }, [slugsKey]);

  return <ViewCountsContext value={counts}>{children}</ViewCountsContext>;
}

// For feed cards — reads from batch context
export function FeedViewCount({ slug }: { slug: string }) {
  const counts = useContext(ViewCountsContext);
  const count = counts?.[slug];
  if (count === undefined) return null;
  return (
    <span className="text-muted-foreground">
      {count.toLocaleString()} {count === 1 ? "view" : "views"}
    </span>
  );
}

// For individual page/note views — fetches its own count
export function ViewCounter({ slug }: { slug: string }) {
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/views/${slug}`)
      .then((r) => r.json())
      .then((data) => setCount(data.views))
      .catch(() => {});
  }, [slug]);

  if (count === undefined) return null;
  return (
    <span className="text-muted-foreground">
      {count.toLocaleString()} {count === 1 ? "view" : "views"}
    </span>
  );
}
