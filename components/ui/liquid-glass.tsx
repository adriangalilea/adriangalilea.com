import * as React from "react";
import {
  deepInk,
  Glass,
  type GlassProps,
  type GlassStyle,
  rimInk,
  schemeOf,
} from "@/components/ui/material-glass";
import { cn } from "@/lib/utils";

// THE GLASS COLLECTION: what glass makes that no base control is, and nothing that
// needs media. The material itself (glassVariants, Glass, GlassEdge, its light) is
// the `material` item's (material-glass), re-exported here; every base control has its
// own glass face (`material="glass"`: a button, a badge, a card, a field, a menu, a
// tooltip, the player's parts); the floating display round media is `glass-display`.
// Here: the two-surface pane and the gliding highlight (glass-glide).
export {
  deepInk,
  Glass,
  GlassEdge,
  type GlassLight,
  type GlassProps,
  type GlassShape,
  type GlassStyle,
  glassStyle,
  glassVariants,
  rimInk,
  type Scheme,
  schemeOf,
} from "@/components/ui/material-glass";

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
  scheme,
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
  const glass = { scheme, rim, rimWidth, rimColor, tint, tintAmount };
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
        // Its scheme on the whole pane, so what it holds reads on its glass (a
        // server component: given as a prop, not read from a provider).
        schemeOf(scheme ?? "auto"),
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
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] shadow-[0_4px_16px_-6px_rgb(0_0_0/0.28)] before:hidden scheme-dark:shadow-[0_4px_16px_-6px_rgb(0_0_0/0.28)]"
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
          corners. A plain clip, not clip-rounded: a mask would make this a
          backdrop root, and glass inside the pane would blur nothing. */}
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
