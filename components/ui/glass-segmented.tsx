"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Glass, type GlassTone } from "@/components/ui/liquid-glass"

// A choice of one among a few, in one glass bar: the options sit side by side and
// a single highlight glides to the chosen one, so a change reads as one thing
// moving, never two states blinking. A radio group for assistive tech; the arrow
// keys move the choice (and Home and End), roving focus keeps one tab stop.

export type GlassSegmentedOption<V extends string> = {
  value: V
  label: React.ReactNode
  /** Its accessible name, when the label is only an icon. */
  title?: string
}

export function GlassSegmented<V extends string>({
  options,
  value,
  onValueChange,
  label,
  tone,
  size = "md",
  className,
}: {
  options: GlassSegmentedOption<V>[]
  value: V
  onValueChange: (value: V) => void
  /** What is being chosen, for assistive tech. */
  label: string
  tone?: GlassTone
  size?: "sm" | "md"
  className?: string
}) {
  const bar = React.useRef<HTMLDivElement>(null)
  const [at, setAt] = React.useState<{ left: number; width: number } | null>(
    null,
  )
  React.useLayoutEffect(() => {
    const chosen = bar.current?.querySelector<HTMLElement>(
      '[aria-checked="true"]',
    )
    if (!chosen) return
    const next = { left: chosen.offsetLeft, width: chosen.offsetWidth }
    if (next.left !== at?.left || next.width !== at?.width) setAt(next)
  })
  const index = options.findIndex((o) => o.value === value)
  if (index === -1)
    throw new Error(`GlassSegmented: ${value} is not one of the options`)
  const move = (to: number) => {
    const option = options[(to + options.length) % options.length]
    if (!option) return
    onValueChange(option.value)
    bar.current
      ?.querySelector<HTMLElement>(`[data-value="${option.value}"]`)
      ?.focus()
  }
  return (
    <Glass
      ref={bar}
      shape="bar"
      tone={tone}
      role="radiogroup"
      aria-label={label}
      className={cn("relative", className)}
      onKeyDown={(e: React.KeyboardEvent) => {
        const by = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
          e.key
        ]
        if (by !== undefined) move(index + by)
        else if (e.key === "Home") move(0)
        else if (e.key === "End") move(options.length - 1)
        else return
        e.preventDefault()
      }}
    >
      {/* The highlight: one shape gliding between options. Measured from the
          chosen option itself, so it fits labels of any width. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1.5 bottom-1.5 rounded-full bg-current/12 shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          at ? "opacity-100" : "opacity-0",
        )}
        style={at ?? undefined}
      />
      {options.map((o) => {
        const chosen = o.value === value
        return (
          // biome-ignore lint/a11y/useSemanticElements: the WAI-ARIA radio group pattern (buttons, roving focus, arrow keys); a native radio cannot be a segment
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={chosen}
            aria-label={o.title}
            data-value={o.value}
            tabIndex={chosen ? 0 : -1}
            onClick={() => onValueChange(o.value)}
            className={cn(
              "relative inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[1.06] active:duration-150 motion-reduce:active:scale-100 focus-visible:-outline-offset-(--focus-ring-offset) [&_svg]:shrink-0",
              size === "sm"
                ? "h-7 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5"
                : "h-9 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
              chosen ? "opacity-100" : "opacity-60 hover:opacity-90",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </Glass>
  )
}
