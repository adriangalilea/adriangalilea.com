import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";
import "./material-glass.css";

// THE GLASS MATERIAL, the one look every glass face is made of: the base controls'
// glass faces (button, badge, panel, textarea, …, `material="glass"`) and the whole
// liquid-glass collection read their glass from here, so glass is one material
// everywhere and a control that draws it pulls in this file, not the collection.
// Server-safe (no context, no state): `Glass` and `GlassEdge` render anywhere.

/** CSS glass: a translucent body, inset reflections, and a directional rim.
 * Every tone draws the same edge whatever the shape: a hairline all the way round,
 * a lit line along the top and a fainter one along the foot. The directional rim
 * (a 135° gradient) lights only the corners, so on a long shape (a player's bar, a
 * field) it alone left the length edgeless; dark glass once had nothing else.
 * Keep the center clear enough for the backdrop to show through. The decorative
 * pseudo-element follows the radius without clipping content or focus rings.
 * Use mask longhands: Tailwind emits the mask shorthand after mask-composite,
 * which resets exclude to add and paints the highlight over the entire surface.
 */
export const glassVariants = cva(
  [
    "relative isolate bg-clip-padding",
    "backdrop-blur-[var(--glass-blur,6px)] backdrop-saturate-125",
    // The light the rim catches: `--glass-rim-color` when set, else white leaning
    // toward the glass's hue three times as strongly as the body does, since a
    // thin edge needs more colour to show it. Untinted glass keeps a white rim. A
    // colour reads as itself on the edge, where the glass is brightest; mixed
    // into the dark body a red only darkens to brown.
    "[--glass-rim-ink:var(--glass-rim-color,color-mix(in_oklab,var(--glass-hue,white)_calc(var(--glass-hue-amount,0%)*3),white))]",
    "shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--glass-rim-ink)_calc(16%*var(--glass-rim,1)),transparent),0_4px_16px_-6px_rgb(0_0_0/0.28),inset_0_1px_0_color-mix(in_oklab,var(--glass-rim-ink)_calc(20%*var(--glass-rim,1)),transparent),inset_0_-0.5px_0_color-mix(in_oklab,var(--glass-rim-ink)_calc(8%*var(--glass-rim,1)),transparent),inset_1px_2px_4px_-2px_color-mix(in_oklab,var(--glass-rim-ink)_calc(22%*var(--glass-rim,1)),transparent),inset_-1px_-2px_4px_-2px_color-mix(in_oklab,var(--glass-rim-ink)_calc(11%*var(--glass-rim,1)),transparent)]",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-[var(--glass-rim-width,0.5px)] before:content-['']",
    "before:bg-[linear-gradient(135deg,color-mix(in_oklab,var(--glass-rim-ink)_calc(26%*var(--glass-rim,1)),transparent),color-mix(in_oklab,var(--glass-rim-ink)_calc(10%*var(--glass-rim,1)),transparent)_28%,color-mix(in_oklab,var(--glass-rim-ink)_calc(10%*var(--glass-rim,1)),transparent)_72%,color-mix(in_oklab,var(--glass-rim-ink)_calc(14%*var(--glass-rim,1)),transparent))]",
    "before:[mask-image:linear-gradient(#000_0_0),linear-gradient(#000_0_0)] before:[mask-clip:content-box,border-box] before:[mask-composite:exclude]",
    // Focus is @ag/tokens' ring, the keyboard's only: a fine line just off the
    // glass's edge in the content's colour, following its radius.
    "disabled:pointer-events-none disabled:[&>svg]:opacity-40",
    "forced-colors:border forced-colors:before:hidden",
    // ONE glass, light or dark as the scheme it stands in says (`scheme-dark:`, from
    // @ag/tokens: the page's dark, or the surface's own `scheme="dark"`). Its text is
    // the scheme's foreground, so everything inside reads on it with no ink of its own.
    "bg-[color-mix(in_oklab,var(--glass-hue,transparent)_var(--glass-hue-amount,0%),var(--glass-tint,rgb(238_241_245/0.64)))] text-foreground scheme-light:text-zinc-950 backdrop-saturate-100 backdrop-blur-[var(--glass-blur,5px)] shadow-[0_0_0_0.5px_rgb(24_32_44/0.08),0_2px_5px_-2px_rgb(24_32_44/0.24),0_8px_20px_-8px_rgb(24_32_44/0.22),inset_0_1px_0_rgb(255_255_255/0.7),inset_0_-0.5px_0_rgb(24_32_44/0.2)] supports-[not(backdrop-filter:blur(1px))]:bg-background/95",
    "scheme-dark:bg-[color-mix(in_oklab,var(--glass-hue-deep,var(--glass-hue,transparent))_var(--glass-hue-amount,0%),var(--glass-tint,rgb(16_16_18/0.6)))] scheme-dark:backdrop-saturate-125 scheme-dark:backdrop-blur-[var(--glass-blur,6px)] scheme-dark:shadow-[0_0_0_0.5px_color-mix(in_oklab,var(--glass-rim-ink)_calc(16%*var(--glass-rim,1)),transparent),0_4px_16px_-6px_rgb(0_0_0/0.28),inset_0_1px_0_color-mix(in_oklab,var(--glass-rim-ink)_calc(20%*var(--glass-rim,1)),transparent),inset_0_-0.5px_0_color-mix(in_oklab,var(--glass-rim-ink)_calc(8%*var(--glass-rim,1)),transparent),inset_1px_2px_4px_-2px_color-mix(in_oklab,var(--glass-rim-ink)_calc(22%*var(--glass-rim,1)),transparent),inset_-1px_-2px_4px_-2px_color-mix(in_oklab,var(--glass-rim-ink)_calc(11%*var(--glass-rim,1)),transparent)]",
  ],
  {
    variants: {
      // The scheme the surface stands in: the page's (`auto`), or its own whatever
      // the page is. `dark` is the theme's own class on the surface, so the page's
      // colour variables flip there and in everything inside it: words, icons and
      // nested controls read on the glass by themselves. `light` (light glass over
      // a picture on a dark page) is the glass and its words only: the page's
      // variables have no light block to flip to, so what is inside reads in
      // `currentColor`, as every glass face's words do.
      scheme: {
        auto: "",
        light: "light",
        dark: "dark",
      },
      shape: {
        surface: "",
        circle: "inline-grid size-10 shrink-0 place-items-center rounded-full",
        pill: "inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2",
        bar: "inline-flex items-center gap-1 rounded-full p-1.5",
        card: "rounded-3xl p-5",
      },
    },
    defaultVariants: { scheme: "auto", shape: "card" },
  },
);

/** The colour scheme a surface stands in: the page's, or light or dark whatever the
 *  page is. */
export type Scheme = NonNullable<VariantProps<typeof glassVariants>["scheme"]>;

/** The class a surface of either material wears for its scheme: the theme's `dark`
 *  (the page's colour variables flip on it and inside it), or `light` with light
 *  words (its glass and its `currentColor`; the page's variables stay). One helper,
 *  so no control spells it its own way. */
export const schemeOf = (scheme: Scheme): string | undefined =>
  scheme === "auto" ? undefined : scheme;
export type GlassShape = NonNullable<
  VariantProps<typeof glassVariants>["shape"]
>;

/** Optional CSS controls; they can also be inherited from a parent or set in Tailwind. */
export type GlassStyle = React.CSSProperties & {
  "--glass-blur"?: string;
  "--glass-tint"?: string;
  /** How bright the rim and its inner reflections are, a multiple of the default. */
  "--glass-rim"?: number | string;
  /** How thick the rim is. */
  "--glass-rim-width"?: string;
  /** The colour of the light the rim catches (white, leaning to the hue, unless set). */
  "--glass-rim-color"?: string;
  /** A colour the glass is faintly stained with; set on a parent, every glass
   *  inside wears it. */
  "--glass-hue"?: string;
  /** The hue a dark glass's body takes (the same tone at depth); falls back
   *  to `--glass-hue`. */
  "--glass-hue-deep"?: string;
  /** How much of `--glass-hue` is mixed in, a percentage (0% unless set). */
  "--glass-hue-amount"?: string;
  /** The rim's light, worked out from the tint (`rimInk`) unless `rimColor` names it. */
  "--glass-rim-ink"?: string;
};

/** What a glass's light can be told, one by one: the props `Glass` takes, and
 *  what `glassStyle` turns into its custom properties for any element that wears
 *  `glassVariants` itself (a control's glass face). */
export interface GlassLight {
  /** The rim's brightness as a multiple of the default (1). A glass ring around
   *  an image that already carries its own edge wants more, so the two read as
   *  one family. Sets `--glass-rim`. */
  rim?: number;
  /** The rim's thickness, any CSS length (default 0.5px). Sets `--glass-rim-width`. */
  rimWidth?: string;
  /** The colour of the light on the rim, for an edge that says something (an
   *  error's red). Unset, the rim is white leaning toward `tint`. Sets
   *  `--glass-rim-color`. */
  rimColor?: string;
  /** A colour to stain the glass with, faintly: a brand or a project's accent, so
   *  glass on its pages belongs to it. Mixed into the tone's own tint, never
   *  replacing it; unset, the glass is untouched. Sets `--glass-hue`, which a
   *  parent can set instead to stain every glass inside it. */
  tint?: string;
  /** How much of `tint` goes in, 0 to 1 (default 0.12). Sets `--glass-hue-amount`. */
  tintAmount?: number;
}

export type GlassProps<T extends React.ElementType = "div"> = {
  /** Render a native element or a component that forwards className and ref. */
  as?: T;
  shape?: GlassShape;
  scheme?: Scheme;
  className?: string;
  style?: GlassStyle;
} & GlassLight &
  Omit<
    React.ComponentPropsWithRef<T>,
    | "as"
    | "shape"
    | "scheme"
    | "rim"
    | "rimWidth"
    | "rimColor"
    | "tint"
    | "tintAmount"
    | "className"
    | "style"
  >;

/** A tinted glass's one colour, worked out from the tint alone: the same hue
 *  made vivid and readable on dark glass (lightness raised to at least 0.78,
 *  chroma doubled up to 0.2), so a muted brand colour still reads, and a grey
 *  stays grey (no chroma to double). Body and edge wear this one tone, only
 *  in different amounts (a hint in the body, the rim's light at the edge):
 *  the raw tint in the body read as a dark, muddy shade under a bright edge.
 *  An explicit `rimColor` wins at the edge. Exposed as `--glass-rim-ink`, so
 *  content can write in the same colour. */
export function rimInk(tint: string): string {
  return `oklch(from ${tint} max(l, 0.78) min(calc(c * 2), 0.2) h)`;
}

/** The same tone at depth, for a dark glass's body: the rim ink's hue and
 *  chroma, its lightness held at 0.5 or below. Light mixed into dark glass
 *  reads as haze (a pale accent turned the body a washed grey-beige); the
 *  hue at depth saturates the body instead, so more of it means more colour,
 *  never more fog. Light glass keeps the rim ink (a light hue on light glass
 *  is no haze). Exposed as `--glass-hue-deep`. */
export function deepInk(tint: string): string {
  return `oklch(from ${tint} min(l, 0.5) min(calc(c * 2), 0.2) h)`;
}

/** A glass's light as the custom properties `glassVariants` reads: nothing for what
 *  is unset, so a parent's (a tint set on a page) still reaches it. */
export function glassStyle({
  rim,
  rimWidth,
  rimColor,
  tint,
  tintAmount = 0.12,
}: GlassLight): GlassStyle {
  return {
    ...(rim === undefined ? {} : { "--glass-rim": rim }),
    ...(rimWidth === undefined ? {} : { "--glass-rim-width": rimWidth }),
    ...(rimColor === undefined ? {} : { "--glass-rim-color": rimColor }),
    ...(tint === undefined
      ? {}
      : {
          "--glass-hue": rimInk(tint),
          "--glass-hue-deep": deepInk(tint),
          "--glass-hue-amount": `${tintAmount * 100}%`,
          ...(rimColor === undefined
            ? { "--glass-rim-ink": rimInk(tint) }
            : {}),
        }),
  };
}

/** Style with Tailwind, compose with `as`, and pass native props/ref directly. */
export function Glass<T extends React.ElementType = "div">({
  as,
  shape = "card",
  scheme = "auto",
  rim,
  rimWidth,
  rimColor,
  tint,
  tintAmount,
  className,
  style,
  ...props
}: GlassProps<T>) {
  return React.createElement(as ?? "div", {
    "data-slot": "glass",
    "data-shape": shape,
    "data-scheme": scheme,
    ...(as === "button" ? { type: "button" } : {}),
    ...props,
    style: {
      ...glassStyle({ rim, rimWidth, rimColor, tint, tintAmount }),
      ...style,
    },
    className: cn(glassVariants({ shape, scheme }), className),
  });
}

/** Glass as an edge only, over media that runs to it: the material's inner light and
 *  its specular rim, nothing around the media (no mat, no padding). Over the box it is
 *  placed in (absolute, inset 0), at that box's `radius`. The one edge for glass round
 *  media: a display's frame (glass-display) wears it, and so does anything small that
 *  frames a picture in glass (the player's zoom finder). Its rim is an SVG stroke, the
 *  one hairline a browser always anti-aliases round a curve, one pixel wide entirely
 *  inside the edge (inset half a pixel, its corner radius less the same). */
export function GlassEdge({
  radius,
  className,
}: {
  /** The box's corner radius, any CSS length. */
  radius: string;
  className?: string;
}) {
  const id = `glass-edge-${React.useId().replace(/:/g, "")}`;
  return (
    <div
      aria-hidden
      data-slot="glass-edge"
      className={cn(
        "pointer-events-none absolute inset-0 z-30 rounded-(--glass-edge-radius)",
        className,
      )}
      style={{ "--glass-edge-radius": radius } as React.CSSProperties}
    >
      <div className="absolute inset-0 rounded-[inherit] shadow-[inset_1px_2px_4px_-2px_rgb(255_255_255/0.34),inset_-1px_-2px_4px_-2px_rgb(255_255_255/0.17)]" />
      <svg aria-hidden className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="white" stopOpacity={0.2} />
            <stop offset="0.28" stopColor="white" stopOpacity={0} />
            <stop offset="0.72" stopColor="white" stopOpacity={0} />
            <stop offset="1" stopColor="white" stopOpacity={0.11} />
          </linearGradient>
        </defs>
        <rect
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={1}
          style={{
            x: "0.5px",
            y: "0.5px",
            width: "calc(100% - 1px)",
            height: "calc(100% - 1px)",
            rx: "calc(var(--glass-edge-radius) - 0.5px)",
            ry: "calc(var(--glass-edge-radius) - 0.5px)",
          }}
        />
      </svg>
    </div>
  );
}
