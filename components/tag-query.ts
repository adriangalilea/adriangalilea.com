"use client";

import { useSyncExternalStore } from "react";

// THE FEED'S TAG, read from and written to the URL (`?tag=ai`). Read through
// useSyncExternalStore, never useSearchParams: in a static page useSearchParams makes
// everything up to its Suspense boundary render on the client only, which is how the
// whole feed used to arrive as a fallback and be drawn again after hydration. On the
// server and while hydrating there is no tag (the page is the same for every query);
// the tag in the address applies right after. A change replaces the history entry
// (Next folds native replaceState into its router), so Back leaves the page rather
// than stepping through filters.

const CHANGE = "feedtagchange";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("popstate", onChange);
  };
}

const read = () => new URLSearchParams(window.location.search).get("tag");

export function useTag(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function setTag(tag: string | null): void {
  const url = new URL(window.location.href);
  if (tag) url.searchParams.set("tag", tag);
  else url.searchParams.delete("tag");
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(CHANGE));
}
