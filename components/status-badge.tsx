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

export const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  violet: { text: "text-violet-400", bg: "bg-violet-500/5" },
  rose: { text: "text-rose-400", bg: "bg-rose-500/5" },
  cyan: { text: "text-cyan-400", bg: "bg-cyan-500/5" },
  yellow: { text: "text-yellow-400", bg: "bg-yellow-500/5" },
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
