"use client";

import Image from "next/image";
import { useState } from "react";
import { slugToGradient } from "@/lib/gradient";

function GrainOverlay() {
	return <div className="cover-grain absolute inset-0 z-10 pointer-events-none" />;
}

export function CoverImage({ coverUrl, slug, title, size = "large", sizes, priority }: { coverUrl: string | null; slug: string; title: string; size?: "large" | "small"; sizes?: string; priority?: boolean }) {
	const [loaded, setLoaded] = useState(false);

	if (coverUrl) {
		const bgBlur = size === "small"
			? "absolute inset-0 h-full w-full scale-[2] object-cover blur-2xl"
			: "absolute inset-0 h-full w-full scale-150 object-cover blur-3xl opacity-60";
		return (
			<div className={`relative h-full w-full overflow-hidden ${size === "large" ? "bg-black" : ""}`}>
				<img src={coverUrl} alt="" aria-hidden className={bgBlur} />
				<Image
					src={coverUrl}
					alt={title}
					fill
					className={`relative object-contain transition-opacity duration-1000 ease-in-out ${loaded ? "opacity-100" : "opacity-0"}`}
					sizes={sizes ?? "100vw"}
					priority={priority}
					onLoad={() => setLoaded(true)}
				/>
				<GrainOverlay />
			</div>
		);
	}
	return (
		<div className="relative h-full w-full overflow-hidden" style={{ background: slugToGradient(slug) }}>
			<GrainOverlay />
		</div>
	);
}
