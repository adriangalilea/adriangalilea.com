"use client";

import { useEffect } from "react";

export function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/views/${slug}`, { method: "POST" }).catch(() => {});
  }, [slug]);

  return null;
}
