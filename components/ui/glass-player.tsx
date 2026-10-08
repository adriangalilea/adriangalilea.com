"use client"

// The player's controls made of glass: the counterparts of ui/player's plain faces,
// over the same logic (useTransport, useSpeed, useSound) and drawing the same icons.
// Dark glass, since they sit over a picture; compose them as the plain ones:
//
//   <VideoPicture>
//     <PlayerChrome>
//       <GlassPlayerTransport />
//       <GlassPlayerFoot>
//         <PlayerBar label="…"><GlassPlayerSpeed /><GlassPlayerSound /></PlayerBar>
//       </GlassPlayerFoot>
//     </PlayerChrome>
//   </VideoPicture>

import { Popover } from "@base-ui/react/popover"
import * as React from "react"
import { cn } from "@/lib/utils"
import {
  GlassMenu,
  GlassMenuContent,
  GlassMenuTrigger,
} from "@/components/ui/glass-menu"
import { GlassTip } from "@/components/ui/glass-tooltip"
import {
  Glass,
  GlassButton,
  glassVariants,
} from "@/components/ui/liquid-glass"
import { usePlayerLayer, usePlaylist } from "@/components/ui/playback"
import {
  PlayerIcon,
  PlayerReadout,
  PlayerVolume,
  PlayerZoomFinder,
  type PlayerZoomFinderProps,
  PlaylistRows,
  SOUND_REVEAL,
  SpeedItems,
  speedLabel,
  TRANSPORT,
  useSound,
  useSpeed,
  useTransportButtons,
  WIDEST_SPEED,
} from "@/components/ui/player"

/** The transport in glass circles over the middle of the picture: the outline's
 *  previous and next divisions (when it has more than one), a jump back and forward,
 *  play and pause in the middle, larger. */
export function GlassPlayerTransport({
  jump = 10_000,
  className,
}: {
  /** ms the circular arrows jump. */
  jump?: number
  className?: string
}) {
  const buttons = useTransportButtons(jump)
  const size = { sm: "icon-sm", md: "icon", lg: "icon-lg" } as const
  return (
    <div
      data-slot="glass-player-transport"
      className={cn(TRANSPORT, className)}
    >
      {buttons.map((b) => (
        <GlassTip key={b.id} content={b.label} keys={b.keys}>
          <GlassButton
            tone="dark"
            size={size[b.size]}
            aria-label={b.label}
            onClick={b.onClick}
            className={b.size === "lg" ? "size-14 [&_svg]:size-6" : undefined}
          >
            {b.icon}
          </GlassButton>
        </GlassTip>
      ))}
    </div>
  )
}

/** The zoom finder in a dark glass frame: PlayerZoomFinder's picture and behaviour. */
export function GlassPlayerZoomFinder(props: PlayerZoomFinderProps) {
  return (
    <PlayerZoomFinder
      {...props}
      frame={cn(
        glassVariants({ tone: "dark", shape: "surface" }),
        "rounded-xl p-1 [--glass-blur:14px] [&>div]:rounded-lg",
      )}
    />
  )
}

/** The playlist as a glass card over the picture, from a glass button in the bar:
 *  PlayerPlaylistButton's behaviour and rows, in dark glass. Absent without a playlist
 *  of more than one item. */
export function GlassPlayerPlaylist({
  label = "playlist",
  className,
}: {
  label?: string
  className?: string
}) {
  const playlist = usePlaylist()
  const layer = usePlayerLayer()
  const [open, setOpen] = React.useState(false)
  if (!playlist || playlist.items.length < 2) return null
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <GlassTip content={label}>
        <Popover.Trigger
          render={
            <GlassButton
              tone="dark"
              size="icon-sm"
              aria-label={label}
              className={className}
            />
          }
        >
          <PlayerIcon.playlist />
        </Popover.Trigger>
      </GlassTip>
      <Popover.Portal container={layer}>
        <Popover.Positioner
          side="top"
          align="end"
          sideOffset={8}
          className="z-50 outline-none"
        >
          <Popover.Popup
            className={cn(
              glassVariants({ tone: "dark", shape: "surface" }),
              "dark max-h-(--available-height) w-80 max-w-(--available-width) overflow-y-auto overscroll-contain rounded-2xl p-1.5 text-foreground outline-none [--glass-blur:14px]",
              "transition-[opacity,translate] duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0 motion-reduce:transition-none",
            )}
          >
            <PlaylistRows onPick={() => setOpen(false)} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** The speed in glass: a soft glass button showing it, opening a glass menu of the
 *  speeds with the current one checked. Absent where speed cannot change. */
export function GlassPlayerSpeed({ className }: { className?: string }) {
  const speed = useSpeed()
  const layer = usePlayerLayer()
  if (!speed) return null
  return (
    <GlassMenu>
      <GlassMenuTrigger
        openOnHover
        delay={60}
        closeDelay={150}
        render={
          <GlassButton
            tone="dark"
            size="sm"
            corners="soft"
            aria-label={`speed ${speedLabel(speed.rate)}`}
            className={cn("font-mono tabular-nums", className)}
          />
        }
      >
        <PlayerReadout
          value={speedLabel(speed.rate)}
          widest={WIDEST_SPEED}
          align="center"
        />
      </GlassMenuTrigger>
      <GlassMenuContent
        side="top"
        container={layer}
        className="dark text-foreground"
      >
        <SpeedItems
          speed={speed}
          item="relative flex cursor-default select-none items-center justify-between gap-3 rounded-[7px] px-2.5 py-1.5 font-mono text-xs tabular-nums outline-none data-highlighted:bg-current/10"
        />
      </GlassMenuContent>
    </GlassMenu>
  )
}

/** Sound in glass: a glass circle that mutes and unmutes, the volume opening above it
 *  in a glass capsule under the hand or focus. Absent where there is no sound. */
export function GlassPlayerSound({ className }: { className?: string }) {
  const sound = useSound()
  if (!sound) return null
  return (
    <div
      data-slot="glass-player-sound"
      className={cn("group/sound relative flex items-center", className)}
    >
      <GlassButton
        tone="dark"
        size="icon-sm"
        aria-label={sound.level === 0 ? "unmute" : "mute"}
        aria-pressed={sound.level === 0}
        onClick={sound.toggleMute}
      >
        <PlayerIcon.sound level={sound.level} />
      </GlassButton>
      <div className={SOUND_REVEAL}>
        <Glass tone="dark" shape="surface" className="rounded-full px-1 py-2.5">
          <PlayerVolume className="text-white" />
        </Glass>
      </div>
    </div>
  )
}

/** The chrome's bottom row as a strip of dark glass floating over the picture's
 *  foot, in place of the plain scrim. */
export function GlassPlayerFoot({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Glass
      data-slot="glass-player-foot"
      tone="dark"
      shape="surface"
      className={cn(
        "pointer-events-auto absolute inset-x-3 bottom-3 cursor-default rounded-2xl px-3 pt-1 pb-0.5",
        className,
      )}
    >
      {children}
    </Glass>
  )
}
