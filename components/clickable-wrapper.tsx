"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode, type MouseEvent } from "react";

type ClickableWrapperProps = {
	href: string;
	className?: string;
	children: ReactNode;
};

export function ClickableWrapper({ href, className, children }: ClickableWrapperProps) {
	const router = useRouter();
	const isDragging = useRef(false);

	const handleMouseDown = () => { isDragging.current = false; };
	const handleMouseMove = () => { isDragging.current = true; };

	const handleClick = (e: MouseEvent) => {
		if ((e.target as HTMLElement).closest("a")) return;
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
