"use client";

import { useQueryState } from "nuqs";
import type { ReactNode } from "react";

type Item = {
	path: string;
	tags: string[];
	content: ReactNode;
};

type Props = {
	items: Item[];
};

export function FilterableGrid({ items }: Props) {
	const [tag] = useQueryState("tag");

	const filteredItems = tag ? items.filter((item) => item.tags.includes(tag)) : items;

	return (
		<div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
			{filteredItems.map((item) => (
				<div key={item.path} className="break-inside-avoid mb-4">
					{item.content}
				</div>
			))}
		</div>
	);
}

// Server fallback - shows all items
export function GridFallback({ items }: { items: { path: string; content: ReactNode }[] }) {
	return (
		<div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
			{items.map((item) => (
				<div key={item.path} className="break-inside-avoid mb-4">
					{item.content}
				</div>
			))}
		</div>
	);
}
