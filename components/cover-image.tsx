"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { slugToGradient } from "@/lib/gradient";

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const GIF_EXTENSION = ".gif";

function isVideo(url: string): boolean {
	return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
}

function isGif(url: string): boolean {
	return url.toLowerCase().endsWith(GIF_EXTENSION);
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
	/** Use intrinsic sizing (for feed cards) vs fill (for page headers) */
	intrinsic?: boolean;
	/** Actual image dimensions for proper aspect ratio (prevents layout shift) */
	width?: number | null;
	height?: number | null;
	/** Static poster image for animated covers (shown until hover) */
	poster?: string | null;
	/** Play animation on hover only (for cards) vs autoplay (for page headers) */
	hoverPlay?: boolean;
};

function AnimatedCover({
	src,
	intrinsic,
	aspectRatio,
	hoverPlay,
	size,
}: {
	src: string;
	intrinsic: boolean;
	aspectRatio: number;
	hoverPlay: boolean;
	size: "large" | "small";
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const [userPaused, setUserPaused] = useState(false);
	const [isTouchDevice, setIsTouchDevice] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia("(hover: none)");
		setIsTouchDevice(mq.matches);
		const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	// Desktop hover-play: mouseenter/mouseleave on .group ancestor
	useEffect(() => {
		if (!hoverPlay || isTouchDevice) return;

		const container = containerRef.current;
		const video = videoRef.current;
		if (!container || !video) return;

		const group = container.closest(".group") || container.closest("[class*='group/']");
		if (!group) return;

		const handleEnter = () => {
			video.currentTime = 0;
			video.play();
		};

		const handleLeave = () => {
			video.pause();
			video.currentTime = 0;
		};

		group.addEventListener("mouseenter", handleEnter);
		group.addEventListener("mouseleave", handleLeave);

		return () => {
			group.removeEventListener("mouseenter", handleEnter);
			group.removeEventListener("mouseleave", handleLeave);
		};
	}, [hoverPlay, isTouchDevice]);

	// Mobile viewport-play: IntersectionObserver autoplay when visible
	useEffect(() => {
		if (!hoverPlay || !isTouchDevice) return;

		const video = videoRef.current;
		const container = containerRef.current;
		if (!video || !container) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !userPaused) {
					video.play();
				} else {
					video.pause();
				}
			},
			{ threshold: 0.5 },
		);

		observer.observe(container);
		return () => observer.disconnect();
	}, [hoverPlay, isTouchDevice, userPaused]);

	// Click/tap toggle for all interactive cases
	const handleClick = () => {
		const video = videoRef.current;
		if (!video) return;

		if (video.paused) {
			setUserPaused(false);
			video.play();
		} else {
			setUserPaused(true);
			video.pause();
		}
	};

	const isClickable = !hoverPlay || isTouchDevice;

	return (
		<div
			ref={containerRef}
			className={`relative ${intrinsic ? "" : "h-full w-full"} overflow-hidden ${size === "large" ? "bg-black" : ""} ${isClickable ? "cursor-pointer" : ""}`}
			style={intrinsic ? { aspectRatio } : undefined}
			onClick={isClickable ? handleClick : undefined}
		>
			<video
				ref={videoRef}
				src={src}
				autoPlay={!hoverPlay}
				loop
				muted
				playsInline
				preload="auto"
				className={`${intrinsic ? "w-full h-full object-cover" : "absolute inset-0 h-full w-full object-cover"}`}
			/>
			<GrainOverlay />
		</div>
	);
}

export function CoverImage({ cover, slug, title, size = "large", sizes, priority, intrinsic, width, height, poster, hoverPlay }: CoverImageProps) {
	const [loaded, setLoaded] = useState(false);

	// Default dimensions if not provided
	const imgWidth = width ?? 1200;
	const imgHeight = height ?? 630;
	const aspectRatio = imgWidth && imgHeight ? imgWidth / imgHeight : 16 / 9;

	if (cover) {
		// Videos - use AnimatedCover for hover-play behavior
		if (isVideo(cover)) {
			return (
				<AnimatedCover
					src={cover}
					intrinsic={intrinsic ?? false}
					aspectRatio={aspectRatio}
					hoverPlay={hoverPlay ?? false}
					size={size}
				/>
			);
		}

		// GIFs - if hoverPlay is requested and we have a poster, use overlay technique
		if (isGif(cover)) {
			if (hoverPlay && poster) {
				return (
					<div
						className={`group relative ${intrinsic ? "" : "h-full w-full"} overflow-hidden`}
						style={intrinsic ? { aspectRatio } : undefined}
					>
						<img
							src={poster}
							alt={title}
							draggable={false}
							className={`${intrinsic ? "w-full h-full object-cover" : "absolute inset-0 h-full w-full object-cover"} transition-opacity duration-300 group-hover:opacity-0`}
						/>
						<img
							src={cover}
							alt={title}
							draggable={false}
							className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 opacity-0 group-hover:opacity-100`}
						/>
						<GrainOverlay />
					</div>
				);
			}
			return (
				<div
					className={`relative ${intrinsic ? "" : "h-full w-full"} overflow-hidden`}
					style={intrinsic ? { aspectRatio } : undefined}
				>
					<img
						src={cover}
						alt={title}
						draggable={false}
						className={intrinsic ? "w-full h-full object-cover" : "absolute inset-0 h-full w-full object-cover"}
					/>
					<GrainOverlay />
				</div>
			);
		}

		// Intrinsic mode for feed cards - use actual dimensions
		if (intrinsic) {
			return (
				<div className="relative overflow-hidden">
					<Image
						src={cover}
						alt={title}
						width={imgWidth}
						height={imgHeight}
						draggable={false}
						className={`w-full h-auto transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
						sizes={sizes ?? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"}
						priority={priority}
						onLoad={() => setLoaded(true)}
					/>
					<GrainOverlay />
				</div>
			);
		}

		// Fill mode for page headers - requires parent with dimensions
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

	// Fallback gradient when no cover
	return (
		<div className={`relative ${intrinsic ? "aspect-[16/9]" : "h-full w-full"} overflow-hidden`} style={{ background: slugToGradient(slug) }}>
			<GrainOverlay />
		</div>
	);
}
