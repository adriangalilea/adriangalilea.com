import type { ElementType, ComponentPropsWithoutRef } from "react";

type Layer = "l0" | "l1";
type Shadow = "none" | "sm" | "md" | "lg";

const LAYER_CONFIG: Record<Layer, { tint: string; blur: number; shine: string }> = {
	l0: {
		tint: "var(--glass-l0)",
		blur: 48,
		shine: "inset 0 0.5px 0 0 rgba(255,255,255,0.06), inset 0 0 0 0.5px rgba(255,255,255,0.04)",
	},
	l1: {
		tint: "var(--glass-l1)",
		blur: 24,
		shine: "inset 0 0.5px 0 0 rgba(255,255,255,0.1), inset 0 0 0 0.5px rgba(255,255,255,0.06)",
	},
};

const SHADOW_CONFIG: Record<Shadow, string> = {
	none: "none",
	sm: "var(--glass-shadow-sm)",
	md: "var(--glass-shadow-md)",
	lg: "var(--glass-shadow-lg)",
};

type LiquidGlassProps<T extends ElementType = "div"> = {
	as?: T;
	layer?: Layer;
	shadow?: Shadow;
	children: React.ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "children">;

export function LiquidGlass<T extends ElementType = "div">({
	as,
	layer = "l1",
	shadow = "none",
	children,
	className,
	style,
	...rest
}: LiquidGlassProps<T>) {
	const Tag = as ?? "div";
	const { tint, blur, shine } = LAYER_CONFIG[layer];
	const boxShadow = SHADOW_CONFIG[shadow];

	return (
		<Tag
			className={`relative overflow-hidden ${className ?? ""}`}
			style={{ boxShadow, ...style }}
			{...rest}
		>
			<div
				className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
				style={{
					backdropFilter: `blur(${blur}px)`,
					WebkitBackdropFilter: `blur(${blur}px)`,
					filter: "url(#glass-distortion)",
				}}
			/>
			<div className="absolute inset-0 z-[1] rounded-[inherit]" style={{ background: tint }} />
			<div
				className="absolute inset-0 z-[2] overflow-hidden rounded-[inherit]"
				style={{ boxShadow: shine }}
			/>
			<div className="relative z-[3]">{children}</div>
		</Tag>
	);
}

export function LiquidGlassFilter() {
	return (
		<svg style={{ display: "none" }}>
			<filter
				id="glass-distortion"
				x="0%"
				y="0%"
				width="100%"
				height="100%"
				filterUnits="objectBoundingBox"
			>
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.01 0.01"
					numOctaves="1"
					seed="5"
					result="turbulence"
				/>
				<feComponentTransfer in="turbulence" result="mapped">
					<feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
					<feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
					<feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
				</feComponentTransfer>
				<feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
				<feSpecularLighting
					in="softMap"
					surfaceScale="5"
					specularConstant="1"
					specularExponent="100"
					lightingColor="white"
					result="specLight"
				>
					<fePointLight x="-200" y="-200" z="300" />
				</feSpecularLighting>
				<feComposite
					in="specLight"
					operator="arithmetic"
					k1="0"
					k2="1"
					k3="1"
					k4="0"
					result="litImage"
				/>
				<feDisplacementMap
					in="SourceGraphic"
					in2="softMap"
					scale="150"
					xChannelSelector="R"
					yChannelSelector="G"
				/>
			</filter>
		</svg>
	);
}
