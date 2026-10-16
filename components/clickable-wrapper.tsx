"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
} from "react";
import { CardLink } from "@/components/ui/card-link";

// A FEED CARD: ui's `card-link` (a click anywhere opens the card's page, links and
// buttons inside do their own thing, a selection is reading, the innermost card wins,
// ⌘/Ctrl or the middle button open a new tab) going through the site's router. The
// keyboard and crawlers reach the page through the real link every card carries (a
// page's or folder's title, a note's meta line). What is the site's own: the card is
// where its cover video's hover and focus are read (`useCardInteraction`).

const CardInteraction = createContext<
  RefObject<HTMLElement | null> | undefined
>(undefined);
export const useCardInteraction = () => useContext(CardInteraction);

export function ClickableWrapper({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const interactionRef = useRef<HTMLDivElement>(null);
  return (
    <CardLink
      ref={interactionRef}
      href={href}
      navigate={router.push}
      className={className}
    >
      <CardInteraction.Provider value={interactionRef}>
        {children}
      </CardInteraction.Provider>
    </CardLink>
  );
}
