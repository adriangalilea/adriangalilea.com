"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TOCItem } from "@/lib/content";

export function TOC({ items }: { items: TOCItem[] }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [activeId, setActiveId] = useState<string | null>(null);

	const updateActiveHeading = useCallback(() => {
		if (items.length === 0) return;

		const headingElements = items
			.map((item) => document.getElementById(item.id))
			.filter(Boolean) as HTMLElement[];

		if (headingElements.length === 0) return;

		// Find the heading that's closest to the top of the viewport (but below the navbar)
		const navbarOffset = 80;
		let activeHeading: string | null = null;

		for (const heading of headingElements) {
			const rect = heading.getBoundingClientRect();
			// If heading is above viewport top + offset, it's passed - this becomes the active one
			// until we find one that hasn't passed yet
			if (rect.top <= navbarOffset + 20) {
				activeHeading = heading.id;
			} else {
				// First heading below the threshold - stop here
				break;
			}
		}

		setActiveId(activeHeading);
	}, [items]);

	useEffect(() => {
		if (items.length === 0) return;

		// Initial update
		updateActiveHeading();

		// Update on scroll
		window.addEventListener("scroll", updateActiveHeading, { passive: true });

		return () => window.removeEventListener("scroll", updateActiveHeading);
	}, [items, updateActiveHeading]);

	if (items.length === 0) return null;

	return (
		<nav className="hidden lg:block sticky top-20 h-fit max-h-[calc(100vh-6rem)] w-[200px] shrink-0">
			<p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">On this page</p>
			<div ref={containerRef} className="overflow-y-auto max-h-[calc(100vh-8rem)] scrollbar-none">
				{items.map((item) => (
					<a
						key={item.id}
						href={`#${item.id}`}
						data-active={activeId === item.id}
						className="block py-1 text-sm text-muted-foreground/70 transition-colors hover:text-foreground data-[active=true]:text-foreground"
						style={{ paddingLeft: `${(item.depth - 2) * 12}px` }}
					>
						{item.title}
					</a>
				))}
			</div>
		</nav>
	);
}
