"use client";

import { useEffect, useRef, useState } from "react";
import type { TOCItem } from "@/lib/content";

export function TOC({ items }: { items: TOCItem[] }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [activeId, setActiveId] = useState<string | null>(null);

	useEffect(() => {
		if (items.length === 0) return;

		const headingElements = items
			.map((item) => document.getElementById(item.id))
			.filter(Boolean) as HTMLElement[];

		if (headingElements.length === 0) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const visibleEntries = entries.filter((entry) => entry.isIntersecting);
				if (visibleEntries.length > 0) {
					const topmost = visibleEntries.reduce((prev, curr) =>
						prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr
					);
					setActiveId(topmost.target.id);
				}
			},
			{
				rootMargin: "-80px 0px -80% 0px",
				threshold: 0,
			}
		);

		for (const el of headingElements) {
			observer.observe(el);
		}

		return () => observer.disconnect();
	}, [items]);

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
