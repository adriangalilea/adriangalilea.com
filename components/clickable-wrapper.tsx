"use client";

import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  createContext,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
} from "react";
import { Link } from "@/components/link";
import { cn } from "@/lib/utils";

const CardInteraction = createContext<
  RefObject<HTMLElement | null> | undefined
>(undefined);
export const useCardInteraction = () => useContext(CardInteraction);

type ClickableWrapperProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

// A CARD IS A POINTER SHORTCUT TO A LINK IT CARRIES. Every card holds one real
// `<a href>` to its own page (a page's title, a note's meta line): that is what a
// crawler follows, what the keyboard reaches and what a middle click or "copy link"
// acts on. The rest of the card opens the same place on a click, the way an embedded
// post opens the post, and keeps everything a reader expects of it: a link or a button
// inside does its own thing, a click that ends a text selection goes nowhere, a drag
// that starts on the card's own link opens nothing either, and ⌘, Ctrl or the middle
// button open a new tab, as on the link. The card itself is no tab stop: the keyboard
// goes through that link, so one place is one stop.

/** How far the pointer may travel between press and release for it to be a click on
 *  the card's own link, in CSS px: a hand's jitter, never a drag. */
const CLICK_SLOP_PX = 4;

/** The card's own link. A drag across it selects its words, as when they were plain
 *  text: Chromium needs both halves, `draggable={false}` alone selects nothing and
 *  `select-text` alone still drags the link. WebKit never selects a link's words on a
 *  drag (Option-drag does), and with `draggable={false}` would take the release as a
 *  click, which the card refuses (`CLICK_SLOP_PX`). The card finds it by
 *  `data-card-own`. */
export function OwnLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      draggable={false}
      data-card-own=""
      className={cn("select-text", className)}
    />
  );
}

export function ClickableWrapper({
  href,
  className,
  children,
}: ClickableWrapperProps) {
  const router = useRouter();
  const interactionRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);
  const pressedAt = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: MouseEvent) => {
    isDragging.current = false;
    pressedAt.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = () => {
    isDragging.current = true;
  };

  const endsSelection = () =>
    isDragging.current && (window.getSelection()?.toString().length ?? 0) > 0;

  /** Whether a click on the card is the card's: not one on a link or a button inside,
   *  not one inside a nested card or bubbling from a portal (the lightbox: React
   *  bubbles it through the tree, never through the DOM), not the end of a text
   *  selection. */
  const ownClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-card]") !== e.currentTarget) return false;
    if (target.closest("a, button")) return false;
    return !endsSelection();
  };

  // Before the card's link sees it: a release that ends a drag there opens nothing, and
  // next/link skips a prevented click. A keyboard's click has no press to measure.
  const handleClickCapture = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest("[data-card-own]")) return;
    const from = pressedAt.current;
    if (e.detail === 0 || !from) return;
    const travel = Math.hypot(e.clientX - from.x, e.clientY - from.y);
    if (travel > CLICK_SLOP_PX) e.preventDefault();
  };

  const handleClick = (e: MouseEvent) => {
    if (!ownClick(e)) return;
    if (e.metaKey || e.ctrlKey) window.open(href, "_blank", "noopener");
    else router.push(href);
  };

  const handleAuxClick = (e: MouseEvent) => {
    if (e.button !== 1 || !ownClick(e)) return;
    window.open(href, "_blank", "noopener");
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard's way is that inner link; a second stop would duplicate it
    <article
      ref={interactionRef}
      data-card
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onClickCapture={handleClickCapture}
      onClick={handleClick}
      onAuxClick={handleAuxClick}
      className={className}
    >
      <CardInteraction.Provider value={interactionRef}>
        {children}
      </CardInteraction.Provider>
    </article>
  );
}
