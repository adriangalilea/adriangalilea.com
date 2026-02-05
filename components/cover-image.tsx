"use client";

import Image from "next/image";
import { useState } from "react";
import { slugToGradient } from "@/lib/gradient";

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];

function isVideo(url: string): boolean {
	return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
}

function GrainOverlay() {
	return <div className="cover-grain absolute inset-0 z-10 pointer-events-none" />;
}

type CoverImageProps = {
	cover: string | null;
	slug: string;
	title: string;
	size?: "large" | "small";
	sizes?: string;
	priority?: boolean;
};

export function CoverImage({ cover, slug, title, size = "large", sizes, priority }: CoverImageProps) {
	const [loaded, setLoaded] = useState(false);

	if (cover) {
		if (isVideo(cover)) {
			return (
				<div className={`relative h-full w-full overflow-hidden ${size === "large" ? "bg-black" : ""}`}>
					<video
						src={cover}
						autoPlay
						loop
						muted
						playsInline
						className="absolute inset-0 h-full w-full object-cover"
					/>
					<GrainOverlay />
				</div>
			);
		}

		const bgBlur = size === "small"
			? "absolute inset-0 h-full w-full scale-[2] object-cover blur-2xl"
			: "absolute inset-0 h-full w-full scale-150 object-cover blur-3xl opacity-60";

		return (
			<div className={`relative h-full w-full overflow-hidden ${size === "large" ? "bg-black" : ""}`}>
				<img src={cover} alt="" aria-hidden draggable={false} className={bgBlur} />
				<Image
					src={cover}
					alt={title}
					fill
					draggable={false}
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
