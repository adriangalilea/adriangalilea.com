"use client";

import { useEffect, useRef } from "react";

export function HideOnScroll({ children, className }: { children: React.ReactNode; className?: string }) {
	const ref = useRef<HTMLDivElement>(null);
	const lastY = useRef(0);
	const offset = useRef(0);

	useEffect(() => {
		const onScroll = () => {
			const el = ref.current;
			if (!el) return;

			const y = window.scrollY;
			const delta = y - lastY.current;
			lastY.current = y;

			if (y < 10) {
				offset.current = 0;
			} else {
				const h = el.offsetHeight;
				offset.current = Math.max(-h, Math.min(0, offset.current - delta));
			}

			el.style.transform = `translateY(${offset.current}px)`;
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<div ref={ref} className={className ?? ""}>
			{children}
		</div>
	);
}
