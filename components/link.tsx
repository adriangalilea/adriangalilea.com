"use client";

import NextLink from "next/link";
import { type ComponentProps, useState } from "react";

// THE SITE'S LINK: next/link that prefetches what the reader reaches for, never what
// merely scrolls past. Every page here is static, and Next prefetches a static route IN
// FULL as each link enters the viewport: the header's name links the home, so every page
// load fetched the home's whole feed payload (294 KB, measured 2026-10-17), and each one
// is a read of the deployment's prerender store, which Vercel bills as ISR reads and Fast
// Origin Transfer. The pointer resting on a link, the keyboard reaching it, or a finger
// landing on it starts the prefetch, a beat before the click, so the page is there when
// it lands. The pattern is ui's (`app/link.tsx` in the ui checkout).
//
// Every internal link of the site is this one; biome refuses `next/link` anywhere else.

type Props = Omit<ComponentProps<typeof NextLink>, "prefetch">;

export function Link({ onMouseEnter, onFocus, onTouchStart, ...props }: Props) {
  // Once wanted, the route is Next's own to prefetch (`null`: its default for a static
  // route, the whole page) and stays so.
  const [wanted, setWanted] = useState(false);
  return (
    <NextLink
      {...props}
      prefetch={wanted ? null : false}
      onMouseEnter={(event) => {
        setWanted(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setWanted(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setWanted(true);
        onTouchStart?.(event);
      }}
    />
  );
}
