"use client";

import { useEffect, useState } from "react";

export function ViewCounter({ slug, track = true }: { slug: string; track?: boolean }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/views/${slug}`, { method: track ? "POST" : "GET" })
      .then((r) => r.json())
      .then((d) => setViews(d.views))
      .catch(() => {});
  }, [slug, track]);

  if (views === null) return null;

  return (
    <span className="text-muted-foreground">
      {views.toLocaleString()} {views === 1 ? "view" : "views"}
    </span>
  );
}
