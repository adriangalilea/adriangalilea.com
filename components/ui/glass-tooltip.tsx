"use client"

// The tooltip in glass: ui/tooltip's parts and behaviour, its popup dark glass, for
// controls that are glass themselves (the glass player's). `GlassTooltipContent` is
// the part, `GlassTip` the one-line shorthand.

import { cn } from "@/lib/utils"
import { glassVariants } from "@/components/ui/liquid-glass"
import {
  type TipProps,
  Tooltip,
  type TooltipContentProps,
  TooltipPopup,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function GlassTooltipContent(props: TooltipContentProps) {
  return (
    <TooltipPopup
      {...props}
      face={cn(
        glassVariants({ tone: "dark", shape: "surface" }),
        props.card ? "rounded-xl" : "rounded-full px-2.5",
        "[--glass-blur:14px]",
      )}
    />
  )
}

export function GlassTip({ content, delay, children, ...content_ }: TipProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} delay={delay} />
      <GlassTooltipContent {...content_}>{content}</GlassTooltipContent>
    </Tooltip>
  )
}
