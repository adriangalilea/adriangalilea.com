"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Simple client wrapper for visibility - content rendered server-side
export function RelatedSection({ children }: { children: ReactNode }) {
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
			{children}
		</aside>
	);
}
