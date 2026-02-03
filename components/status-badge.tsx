import { Rocket, Sunset, FlaskConical, Trophy, type LucideIcon } from "lucide-react";
import type { Project } from "@/data/projects";

const STATUS_CONFIG: Record<
	NonNullable<Project["status"]>,
	{ icon: LucideIcon; label: string; color: string }
> = {
	soon: { icon: Rocket, label: "soon", color: "violet" },
	sunset: { icon: Sunset, label: "sunset", color: "rose" },
	lab: { icon: FlaskConical, label: "lab", color: "cyan" },
	shipped: { icon: Trophy, label: "shipped", color: "yellow" },
};

const COLORS: Record<string, { tint: string; text: string; border: string; shadow: string }> = {
	violet: {
		tint: "rgba(139,92,246,0.15)",
		text: "text-violet-400/90",
		border: "border-white/[0.08]",
		shadow: "inset 0 1px 0 0 rgba(255,255,255,0.12), 0 1px 3px rgba(0,0,0,0.4)",
	},
	rose: {
		tint: "rgba(251,113,133,0.15)",
		text: "text-rose-400/90",
		border: "border-white/[0.08]",
		shadow: "inset 0 1px 0 0 rgba(255,255,255,0.12), 0 1px 3px rgba(0,0,0,0.4)",
	},
	cyan: {
		tint: "rgba(34,211,238,0.15)",
		text: "text-cyan-400/90",
		border: "border-white/[0.08]",
		shadow: "inset 0 1px 0 0 rgba(255,255,255,0.12), 0 1px 3px rgba(0,0,0,0.4)",
	},
	yellow: {
		tint: "rgba(250,204,21,0.15)",
		text: "text-yellow-400/90",
		border: "border-white/[0.08]",
		shadow: "inset 0 1px 0 0 rgba(255,255,255,0.12), 0 1px 3px rgba(0,0,0,0.4)",
	},
};

function Glass({ className, color, children }: { className?: string; color: string; children: React.ReactNode }) {
	const c = COLORS[color];
	return (
		<span
			className={`isolate relative border ${c.text} ${c.border} ${className}`}
			style={{ boxShadow: c.shadow }}
		>
			<span className="absolute inset-0 rounded-[inherit] -z-2 backdrop-blur-[12px]" />
			<span className="absolute inset-0 rounded-[inherit] -z-1" style={{ background: c.tint }} />
			{children}
		</span>
	);
}

export function StatusBadge({ status }: { status: NonNullable<Project["status"]> }) {
	const config = STATUS_CONFIG[status];
	const Icon = config.icon;

	return (
		<span className="group/status relative inline-flex h-6 w-6 shrink-0">
			<Glass
				color={config.color}
				className="absolute left-0 top-0 flex h-6 items-center gap-0 rounded-full px-[6px] transition-all duration-250 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/status:gap-1.5 group-hover/status:pr-2.5"
			>
				<Icon className="relative z-10 size-2.5 shrink-0" />
				<span className="relative z-10 max-w-0 overflow-hidden text-[10px] font-medium leading-none whitespace-nowrap opacity-0 transition-all duration-250 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/status:max-w-20 group-hover/status:opacity-100">
					{config.label}
				</span>
			</Glass>
		</span>
	);
}
