import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Layer = "l0" | "l1";
type Shadow = "none" | "sm" | "md" | "lg";

const SHINE: Record<Layer, string> = {
  l0: "inset 0 0.5px 0 0 rgba(255,255,255,0.06), inset 0 0 0 0.5px rgba(255,255,255,0.04)",
  l1: "inset 0 0.5px 0 0 rgba(255,255,255,0.1), inset 0 0 0 0.5px rgba(255,255,255,0.06)",
};

const OUTER_SHADOW: Record<Shadow, string | null> = {
  none: null,
  sm: "var(--glass-shadow-sm)",
  md: "var(--glass-shadow-md)",
  lg: "var(--glass-shadow-lg)",
};

function buildBoxShadow(layer: Layer, shadow: Shadow): string {
  const s = OUTER_SHADOW[shadow];
  return s ? `${SHINE[layer]}, ${s}` : SHINE[layer];
}

// ============================================================================
// GlassSurface — the one glass primitive
// ============================================================================

type GlassSurfaceProps<T extends ElementType = "span"> = {
  as?: T;
  layer?: Layer;
  shadow?: Shadow;
  distortion?: boolean;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "children">;

export function GlassSurface<T extends ElementType = "span">({
  as,
  layer = "l1",
  shadow = "none",
  distortion = false,
  children,
  className,
  style,
  ...rest
}: GlassSurfaceProps<T>) {
  const Tag = as ?? "span";
  const bg = layer === "l0" ? "bg-[var(--glass-l0)]" : "bg-[var(--glass-l1)]";

  if (distortion) {
    return (
      <Tag
        className={cn("relative overflow-hidden", className)}
        style={{ boxShadow: buildBoxShadow(layer, shadow), ...style }}
        {...rest}
      >
        <div
          className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
          style={{
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            filter: "url(#glass-distortion)",
          }}
        />
        <div className={cn("absolute inset-0 z-[1] rounded-[inherit]", bg)} />
        <div
          className="absolute inset-0 z-[2] rounded-[inherit]"
          style={{ boxShadow: SHINE[layer] }}
        />
        <div className="relative z-[3]">{children}</div>
      </Tag>
    );
  }

  return (
    <Tag
      className={cn(
        "isolate relative overflow-hidden backdrop-blur-xl",
        bg,
        className,
      )}
      style={{ boxShadow: buildBoxShadow(layer, shadow), ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ============================================================================
// GlassPill — collapsible/full icon+label pill
// ============================================================================

const HOVER_CLASSES = {
  "group/pill": {
    group: "group/pill",
    surface_expand_left:
      "group-hover/pill:gap-1.5 group-hover/pill:pl-3 group-hover/pill:pr-2",
    surface_expand_right: "group-hover/pill:pr-3",
    label_expand_left: "group-hover/pill:max-w-24 group-hover/pill:opacity-100",
    label_expand_right:
      "group-hover/pill:max-w-24 group-hover/pill:opacity-100 group-hover/pill:pl-1.5",
  },
  "group/status": {
    group: "group/status",
    surface_expand_left:
      "group-hover/status:gap-1.5 group-hover/status:pl-3 group-hover/status:pr-2",
    surface_expand_right: "group-hover/status:pr-3",
    label_expand_left:
      "group-hover/status:max-w-24 group-hover/status:opacity-100",
    label_expand_right:
      "group-hover/status:max-w-24 group-hover/status:opacity-100 group-hover/status:pl-1.5",
  },
} as const;

type GroupName = keyof typeof HOVER_CLASSES;

type GlassPillProps<T extends ElementType = "span"> = {
  as?: T;
  icon?: LucideIcon;
  label: string;
  variant?: "collapsible" | "full";
  expand?: "left" | "right";
  shadow?: Shadow;
  color?: string;
  groupClass?: GroupName;
  children?: never;
} & Omit<ComponentPropsWithoutRef<T>, "children">;

export function GlassPill<T extends ElementType = "span">({
  as,
  icon: Icon,
  label,
  variant = "collapsible",
  expand = "right",
  shadow = "sm",
  color,
  groupClass = "group/pill",
  className,
  ...rest
}: GlassPillProps<T>) {
  const Tag = as ?? "span";
  const h = HOVER_CLASSES[groupClass];

  if (variant === "full") {
    return (
      <Tag className={cn(h.group, className)} {...rest}>
        <GlassSurface
          shadow={shadow}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-full text-foreground-low hover:text-foreground transition-all",
            Icon ? "pl-2.5 pr-3" : "px-3",
            color,
          )}
        >
          {Icon && (
            <span className="flex size-3.5 items-center justify-center shrink-0">
              <Icon className="size-3 shrink-0" />
            </span>
          )}
          <span className="text-xs font-medium leading-none whitespace-nowrap">
            {label}
          </span>
        </GlassSurface>
      </Tag>
    );
  }

  if (expand === "left") {
    return (
      <Tag className={cn(h.group, className)} {...rest}>
        <GlassSurface
          shadow={shadow}
          className={cn(
            "absolute right-0 top-0 flex h-7 min-w-7 items-center justify-end rounded-full",
            "gap-0 px-[7px]",
            h.surface_expand_left,
            "max-sm:gap-1.5 max-sm:pl-3 max-sm:pr-2",
            "transition-all",
            color,
          )}
        >
          <span
            className={cn(
              "max-w-0 overflow-hidden text-xs font-medium leading-none whitespace-nowrap opacity-0 transition-all duration-200 ease-out",
              h.label_expand_left,
              "max-sm:max-w-24 max-sm:opacity-100",
            )}
          >
            {label}
          </span>
          {Icon && (
            <span className="flex size-3.5 items-center justify-center shrink-0">
              <Icon className="size-3 shrink-0" />
            </span>
          )}
        </GlassSurface>
      </Tag>
    );
  }

  // expand === "right"
  return (
    <Tag className={cn(h.group, className)} {...rest}>
      <GlassSurface
        shadow={shadow}
        className={cn(
          "flex h-7 min-w-7 items-center rounded-full text-foreground-low hover:text-foreground transition-all",
          "pl-[7px] pr-[7px]",
          h.surface_expand_right,
          color,
        )}
      >
        {Icon && (
          <span className="flex size-3.5 items-center justify-center shrink-0">
            <Icon className="size-3 shrink-0" />
          </span>
        )}
        <span
          className={cn(
            "max-w-0 overflow-hidden text-xs font-medium leading-none whitespace-nowrap opacity-0 transition-all duration-200 ease-out",
            h.label_expand_right,
          )}
        >
          {label}
        </span>
      </GlassSurface>
    </Tag>
  );
}

// ============================================================================
// LiquidGlassFilter — SVG distortion filter definition (unchanged)
// ============================================================================

export function LiquidGlassFilter() {
  return (
    <svg aria-hidden="true" style={{ display: "none" }}>
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
