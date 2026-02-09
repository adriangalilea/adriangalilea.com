"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useRef, useState } from "react";
import { GlassSurface } from "@/components/liquid-glass";
import { cn } from "@/lib/utils";

type Props = {
  tags: string[];
  basePath: string;
};

function useScrollState(ref: React.RefObject<HTMLDivElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref, update]);

  return { canScrollLeft, canScrollRight };
}

function scroll(
  ref: React.RefObject<HTMLDivElement | null>,
  direction: -1 | 1,
) {
  ref.current?.scrollBy({ left: direction * 200, behavior: "smooth" });
}

function TagPill({
  active,
  children,
  ...props
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <Link className="shrink-0" {...props}>
      <GlassSurface
        shadow="md"
        className={cn(
          "block rounded-full px-3 py-1 text-sm whitespace-nowrap transition-colors",
          active
            ? "!bg-accent-pop-bg text-accent-pop"
            : "text-foreground-low hover:text-foreground",
        )}
      >
        {children}
      </GlassSurface>
    </Link>
  );
}

export function TagFilter({ tags, basePath }: Props) {
  const [currentTag, setTag] = useQueryState("tag");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight } = useScrollState(scrollRef);

  if (tags.length === 0) return null;

  return (
    <div className="relative mb-6 group/tags">
      {canScrollLeft && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
          <GlassSurface
            as="button"
            shadow="lg"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 size-7 rounded-full flex items-center justify-center text-foreground-lowest hover:text-foreground transition-colors hidden sm:flex"
            type="button"
            onClick={() => scroll(scrollRef, -1)}
          >
            <ChevronLeft className="size-3.5" />
          </GlassSurface>
        </>
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-none px-0.5 pr-8"
      >
        <TagPill
          active={!currentTag}
          href={basePath}
          onClick={(e) => {
            e.preventDefault();
            setTag(null);
          }}
        >
          All
        </TagPill>
        {tags.map((tag) => (
          <TagPill
            key={tag}
            active={currentTag === tag}
            href={`${basePath}?tag=${encodeURIComponent(tag)}`}
            onClick={(e) => {
              e.preventDefault();
              setTag(tag);
            }}
          >
            {tag}
          </TagPill>
        ))}
      </div>

      {canScrollRight && (
        <>
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />
          <GlassSurface
            as="button"
            shadow="lg"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 size-7 rounded-full flex items-center justify-center text-foreground-lowest hover:text-foreground transition-colors hidden sm:flex"
            type="button"
            onClick={() => scroll(scrollRef, 1)}
          >
            <ChevronRight className="size-3.5" />
          </GlassSurface>
        </>
      )}
    </div>
  );
}

// Server fallback - static links, all appear inactive
export function TagFilterFallback({ tags, basePath }: Props) {
  if (tags.length === 0) return null;

  return (
    <div className="relative mb-6">
      <div className="flex gap-2 overflow-x-auto scrollbar-none px-0.5 pr-8">
        <Link href={basePath} className="shrink-0">
          <GlassSurface
            shadow="md"
            className="block rounded-full px-3 py-1 text-sm whitespace-nowrap !bg-accent-pop-bg text-accent-pop"
          >
            All
          </GlassSurface>
        </Link>
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`${basePath}?tag=${encodeURIComponent(tag)}`}
            className="shrink-0"
          >
            <GlassSurface
              distortion
              shadow="md"
              className="block rounded-full px-3 py-1 text-sm whitespace-nowrap text-foreground-low hover:text-foreground transition-colors"
            >
              {tag}
            </GlassSurface>
          </Link>
        ))}
      </div>
    </div>
  );
}
