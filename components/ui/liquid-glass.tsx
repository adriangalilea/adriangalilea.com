import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";
import "./liquid-glass.css";

/** CSS glass: a translucent body, inset reflections, and a directional rim.
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
    "shadow-[0_4px_16px_-6px_rgb(0_0_0/0.28),inset_1px_2px_4px_-2px_color-mix(in_oklab,var(--glass-rim-ink)_calc(22%*var(--glass-rim,1)),transparent),inset_-1px_-2px_4px_-2px_color-mix(in_oklab,var(--glass-rim-ink)_calc(11%*var(--glass-rim,1)),transparent)]",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-[var(--glass-rim-width,0.5px)] before:content-['']",
    "before:bg-[linear-gradient(135deg,color-mix(in_oklab,var(--glass-rim-ink)_calc(26%*var(--glass-rim,1)),transparent),transparent_28%,transparent_72%,color-mix(in_oklab,var(--glass-rim-ink)_calc(14%*var(--glass-rim,1)),transparent))]",
    "before:[mask-image:linear-gradient(#000_0_0),linear-gradient(#000_0_0)] before:[mask-clip:content-box,border-box] before:[mask-composite:exclude]",
    // Focus is @ag/tokens' ring, the keyboard's only: a fine line just off the
    // glass's edge in the content's colour, following its radius.
    "disabled:pointer-events-none disabled:[&>svg]:opacity-40",
    "forced-colors:border forced-colors:before:hidden",
  ],
  {
    variants: {
      tone: {
        auto: "bg-[color-mix(in_oklab,var(--glass-hue,transparent)_var(--glass-hue-amount,0%),var(--glass-tint,rgb(238_241_245/0.64)))] text-foreground backdrop-saturate-100 backdrop-blur-[var(--glass-blur,5px)] shadow-[0_0_0_0.5px_rgb(24_32_44/0.08),0_2px_5px_-2px_rgb(24_32_44/0.24),0_8px_20px_-8px_rgb(24_32_44/0.22),inset_0_1px_0_rgb(255_255_255/0.7),inset_0_-0.5px_0_rgb(24_32_44/0.2)] dark:bg-[color-mix(in_oklab,var(--glass-hue-deep,var(--glass-hue,transparent))_var(--glass-hue-amount,0%),var(--glass-tint,rgb(16_16_18/0.6)))] dark:backdrop-saturate-125 dark:backdrop-blur-[var(--glass-blur,6px)] dark:shadow-[0_4px_16px_-6px_rgb(0_0_0/0.28),inset_1px_2px_4px_-2px_color-mix(in_oklab,var(--glass-rim-ink)_calc(22%*var(--glass-rim,1)),transparent),inset_-1px_-2px_4px_-2px_color-mix(in_oklab,var(--glass-rim-ink)_calc(11%*var(--glass-rim,1)),transparent)] supports-[not(backdrop-filter:blur(1px))]:bg-background/95",
        light:
          "bg-[color-mix(in_oklab,var(--glass-hue,transparent)_var(--glass-hue-amount,0%),var(--glass-tint,rgb(238_241_245/0.64)))] text-zinc-950 backdrop-saturate-100 backdrop-blur-[var(--glass-blur,5px)] shadow-[0_0_0_0.5px_rgb(24_32_44/0.08),0_2px_5px_-2px_rgb(24_32_44/0.24),0_8px_20px_-8px_rgb(24_32_44/0.22),inset_0_1px_0_rgb(255_255_255/0.7),inset_0_-0.5px_0_rgb(24_32_44/0.2)] supports-[not(backdrop-filter:blur(1px))]:bg-zinc-100/95",
        dark: "bg-[color-mix(in_oklab,var(--glass-hue-deep,var(--glass-hue,transparent))_var(--glass-hue-amount,0%),var(--glass-tint,rgb(16_16_18/0.6)))] text-zinc-50 supports-[not(backdrop-filter:blur(1px))]:bg-zinc-950/95",
      },
      shape: {
        surface: "",
        circle: "inline-grid size-10 shrink-0 place-items-center rounded-full",
        pill: "inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2",
        bar: "inline-flex items-center gap-1 rounded-full p-1.5",
        card: "rounded-3xl p-5",
      },
    },
    defaultVariants: { tone: "auto", shape: "card" },
  },
);

export type GlassTone = NonNullable<VariantProps<typeof glassVariants>["tone"]>;
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
};

export type GlassProps<T extends React.ElementType = "div"> = {
  /** Render a native element or a component that forwards className and ref. */
  as?: T;
  shape?: GlassShape;
  tone?: GlassTone;
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
  className?: string;
  style?: GlassStyle;
} & Omit<
  React.ComponentPropsWithRef<T>,
  | "as"
  | "shape"
  | "tone"
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

/** Style with Tailwind, compose with `as`, and pass native props/ref directly. */
export function Glass<T extends React.ElementType = "div">({
  as,
  shape = "card",
  tone = "auto",
  rim,
  rimWidth,
  rimColor,
  tint,
  tintAmount = 0.12,
  className,
  style,
  ...props
}: GlassProps<T>) {
  return React.createElement(as ?? "div", {
    "data-slot": "glass",
    "data-shape": shape,
    "data-tone": tone,
    ...(as === "button" ? { type: "button" } : {}),
    ...props,
    style: {
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
      ...style,
    },
    className: cn(glassVariants({ shape, tone }), className),
  });
}

/** A pane of glass in two surfaces, one edge round both. The BACK surface is
 *  the pane's body, what its content lies on. The FRONT surface is a strip of
 *  glass in front of the content, across the top or along the foot
 *  (`frontAt`), part of the pane, not a piece laid on it: it takes the pane's
 *  corners on its side, its inner edge is one straight lit hairline, and it
 *  blurs what passes under it, so content running beneath it (a board's
 *  columns under their names, a card's body above its footer) is seen through
 *  it only as light. The pane's rim runs unbroken over both.
 *
 *  Each surface takes its own colour, `backColor` and `frontColor`, any CSS
 *  colour, thin enough to stay glass; set on that surface alone, so a pane
 *  inside a pane (a card on a board) keeps its own. `tint` hues the whole
 *  pane, both surfaces and the edge. The front is `frontHeight` tall (3rem),
 *  told to the content as `--glass-pane-front-height` to pad by; its blur is
 *  `--glass-pane-front-blur` (12px). */
export function GlassPane({
  front,
  frontAt = "top",
  frontHeight = "3rem",
  frontColor,
  frontClassName,
  backColor,
  radius = "1rem",
  tone,
  rim,
  rimWidth,
  rimColor,
  tint,
  tintAmount,
  className,
  style,
  children,
  ...props
}: Omit<GlassProps<"div">, "as" | "shape"> & {
  /** The corners, any CSS length: the pane's, its front surface's and its rim's, one
   *  value (the rim is an SVG stroke, which takes it as a number, not a class). */
  radius?: string;
  /** What the front surface holds (column names, a title, a card's footer).
   *  No front surface without it. */
  front?: React.ReactNode;
  /** Where the front surface lies: across the top (a board's column names,
   *  content scrolling up beneath it) or along the foot (a card's footer,
   *  the content padding its bottom by `--glass-pane-front-height`). */
  frontAt?: "top" | "bottom";
  frontHeight?: string;
  /** The front surface's colour (default: the page's background at 55%,
   *  hued by `tint`). */
  frontColor?: string;
  /** Classes on the front surface, e.g. `max-sm:hidden` where a narrow
   *  layout labels its content another way (the content then pads nothing
   *  there either: pad by `--glass-pane-front-height` under the same
   *  condition). */
  frontClassName?: string;
  /** The back surface's colour (default: the glass's own, `--glass-tint`). */
  backColor?: string;
  children?: React.ReactNode;
}) {
  const glass = { tone, rim, rimWidth, rimColor, tint, tintAmount };
  const edge = `glass-pane-edge-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // In layers, bottom to top: the back surface (fill, blur, the shadow it
  // casts), what the pane holds (and any fog over it), the front surface,
  // and the edge (rim and inner glow). The root itself carries no blur: a
  // backdrop blur nested inside another sees nothing between the two, so a
  // pane that blurred on its root left its front surface unable to blur the
  // content passing under it. Content that fades at the pane's edge should fade
  // itself out (a mask), revealing the pane's own glass, never paint a coat
  // over it, which would hide where the pane ends.
  return (
    <div
      data-slot="glass-pane"
      // The light the rim catches, as Glass defines it, for the front
      // surface's hairline. A pane that moves (a card lifting under the
      // pointer) and catches more light does both as one gesture: the same
      // ease and length as GlassDisplay's lift, the light trailing the
      // movement by a breath, coming and going alike.
      className={cn(
        "relative isolate [--glass-rim-ink:var(--glass-rim-color,color-mix(in_oklab,var(--glass-hue,white)_calc(var(--glass-hue-amount,0%)*3),white))]",
        "[transition:translate_500ms_cubic-bezier(0.22,1,0.36,1),scale_500ms_cubic-bezier(0.22,1,0.36,1),--glass-rim_500ms_cubic-bezier(0.22,1,0.36,1)_40ms]",
        className,
      )}
      style={
        {
          borderRadius: radius,
          "--glass-pane-front-height": front ? frontHeight : "0px",
          ...(rim === undefined ? {} : { "--glass-rim": rim }),
          ...(rimColor === undefined ? {} : { "--glass-rim-color": rimColor }),
          // The tint on the root, so both surfaces and the edge wear it.
          ...(tint === undefined
            ? {}
            : {
                "--glass-hue": rimInk(tint),
                "--glass-hue-deep": deepInk(tint),
                "--glass-hue-amount": `${(tintAmount ?? 0.12) * 100}%`,
                ...(rimColor === undefined
                  ? { "--glass-rim-ink": rimInk(tint) }
                  : {}),
              }),
          ...style,
        } as GlassStyle
      }
      {...props}
    >
      <Glass
        {...glass}
        shape="surface"
        aria-hidden
        data-slot="glass-pane-back"
        // The back surface is fill and the shadow it casts outward, nothing
        // more: its edge (rim and inner glow) is the top layer's, so whatever
        // lies between (a fog, the front surface) can reach the very edge
        // without covering it.
        style={
          backColor === undefined ? undefined : { "--glass-tint": backColor }
        }
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] shadow-[0_4px_16px_-6px_rgb(0_0_0/0.28)] before:hidden dark:shadow-[0_4px_16px_-6px_rgb(0_0_0/0.28)]"
      />
      {front && (
        <div
          data-slot="glass-pane-front"
          data-at={frontAt}
          style={{
            backgroundColor:
              frontColor ??
              "color-mix(in oklab, var(--glass-hue, transparent) var(--glass-hue-amount, 0%), color-mix(in oklab, var(--background) 55%, transparent))",
          }}
          className={cn(
            // Its corners are the pane's own (top corners at the top, bottom
            // ones at the foot), rounded here and never cut by a clip (a blur
            // cut at a rounded clip draws jagged corners). Its inner edge is
            // one unbroken hairline (::after) lit from where the rim is lit,
            // brightest at the left and dimming evenly to the right. It casts
            // no shadow: its edge and its blur say where it begins, and a
            // shadow with nothing under it is a smear.
            "absolute inset-x-0 z-10 h-(--glass-pane-front-height) backdrop-blur-[var(--glass-pane-front-blur,12px)] backdrop-saturate-125",
            "after:pointer-events-none after:absolute after:inset-x-0 after:h-(--glass-rim-width,0.5px) after:content-[''] after:bg-[linear-gradient(90deg,color-mix(in_oklab,var(--glass-rim-ink)_calc(22%*var(--glass-rim,1)),transparent),color-mix(in_oklab,var(--glass-rim-ink)_calc(6%*var(--glass-rim,1)),transparent))]",
            frontAt === "top"
              ? "top-0 rounded-tl-[inherit] rounded-tr-[inherit] after:bottom-0"
              : "bottom-0 rounded-bl-[inherit] rounded-br-[inherit] after:top-0",
            frontClassName,
          )}
        >
          {front}
        </div>
      )}
      {/* What the pane holds, clipped to its rounded shape here and not on
          the root, so the front surface (outside this clip) keeps smooth
          corners. */}
      <div className="relative overflow-hidden rounded-[inherit]">
        {children}
      </div>
      {/* The edge, the top layer, over everything the pane holds: the
          glass's inner glow (its inset light) and its rim. The rim is an SVG
          stroke, the one hairline a browser always anti-aliases round a curve
          (a masked ring, glass's own way, steps on the corners): light
          catching at the top-left, fading along the sides, a softer catch at
          the bottom-right, the material's 135° fall. The stroke straddles the
          edge and this layer clips its outer half, leaving half a pixel
          inside, the rim's own width. */}
      <div
        aria-hidden
        data-slot="glass-pane-edge"
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit] shadow-[inset_1px_2px_4px_-2px_color-mix(in_oklab,var(--glass-rim-ink)_calc(22%*var(--glass-rim,1)),transparent),inset_-1px_-2px_4px_-2px_color-mix(in_oklab,var(--glass-rim-ink)_calc(11%*var(--glass-rim,1)),transparent)]"
      >
        <svg
          aria-hidden
          className="absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <linearGradient id={edge} x1="0" y1="0" x2="1" y2="1">
              <stop
                offset="0"
                style={{
                  stopColor: "var(--glass-rim-ink)",
                  stopOpacity: "calc(0.26 * var(--glass-rim, 1))",
                }}
              />
              <stop offset="0.28" stopOpacity={0} />
              <stop offset="0.72" stopOpacity={0} />
              <stop
                offset="1"
                style={{
                  stopColor: "var(--glass-rim-ink)",
                  stopOpacity: "calc(0.14 * var(--glass-rim, 1))",
                }}
              />
            </linearGradient>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="none"
            stroke={`url(#${edge})`}
            strokeWidth={1}
            style={{ rx: radius, ry: radius }}
          />
        </svg>
      </div>
    </div>
  );
}

/** A small label of glass: a stack's tool, a status, a version. Metadata's voice
 *  (mono, small, lowercase), a pill a step below a button's smallest size, and
 *  not interactive unless `as` makes it a link. Every glass prop (tone, rim,
 *  tint) passes through; `tint` stains it a status's colour. */
export function GlassBadge<T extends React.ElementType = "span">({
  as,
  className,
  ...props
}: Omit<GlassProps<T>, "shape">) {
  return (
    <Glass
      as={(as ?? "span") as React.ElementType}
      shape="surface"
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-mono text-[11px] lowercase text-current/80 [--glass-blur:8px] [&_svg]:size-3 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/** A card of glass that says what it holds: a title and a line under it, then
 *  the content. Every glass prop (tone, rim, tint) passes through. */
export function GlassCard({
  title,
  description,
  className,
  children,
  ...props
}: Omit<GlassProps<"section">, "as" | "shape" | "title"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <Glass
      as="section"
      shape="card"
      className={cn("flex flex-col gap-4", className)}
      {...(props as Omit<GlassProps<"section">, "as" | "shape">)}
    >
      {(title || description) && (
        <header className="space-y-0.5">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          {description && (
            <p className="text-xs text-current/60">{description}</p>
          )}
        </header>
      )}
      {children}
    </Glass>
  );
}

/** A glass button's sizes: a rounded pill at three heights, and the same three as
 *  icon-only circles. An icon inside takes the size's own icon size unless it
 *  sets one. */
export const glassButtonVariants = cva(
  [
    // One pointer over every control, a link or a button alike (a browser
    // gives a link the hand and a button the arrow).
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap font-medium select-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    // Under the pointer the rim catches more light. Pressed, it swells a little
    // on a spring and settles back on release, as macOS glass controls do; the
    // release eases out slower than the press comes in. Its rim answers to the
    // control alone (--glass-rim set here, not inherited): a card that
    // brightens its own edge under the pointer must not brighten the buttons
    // inside it. `rim` still sets it. The light eases with the rest
    // (liquid-glass.css registers it), on the same spring.
    "transition-[box-shadow,background-color,color,scale,--glass-rim] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:duration-150",
    "[--glass-rim:1] hover:[--glass-rim:1.5] active:scale-[1.06] motion-reduce:active:scale-100",
  ],
  {
    variants: {
      size: {
        sm: "h-8 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-10 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 px-5 text-base [&_svg:not([class*='size-'])]:size-5",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        icon: "size-10 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
      /** The corners: a pill (a circle when icon-only), or soft corners, the
       *  look of a plain button and of the menu it may open. */
      corners: {
        pill: "rounded-full",
        soft: "rounded-[10px]",
      },
    },
    defaultVariants: { size: "md", corners: "pill" },
  },
);

export type GlassButtonSize = NonNullable<
  VariantProps<typeof glassButtonVariants>["size"]
>;
export type GlassButtonCorners = NonNullable<
  VariantProps<typeof glassButtonVariants>["corners"]
>;

export type GlassButtonProps<T extends React.ElementType = "button"> = Omit<
  GlassProps<T>,
  "shape"
> & {
  size?: GlassButtonSize;
  corners?: GlassButtonCorners;
};

/** A button made of glass: a pill, or an icon-only circle (`size="icon"`), or with
 *  `corners="soft"` a plain button's shape. It is a `<button>` unless `as` makes
 *  it something else, a link most often, and every glass prop (tone, rim, tint)
 *  passes through. */
export function GlassButton<T extends React.ElementType = "button">({
  as,
  size,
  corners,
  className,
  ...props
}: GlassButtonProps<T>) {
  return (
    <Glass
      as={(as ?? "button") as React.ElementType}
      shape="surface"
      className={cn(glassButtonVariants({ size, corners }), className)}
      {...props}
    />
  );
}

export type GlassToggleProps<T extends React.ElementType = "button"> =
  GlassButtonProps<T> & {
    /** Whether it is on. Controlled: the page owns the state (a click handler,
     *  or a form whose server answer re-renders it), so a toggle can be a form's
     *  submit button with no client code at all. */
    pressed: boolean;
    /** What it says when on, and when off ("following", "follow"). Given both,
     *  the toggle holds the width of the wider, both laid in one cell with the
     *  other hidden, so pressing it never moves what sits beside it. Without
     *  them, `children` is shown as is. */
    on?: React.ReactNode;
    off?: React.ReactNode;
  };

/** A glass button that stays pressed: `aria-pressed` says so to assistive tech,
 *  and on it wears the text's own colour, faintly, in its glass, with a brighter
 *  rim, so on and off differ in light, never in size. */
export function GlassToggle<T extends React.ElementType = "button">({
  pressed,
  on,
  off,
  className,
  children,
  ...props
}: GlassToggleProps<T>) {
  const face = (node: React.ReactNode, shown: boolean) => (
    <span
      aria-hidden={!shown}
      className={cn(
        "col-start-1 row-start-1 inline-flex items-center justify-center gap-[inherit]",
        !shown && "invisible",
      )}
    >
      {node}
    </span>
  );
  return (
    <GlassButton
      aria-pressed={pressed}
      data-pressed={pressed || undefined}
      className={cn(
        "data-[pressed]:[--glass-hue-amount:16%] data-[pressed]:[--glass-hue:currentColor] data-[pressed]:[--glass-rim:1.8]",
        className,
      )}
      {...(props as GlassButtonProps<T>)}
    >
      {on !== undefined && off !== undefined ? (
        <span className="grid gap-[inherit]">
          {face(on, pressed)}
          {face(off, !pressed)}
        </span>
      ) : (
        children
      )}
    </GlassButton>
  );
}
