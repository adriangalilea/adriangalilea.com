import { Rocket, Sunset, FlaskConical, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/content";

export const STATUS_CONFIG: Record<
	Status,
	{ icon: LucideIcon; label: string; colorKey: string }
> = {
	soon: { icon: Rocket, label: "soon", colorKey: "violet" },
	sunset: { icon: Sunset, label: "sunset", colorKey: "rose" },
	lab: { icon: FlaskConical, label: "lab", colorKey: "cyan" },
	shipped: { icon: Trophy, label: "shipped", colorKey: "yellow" },
};

// Centralized status styling
export const STATUS_COLORS: Record<string, {
	text: string;
	bg: string;
	border: string;
	// CSS values for dynamic use
	colorVar: string;
	bgVar: string;
	borderVar: string;
}> = {
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

function Glass({ className, colorKey, children }: { className?: string; colorKey: string; children: React.ReactNode }) {
	const c = STATUS_COLORS[colorKey];
	return (
		<span
			className={cn(
				"isolate relative overflow-hidden backdrop-blur-xl shadow-[var(--glass-shadow-md)]",
				c.text,
				c.bg,
				className
			)}
		>
			<span className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.1),inset_0_0_0_0.5px_rgba(255,255,255,0.06)]" />
			{children}
		</span>
	);
}

export function StatusBadge({ status, absolute = false }: { status: Status; absolute?: boolean }) {
	const config = STATUS_CONFIG[status];
	const Icon = config.icon;

	return (
		<span className={cn(
			"group/status inline-flex size-7",
			absolute && "absolute top-3 right-3 z-10"
		)}>
			<Glass
				colorKey={config.colorKey}
				className={cn(
					"absolute right-0 top-0 flex h-7 min-w-7 items-center justify-end rounded-full",
					"gap-0 px-[7px]",
					"group-hover/status:gap-1.5 group-hover/status:pl-3 group-hover/status:pr-2",
					"max-sm:gap-1.5 max-sm:pl-3 max-sm:pr-2"
				)}
			>
				<span className="relative z-10 max-w-0 overflow-hidden text-xs font-medium leading-none whitespace-nowrap opacity-0 transition-all duration-200 ease-out group-hover/status:max-w-24 group-hover/status:opacity-100 max-sm:max-w-24 max-sm:opacity-100">
					{config.label}
				</span>
				<span className="relative z-10 flex size-3.5 items-center justify-center shrink-0">
					<Icon className="size-3 shrink-0" />
				</span>
			</Glass>
		</span>
	);
}
