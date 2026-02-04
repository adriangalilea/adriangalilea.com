"use client";

import { useRef } from "react";
import { AnchorProvider, ScrollProvider, TOCItem, type TOCItemType } from "fumadocs-core/toc";

export function BlogTOC({ items }: { items: TOCItemType[] }) {
	const containerRef = useRef<HTMLDivElement>(null);

	if (items.length === 0) return null;

	return (
		<nav className="hidden lg:block sticky top-20 h-fit max-h-[calc(100vh-6rem)] w-[200px] shrink-0">
			<p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">On this page</p>
			<AnchorProvider toc={items} single>
				<div ref={containerRef} className="overflow-y-auto max-h-[calc(100vh-8rem)] scrollbar-none">
					<ScrollProvider containerRef={containerRef}>
						{items.map((item) => (
							<TOCItem
								key={item.url}
								href={item.url}
								className="block py-1 text-sm text-muted-foreground/70 transition-colors hover:text-foreground data-[active=true]:text-foreground"
								style={{ paddingLeft: `${(item.depth - 2) * 12}px` }}
							>
								{item.title}
							</TOCItem>
						))}
					</ScrollProvider>
				</div>
			</AnchorProvider>
		</nav>
	);
}
