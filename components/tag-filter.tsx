"use client";

import Link from "next/link";
import { useQueryState } from "nuqs";
import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
	tags: string[];
	basePath: string;
};

const pill = "shrink-0 rounded-full px-3 py-1 text-sm whitespace-nowrap glass-card";
const pillActive = "!bg-accent-pop-bg text-accent-pop";
const pillInactive = "text-foreground-low hover:text-foreground-low hover:scale-[1.05] hover:-translate-y-0.5";

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

function scroll(ref: React.RefObject<HTMLDivElement | null>, direction: -1 | 1) {
	ref.current?.scrollBy({ left: direction * 200, behavior: "smooth" });
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
					<button
						type="button"
						onClick={() => scroll(scrollRef, -1)}
						className="absolute left-0 top-1/2 -translate-y-1/2 z-20 size-7 rounded-full glass-card-elevated flex items-center justify-center text-foreground-lowest hover:text-foreground transition-colors hidden sm:flex"
					>
						<ChevronLeft className="size-3.5" />
					</button>
				</>
			)}

			<div
				ref={scrollRef}
				className="flex gap-2 overflow-x-auto scrollbar-none px-0.5 pr-8"
			>
				<Link
					href={basePath}
					onClick={(e) => {
						e.preventDefault();
						setTag(null);
					}}
					className={`${pill} ${!currentTag ? pillActive : pillInactive}`}
				>
					All
				</Link>
				{tags.map((tag) => (
					<Link
						key={tag}
						href={`${basePath}?tag=${encodeURIComponent(tag)}`}
						onClick={(e) => {
							e.preventDefault();
							setTag(tag);
						}}
						className={`${pill} ${currentTag === tag ? pillActive : pillInactive}`}
					>
						{tag}
					</Link>
				))}
			</div>

			{canScrollRight && (
				<>
					<div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />
					<button
						type="button"
						onClick={() => scroll(scrollRef, 1)}
						className="absolute right-0 top-1/2 -translate-y-1/2 z-20 size-7 rounded-full glass-card-elevated flex items-center justify-center text-foreground-lowest hover:text-foreground transition-colors hidden sm:flex"
					>
						<ChevronRight className="size-3.5" />
					</button>
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
				<Link
					href={basePath}
					className={`${pill} ${pillActive}`}
				>
					All
				</Link>
				{tags.map((tag) => (
					<Link
						key={tag}
						href={`${basePath}?tag=${encodeURIComponent(tag)}`}
						className={`${pill} ${pillInactive}`}
					>
						{tag}
					</Link>
				))}
			</div>
		</div>
	);
}
