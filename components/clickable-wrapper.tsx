"use client";

import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useRef,
} from "react";

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
  const isDragging = useRef(false);

  const handleMouseDown = () => {
    isDragging.current = false;
  };
  const handleMouseMove = () => {
    isDragging.current = true;
  };

  const handleClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (isDragging.current) {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;
    }
    router.push(href);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") router.push(href);
  };

  return (
    <article
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
    >
      {children}
    </article>
  );
}
