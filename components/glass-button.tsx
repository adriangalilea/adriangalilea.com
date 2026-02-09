import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type GlassButtonProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "collapsible" | "full";
};

function GlassShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "isolate relative overflow-hidden backdrop-blur-xl shadow-[var(--glass-shadow-sm)]",
        "bg-[var(--glass-l1)] text-foreground-low hover:text-foreground transition-all",
        className,
      )}
    >
      <span className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.1),inset_0_0_0_0.5px_rgba(255,255,255,0.06)]" />
      {children}
    </span>
  );
}

export function GlassButton({
  icon: Icon,
  label,
  onClick,
  variant = "collapsible",
}: GlassButtonProps) {
  if (variant === "full") {
    return (
      <button type="button" onClick={onClick}>
        <GlassShell className="flex h-7 items-center gap-1.5 rounded-full pl-2.5 pr-3">
          <span className="relative z-10 flex size-3.5 items-center justify-center shrink-0">
            <Icon className="size-3 shrink-0" />
          </span>
          <span className="relative z-10 text-xs font-medium leading-none whitespace-nowrap">
            {label}
          </span>
        </GlassShell>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group/btn"
    >
      <GlassShell
        className={cn(
          "flex h-7 min-w-7 items-center rounded-full",
          "pl-[7px] pr-[7px]",
          "group-hover/btn:pr-3",
        )}
      >
        <span className="relative z-10 flex size-3.5 items-center justify-center shrink-0">
          <Icon className="size-3 shrink-0" />
        </span>
        <span className="relative z-10 max-w-0 overflow-hidden text-xs font-medium leading-none whitespace-nowrap opacity-0 transition-all duration-200 ease-out group-hover/btn:max-w-24 group-hover/btn:opacity-100 group-hover/btn:pl-1.5">
          {label}
        </span>
      </GlassShell>
    </button>
  );
}
