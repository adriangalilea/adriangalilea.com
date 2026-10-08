"use client";

import { Menu } from "@base-ui/react/menu";
import type * as React from "react";
import { GlassGlide } from "@/components/ui/glass-glide";
import { glassVariants } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";

// A dropdown made of glass, as the controls it drops from. Built on Base UI's
// menu (keyboard, typeahead, focus return, outside press), the parts named the
// way a dropdown's are:
//
//   <GlassMenu>
//     <GlassMenuTrigger render={<GlassButton corners="soft">sign in</GlassButton>} />
//     <GlassMenuContent>
//       <GlassMenuItem onClick={…}>github</GlassMenuItem>
//     </GlassMenuContent>
//   </GlassMenu>
//
// It never blocks the page: no scroll lock, which rewrites the body's padding and
// shifts any layout that reserves room with it. It opens at least as wide as its
// trigger with the soft corners of a soft glass button, so the two read as one
// thing. One highlight glides between the rows (GlassGlide); a row draws no
// background of its own, and a destructive row turns the glide red.

export function GlassMenu(props: Omit<Menu.Root.Props, "modal">) {
  return <Menu.Root modal={false} {...props} />;
}

/** The control that opens the menu; `render` makes any button the trigger. While
 *  open it carries `data-popup-open`. */
export const GlassMenuTrigger = Menu.Trigger;

export function GlassMenuContent({
  align = "end",
  side = "bottom",
  sideOffset = 6,
  className,
  children,
  ...props
}: Menu.Popup.Props &
  Pick<Menu.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="z-50 outline-none"
      >
        <Menu.Popup
          className={cn(
            glassVariants({ shape: "surface" }),
            "min-w-(--anchor-width) rounded-[10px] p-1 outline-none [--glass-blur:14px]",
            "transition-[opacity,translate] duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:-translate-y-1 data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        >
          <GlassGlide item="[role=menuitem]">{children}</GlassGlide>
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function GlassMenuItem({
  destructive,
  className,
  ...props
}: Menu.Item.Props & {
  /** A row that destroys: red words, a red glide. */
  destructive?: boolean;
}) {
  return (
    <Menu.Item
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-xs outline-none data-[disabled]:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
        destructive && "text-destructive [--glide-tone:var(--destructive)]",
        className,
      )}
      {...props}
    />
  );
}

/** A quiet line above the rows (the signed-in name), not a row itself. */
export function GlassMenuLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "truncate px-2.5 py-1.5 text-[11px] text-current/55",
        className,
      )}
      {...props}
    />
  );
}

export function GlassMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Separator>) {
  return (
    <Menu.Separator
      className={cn("mx-1.5 my-1 h-px bg-current/10", className)}
      {...props}
    />
  );
}
