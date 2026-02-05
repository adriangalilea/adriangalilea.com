"use client";

import Link from "next/link";
import { useQueryState } from "nuqs";

type Props = {
	tags: string[];
	basePath: string;
};

export function TagFilter({ tags, basePath }: Props) {
	const [currentTag, setTag] = useQueryState("tag");

	if (tags.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
			<Link
				href={basePath}
				onClick={(e) => {
					e.preventDefault();
					setTag(null);
				}}
				className={`text-sm transition-colors ${
					!currentTag ? "text-foreground" : "text-foreground-lowest hover:text-foreground"
				}`}
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
					className={`text-sm transition-colors ${
						currentTag === tag ? "text-foreground" : "text-foreground-lowest hover:text-foreground"
					}`}
				>
					{tag}
				</Link>
			))}
		</div>
	);
}

// Server fallback - static links, all appear inactive
export function TagFilterFallback({ tags, basePath }: Props) {
	if (tags.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
			<Link
				href={basePath}
				className="text-sm transition-colors text-foreground"
			>
				All
			</Link>
			{tags.map((tag) => (
				<Link
					key={tag}
					href={`${basePath}?tag=${encodeURIComponent(tag)}`}
					className="text-sm transition-colors text-foreground-lowest hover:text-foreground"
				>
					{tag}
				</Link>
			))}
		</div>
	);
}
