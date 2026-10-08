"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// One highlight for a whole list, gliding to the row under the pointer or holding
// focus, instead of each row lighting its own box: the eye follows one soft shape
// moving, never boxes blinking on and off. Wrap the rows (a menu's items, a rail's
// links); `item` says which descendants are rows. A row sets `--glide-tone` to
// wear its own colour (a project's accent) and the highlight blends from one
// row's tone to the next as it moves; without one it is a faint neutral.
//
// The rows themselves draw no hover or focus background: the glide is it.

const NEUTRAL = "var(--foreground)"

export function GlassGlide({
  item = "[data-glide-item]",
  strength = 0.09,
  className,
  children,
}: {
  /** A selector for the rows the highlight moves between. */
  item?: string
  /** How much of the row's tone the highlight is, 0 to 1 (default 0.09). */
  strength?: number
  className?: string
  children: React.ReactNode
}) {
  // Where the highlight is, kept after it hides so it fades out in place; and
  // whether it is shown. It glides only from row to row while shown: arriving
  // and leaving, it fades where the row is, never travelling from or to a
  // place nobody pointed at.
  const [at, setAt] = React.useState<{
    top: number
    height: number
    radius: string
  } | null>(null)
  const [shown, setShown] = React.useState(false)
  // Shown before this move: then the highlight travels; else it just appears.
  const [gliding, setGliding] = React.useState(false)
  const [tone, setTone] = React.useState(NEUTRAL)
  const follow = (target: EventTarget | null) => {
    const row = target instanceof Element ? target.closest(item) : null
    if (!(row instanceof HTMLElement)) return
    setGliding(shown)
    // The highlight takes the row's own corners, so it fits any list's rows.
    setAt({
      top: row.offsetTop,
      height: row.offsetHeight,
      radius: getComputedStyle(row).borderRadius,
    })
    setTone(
      getComputedStyle(row).getPropertyValue("--glide-tone").trim() || NEUTRAL,
    )
    setShown(true)
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the rows are the interactive elements; this only follows them
    <div
      className={cn("relative", className)}
      onMouseOver={(e) => follow(e.target)}
      onFocus={(e) => follow(e.target)}
      onMouseLeave={() => setShown(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setShown(false)
      }}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          shown ? "opacity-100" : "opacity-0",
          shown && gliding
            ? "transition-[transform,height,opacity,background-color,box-shadow] motion-reduce:transition-opacity"
            : "transition-opacity",
        )}
        style={{
          transform: `translateY(${at?.top ?? 0}px)`,
          height: at?.height ?? 0,
          borderRadius: at?.radius,
          backgroundColor: `color-mix(in oklab, ${tone} ${strength * 100}%, transparent)`,
          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${tone} ${strength * 90}%, transparent)`,
        }}
      />
      {children}
    </div>
  )
}
