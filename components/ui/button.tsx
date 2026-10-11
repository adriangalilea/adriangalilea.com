"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import type * as React from "react";
import {
  type Material,
  type Scheme,
  useMaterial,
  useScheme,
} from "@/components/ui/material";
import {
  glassStyle,
  glassVariants,
  schemeOf,
} from "@/components/ui/material-glass";
import { Spinner, type SpinnerSize } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// THE BUTTON, one behaviour in two materials. Base UI's button underneath, so it is a
// real <button> (or, with `render`, a link that behaves as one), keeps its focus when
// a `loading` press makes it wait, and reports `data-disabled`. shadcn's six variants
// and its sizes, with two differences, both so a row of controls reads as one:
//
//   the heights are the input's (28, 32, 40 px), so a field and its button sit flush
//   in a row (shadcn's 32/36/40 leave the default a step taller than its field);
//   the colours are the registry's: the page's own foreground at alpha tiers for the
//   quiet variants, `tone-bad` (@ag/tokens) for destructive, one red everywhere.
//
// `material="glass"` draws the same button in liquid glass (material-glass): the
// collection's look, its rim lighting up under the hand, a press swelling it on a
// spring. Each variant keeps its meaning there: default is the glass itself, secondary
// a quieter glass, outline the rim alone, ghost nothing until the hand comes,
// destructive a glass stained red, link a line of text.
//
// `pressed` makes it a toggle: on, it wears the text's colour faintly, in its fill or
// its glass, never a change of size. Its state is said ONE way: `aria-pressed` on a
// fixed name, or, with `on`/`off`, the name itself changing ("follow", "following")
// and no aria-pressed, which would say it twice. `loading` keeps its width (the label
// stays, unseen but still its name) and turns a spinner in its middle; it cannot be
// pressed again. `scheme` is the colour scheme it stands in (material).

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon" | "icon-lg";
export type ButtonCorners = "pill" | "soft";

/** Every button, whatever it wears. An icon inside takes the size's icon size unless
 *  it sets one. */
const BASE =
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap font-medium select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

const SIZE: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
  md: "h-8 px-3 text-[13px] [&_svg:not([class*='size-'])]:size-4",
  lg: "h-10 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
  "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
  icon: "size-8 [&_svg:not([class*='size-'])]:size-4",
  "icon-lg": "size-10 [&_svg:not([class*='size-'])]:size-[18px]",
};

const SPINNER: Record<ButtonSize, SpinnerSize> = {
  sm: "sm",
  md: "md",
  lg: "md",
  "icon-sm": "sm",
  icon: "md",
  "icon-lg": "lg",
};

/** The plain faces: shadcn's default as the page's primary, the rest at the
 *  foreground's alpha tiers. */
const PLAIN: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90 data-pressed:shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)]",
  secondary:
    "bg-foreground/8 text-foreground hover:bg-foreground/12 data-pressed:bg-foreground/16",
  outline:
    "text-foreground ring-1 ring-foreground/15 ring-inset hover:bg-foreground/5 data-pressed:bg-foreground/10",
  ghost: "text-foreground hover:bg-foreground/8 data-pressed:bg-foreground/10",
  destructive:
    "bg-tone-bad text-white hover:bg-tone-bad/90 data-pressed:shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)]",
  link: "h-auto px-0 text-foreground underline-offset-4 hover:underline",
};

/** The glass that answers the hand: its rim catches more light under the pointer and
 *  a press swells it on a spring that settles back slower than it came, as macOS
 *  glass controls do. Its rim answers to the button alone (set here, not inherited),
 *  so a card that brightens its own edge does not brighten the buttons inside it. */
const GLASS_LIVE =
  "transition-[box-shadow,background-color,color,scale,--glass-rim] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:duration-150 [--glass-rim:1] hover:[--glass-rim:1.5] active:scale-[1.06] motion-reduce:active:scale-100";

/** On, a glass toggle wears the text's own colour in its glass, faintly, with a
 *  brighter rim: on and off differ in light, never in size. */
const GLASS_PRESSED =
  "data-pressed:[--glass-hue-amount:16%] data-pressed:[--glass-hue:currentColor] data-pressed:[--glass-rim:1.8]";

/** The glass faces, over the material's surface. A face's dark half is the
 *  scheme's (`scheme-dark:`), never the page's alone, or a dark glass on a light
 *  page would take the light half. */
const GLASS: Record<ButtonVariant, string> = {
  default: GLASS_PRESSED,
  secondary: `[--glass-tint:rgb(238_241_245/0.4)] scheme-dark:[--glass-tint:rgb(16_16_18/0.35)] [--glass-rim:0.7] hover:[--glass-rim:1.2] ${GLASS_PRESSED}`,
  outline: `bg-transparent backdrop-blur-none scheme-dark:bg-transparent scheme-dark:backdrop-blur-none ${GLASS_PRESSED}`,
  ghost: "",
  destructive: `text-tone-bad ${GLASS_PRESSED}`,
  link: "",
};

export type ButtonProps = Omit<
  React.ComponentProps<typeof BaseButton>,
  "className" | "style"
> & {
  style?: React.CSSProperties;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** A pill, or soft corners. Default: soft when plain, a pill in glass. */
  corners?: ButtonCorners;
  material?: Material;
  /** The colour scheme it stands in: the page's, or dark over a picture. Default
   *  the nearest MaterialProvider's. */
  scheme?: Scheme;
  /** A toggle's state: on or off. Unset, it is a plain button. */
  pressed?: boolean;
  /** A toggle's words on and off ("following", "follow"). Given both, the button
   *  holds the width of the wider, both laid in one cell with the other hidden, so
   *  pressing it never moves what sits beside it; `children` is then unused. */
  on?: React.ReactNode;
  off?: React.ReactNode;
  /** The press is being answered: a spinner in its middle, its width kept, no
   *  second press. */
  loading?: boolean;
  className?: string;
};

export function Button({
  variant = "default",
  size = "md",
  corners,
  material,
  scheme,
  pressed,
  on,
  off,
  loading = false,
  disabled,
  render,
  nativeButton,
  className,
  style,
  children: words,
  ...props
}: ButtonProps) {
  const m = useMaterial(material);
  const s = useScheme(scheme);
  const worded = on !== undefined && off !== undefined;
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
  const children = worded ? (
    <span className="grid gap-[inherit]">
      {face(on, pressed === true)}
      {face(off, pressed !== true)}
    </span>
  ) : (
    words
  );
  const glass = m === "glass" && variant !== "link" && variant !== "ghost";
  const round =
    (corners ?? (m === "glass" ? "pill" : "soft")) === "pill"
      ? "rounded-full"
      : m === "glass"
        ? "rounded-[10px]"
        : "rounded-md";
  return (
    <BaseButton
      data-slot="button"
      data-variant={variant}
      data-material={m}
      data-loading={loading || undefined}
      data-pressed={pressed || undefined}
      aria-pressed={worded ? undefined : pressed}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      // Waiting, it keeps the focus the press gave it: a keyboard user is not
      // thrown back to the page's start while the work runs.
      focusableWhenDisabled={loading}
      render={render}
      nativeButton={nativeButton ?? render === undefined}
      style={
        variant === "destructive" && m === "glass"
          ? {
              ...glassStyle({ tint: "var(--tone-bad)", tintAmount: 0.3 }),
              ...style,
            }
          : style
      }
      className={cn(
        BASE,
        SIZE[size],
        schemeOf(s),
        variant !== "link" && round,
        glass && [glassVariants({ shape: "surface" }), GLASS_LIVE],
        m === "glass"
          ? variant === "ghost"
            ? "text-current transition-colors hover:bg-foreground/8 data-pressed:bg-foreground/12"
            : GLASS[variant]
          : ["transition-[color,background-color,box-shadow]", PLAIN[variant]],
        variant === "link" && PLAIN.link,
        className,
      )}
      {...props}
    >
      {loading ? (
        // The label stays the button's name (transparent, never `invisible`, which
        // would take it out of the accessibility tree and leave "loading" as the
        // name); the spinner is the eye's, aria-busy already says it.
        <>
          <span className="inline-flex items-center gap-[inherit] opacity-0">
            {children}
          </span>
          <span aria-hidden className="absolute grid place-items-center">
            <Spinner size={SPINNER[size]} material={m} />
          </span>
        </>
      ) : (
        children
      )}
    </BaseButton>
  );
}
