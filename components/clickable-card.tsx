"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode, type MouseEvent } from "react";

type ClickableCardProps = {
	href: string;
	className?: string;
	children: ReactNode;
};

export function ClickableCard({ href, className, children }: ClickableCardProps) {
	const router = useRouter();
	const isDragging = useRef(false);

	const handleMouseDown = () => {
		isDragging.current = false;
	};

	const handleMouseMove = () => {
		isDragging.current = true;
	};

	const handleClick = (e: MouseEvent) => {
		// Don't navigate if clicking an actual link inside
		if ((e.target as HTMLElement).closest("a")) return;

		// Only block navigation if user was actively dragging to select
		if (isDragging.current) {
			const selection = window.getSelection();
			if (selection && selection.toString().length > 0) return;
		}

		router.push(href);
	};

	return (
		<article
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onClick={handleClick}
			className={className}
		>
			{children}
		</article>
	);
}
