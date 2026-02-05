"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type RelatedItem = {
	path: string;
	title?: string;
	description?: string;
	cover?: string | null;
	tags?: string[];
	publishedAt?: string;
};

const cardBase = "rounded-xl border border-white/10 bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-200 ease-out";
const cardHover = "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg hover:border-white/20";

function RelatedCard({ item }: { item: RelatedItem }) {
	const router = useRouter();
	const isDragging = useRef(false);

	const handleMouseDown = () => { isDragging.current = false; };
	const handleMouseMove = () => { isDragging.current = true; };

	const handleClick = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest("a")) return;
		if (isDragging.current) {
			const selection = window.getSelection();
			if (selection && selection.toString().length > 0) return;
		}
		router.push(item.path);
	};

	return (
		<article
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onClick={handleClick}
			className={cn("group cursor-pointer", cardBase, cardHover)}
		>
			{item.cover && (
				<div className="w-full overflow-hidden">
					<img src={item.cover} alt={item.title ?? ""} draggable={false} className="w-full h-auto" />
				</div>
			)}
			<div className="p-4">
				{item.tags && item.tags.length > 0 && (
					<p className="flex flex-wrap items-center gap-x-1.5 text-xs uppercase tracking-wide mb-1">
						{item.tags.slice(0, 3).map((t, i) => (
							<span key={t}>
								<span className="text-accent-pop">{t}</span>
								{i < Math.min(item.tags!.length, 3) - 1 && <span className="text-muted-foreground">,</span>}
							</span>
						))}
					</p>
				)}
				{item.title && (
					<h3 className="font-semibold leading-tight tracking-tight">{item.title}</h3>
				)}
				{item.description && (
					<p className="text-sm text-foreground-low mt-1 line-clamp-2">{item.description}</p>
				)}
				{item.publishedAt && (
					<time className="mt-2 block text-muted-foreground text-xs tabular-nums">
						{new Date(item.publishedAt).toLocaleDateString("en-US", {
							year: "numeric",
							month: "short",
							day: "numeric",
						})}
					</time>
				)}
			</div>
		</article>
	);
}

export function RelatedSection({ items }: { items: RelatedItem[] }) {
	const ref = useRef<HTMLElement>(null);
	const [active, setActive] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
					setActive(true);
				}
			},
			{ threshold: 0.3 }
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	return (
		<aside
			ref={ref}
			onMouseEnter={() => setActive(true)}
			className={cn(
				"mt-16 pt-8 border-t border-border/50 mx-auto max-w-[90rem] px-4 pb-16 transition-opacity duration-500",
				active ? "opacity-100" : "opacity-15"
			)}
		>
			<h2 className="text-sm font-medium text-foreground-low mb-6">Related</h2>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{items.map((item) => (
					<RelatedCard key={item.path} item={item} />
				))}
			</div>
		</aside>
	);
}
