import {
  FlaskConical,
  type LucideIcon,
  Rocket,
  Sunset,
  Trophy,
} from "lucide-react";
import { GlassPill } from "@/components/liquid-glass";
import type { Status } from "@/lib/content";
import { cn } from "@/lib/utils";

export const STATUS_CONFIG: Record<
  Status,
  { icon: LucideIcon; label: string; colorKey: string }
> = {
  soon: { icon: Rocket, label: "soon", colorKey: "violet" },
  sunset: { icon: Sunset, label: "sunset", colorKey: "rose" },
  lab: { icon: FlaskConical, label: "lab", colorKey: "cyan" },
  shipped: { icon: Trophy, label: "shipped", colorKey: "yellow" },
};

export const STATUS_COLORS: Record<
  string,
  {
    text: string;
    bg: string;
    border: string;
    colorVar: string;
    bgVar: string;
    borderVar: string;
  }
> = {
  violet: {
    text: "text-violet-400",
    bg: "bg-violet-500/5",
    border: "border-violet-400/20",
    colorVar: "rgb(167,139,250)",
    bgVar: "rgba(139,92,246,0.05)",
    borderVar: "rgba(167,139,250,0.2)",
  },
  rose: {
    text: "text-rose-400",
    bg: "bg-rose-500/5",
    border: "border-rose-400/20",
    colorVar: "rgb(251,113,133)",
    bgVar: "rgba(251,113,133,0.05)",
    borderVar: "rgba(251,113,133,0.2)",
  },
  cyan: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/5",
    border: "border-cyan-400/20",
    colorVar: "rgb(34,211,238)",
    bgVar: "rgba(34,211,238,0.05)",
    borderVar: "rgba(34,211,238,0.2)",
  },
  yellow: {
    text: "text-yellow-400",
    bg: "bg-yellow-500/5",
    border: "border-yellow-400/20",
    colorVar: "rgb(250,204,21)",
    bgVar: "rgba(250,204,21,0.05)",
    borderVar: "rgba(250,204,21,0.2)",
  },
};

export function StatusBadge({
  status,
  absolute = false,
}: {
  status: Status;
  absolute?: boolean;
}) {
  const config = STATUS_CONFIG[status];
  const c = STATUS_COLORS[config.colorKey];

  return (
    <GlassPill
      variant="collapsible"
      expand="left"
      shadow="md"
      icon={config.icon}
      label={config.label}
      color={cn(c.text, c.bg)}
      groupClass="group/status"
      className={cn(
        "inline-flex size-7",
        absolute && "absolute top-3 right-3 z-10",
      )}
    />
  );
}
