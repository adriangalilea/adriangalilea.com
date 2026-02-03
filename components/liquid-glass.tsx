import type { ElementType, ComponentPropsWithoutRef } from "react";

type LiquidGlassProps<T extends ElementType = "div"> = {
	as?: T;
	tint?: string;
	blur?: number;
	shadow?: string;
	shine?: string;
	children: React.ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "children">;

export function LiquidGlass<T extends ElementType = "div">({
	as,
	tint = "rgba(0,0,0,0.2)",
	blur = 16,
	shadow = "none",
	shine = "inset 0 0.5px 0 0 rgba(255,255,255,0.04)",
	children,
	className,
	style,
	...rest
}: LiquidGlassProps<T>) {
	const Tag = as ?? "div";
	return (
		<Tag
			className={`relative overflow-hidden ${className ?? ""}`}
			style={{ boxShadow: shadow, ...style }}
			{...rest}
		>
			<div
				className="absolute inset-0 z-0 overflow-hidden"
				style={{
					backdropFilter: `blur(${blur}px)`,
					WebkitBackdropFilter: `blur(${blur}px)`,
					filter: "url(#glass-distortion)",
				}}
			/>
			<div className="absolute inset-0 z-[1]" style={{ background: tint }} />
			<div
				className="absolute inset-0 z-[2] overflow-hidden"
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
