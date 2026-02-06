"use client";

import { useState, useEffect, useRef } from "react";

export function HideOnScroll({ children, className }: { children: React.ReactNode; className?: string }) {
	const [visible, setVisible] = useState(true);
	const lastY = useRef(0);

	useEffect(() => {
		const onScroll = () => {
			const y = window.scrollY;
			setVisible(y < 50 || y < lastY.current);
			lastY.current = y;
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<div
			className={`transition-transform duration-300 ${visible ? "translate-y-0" : "-translate-y-full"} ${className ?? ""}`}
		>
			{children}
		</div>
	);
}
