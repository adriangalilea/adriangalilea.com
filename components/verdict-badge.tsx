import { Check, CircleDot, type LucideIcon, Timer, X } from "lucide-react";
import { GlassPill } from "@/components/liquid-glass";
import type { Verdict } from "@/lib/content";
import { cn } from "@/lib/utils";

const VERDICT_CONFIG: Record<
  Verdict,
  { icon: LucideIcon; label: string; colorKey: string }
> = {
  pending: { icon: Timer, label: "pending", colorKey: "zinc" },
  partial: { icon: CircleDot, label: "partial", colorKey: "amber" },
  confirmed: { icon: Check, label: "confirmed", colorKey: "emerald" },
  missed: { icon: X, label: "missed", colorKey: "red" },
};

const VERDICT_COLORS: Record<string, { text: string; bg: string }> = {
  zinc: { text: "text-zinc-400", bg: "bg-zinc-500/5" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/5" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/5" },
  red: { text: "text-red-400", bg: "bg-red-500/5" },
};

export function VerdictBadge({
  verdict,
  absolute = false,
}: {
  verdict: Verdict;
  absolute?: boolean;
}) {
  const config = VERDICT_CONFIG[verdict];
  const c = VERDICT_COLORS[config.colorKey];

  return (
    <GlassPill
      variant="collapsible"
      expand="left"
      shadow="md"
      icon={config.icon}
      label={config.label}
      color={cn(c.text, c.bg)}
      groupClass="group/verdict"
      className={cn(
        "inline-flex size-7",
        absolute && "absolute top-3 right-3 z-10",
      )}
    />
  );
}

export function VerdictInline({ verdict }: { verdict: Verdict }) {
  const config = VERDICT_CONFIG[verdict];
  const c = VERDICT_COLORS[config.colorKey];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider",
        c.text,
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  );
}
