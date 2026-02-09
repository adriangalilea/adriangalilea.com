"use client";

import { useEffect } from "react";

export function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/views/${slug}`, { method: "POST" }).catch(() => {});
  }, [slug]);

  return null;
}

export function TrackViews({ slugs }: { slugs: string[] }) {
  useEffect(() => {
    if (slugs.length === 0) return;
    fetch("/api/views/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs }),
    }).catch(() => {});
  }, [slugs]);

  return null;
}
