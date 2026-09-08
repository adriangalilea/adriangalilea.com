"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
} from "react";

const CardInteraction = createContext<
  RefObject<HTMLElement | null> | undefined
>(undefined);
export const useCardInteraction = () => useContext(CardInteraction);

type ClickableWrapperProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function ClickableWrapper({
  href,
  className,
  children,
}: ClickableWrapperProps) {
  const router = useRouter();
  const interactionRef = useRef<HTMLElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = () => {
    isDragging.current = false;
  };
  const handleMouseMove = () => {
    isDragging.current = true;
  };

  const handleClick = (e: MouseEvent) => {
    if (!e.currentTarget.contains(e.target as Node)) return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (isDragging.current) {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;
    }
    router.push(href);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && e.target === e.currentTarget) router.push(href);
  };

  return (
    <article
      ref={interactionRef}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
    >
      <CardInteraction.Provider value={interactionRef}>
        {children}
      </CardInteraction.Provider>
    </article>
  );
}
