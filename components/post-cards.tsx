import Image from "next/image";
import Link from "next/link";
import { slugToGradient } from "@/lib/gradient";

export type CardPost = {
	url: string;
	slug: string;
	title: string;
	description?: string;
	date: string;
	tags: string[];
	coverUrl: string | null;
	isDraft?: boolean;
};

function formatDate(date: string) {
	return new Date(date).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function GrainOverlay() {
	return <div className="cover-grain absolute inset-0 z-10 pointer-events-none" />;
}

export function CoverImage({ coverUrl, slug, title, size = "large", sizes, priority }: { coverUrl: string | null; slug: string; title: string; size?: "large" | "small"; sizes?: string; priority?: boolean }) {
	if (coverUrl) {
		const blur = size === "small"
			? "absolute inset-0 h-full w-full scale-[2] object-cover blur-2xl"
			: "absolute inset-0 h-full w-full scale-150 object-cover blur-3xl opacity-60";
		return (
			<div className={`relative h-full w-full overflow-hidden ${size === "large" ? "bg-black" : ""}`}>
				<img src={coverUrl} alt="" aria-hidden className={blur} />
				<Image src={coverUrl} alt={title} fill className="relative object-contain" sizes={sizes ?? "100vw"} priority={priority} />
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

export function PostCard({ post }: { post: CardPost }) {
	return (
		<Link href={post.url} className="group block">
			<div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted transition-transform duration-300 group-hover:scale-[1.01]">
				<CoverImage coverUrl={post.coverUrl} slug={post.slug} title={post.title} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
			</div>
			<div className="mt-3.5">
				{post.tags.length > 0 && (
					<p className="flex flex-wrap items-center gap-x-1.5 text-xs uppercase tracking-wide mb-1">
						{post.tags.map((t, i) => (
							<span key={t}>
								<span className="text-accent-pop">{t}</span>
								{i < post.tags.length - 1 && <span className="text-muted-foreground">,</span>}
							</span>
						))}
					</p>
				)}
				<h3 className="font-semibold text-lg leading-tight tracking-tight group-hover:underline decoration-accent-pop underline-offset-4">
					{post.title}
				</h3>
				<time className="mt-1.5 block text-muted-foreground text-xs tabular-nums">
					{formatDate(post.date)}
				</time>
			</div>
		</Link>
	);
}

export function PostCardDraft({ post }: { post: CardPost }) {
	return (
		<div className="opacity-40 hover:opacity-70 transition-opacity">
			<PostCard post={post} />
		</div>
	);
}

export function PostCardCompact({ post }: { post: CardPost }) {
	return (
		<Link href={post.url} className="group flex gap-4">
			<div className="flex-1 min-w-0">
				<h3 className="font-bold leading-snug group-hover:underline decoration-accent-pop underline-offset-4">
					{post.title}
				</h3>
				<time className="mt-1 block text-muted-foreground text-xs tabular-nums uppercase">
					{formatDate(post.date)}
				</time>
			</div>
			<div className="shrink-0 overflow-hidden rounded-lg w-[100px] h-[70px] sm:w-[120px] sm:h-[80px] transition-transform duration-300 group-hover:scale-[1.03]">
				<CoverImage coverUrl={post.coverUrl} slug={post.slug} title={post.title} size="small" sizes="120px" />
			</div>
		</Link>
	);
}

export function PostCardCompactDraft({ post }: { post: CardPost }) {
	return (
		<div className="opacity-50 hover:opacity-75 transition-opacity">
			<PostCardCompact post={post} />
		</div>
	);
}

export function FeaturedHero({ post }: { post: CardPost }) {
	return (
		<Link href={post.url} className="group block h-full">
			<div className="relative h-full min-h-[300px] overflow-hidden rounded-2xl transition-transform duration-300 group-hover:scale-[1.02] origin-center">
				<div className="absolute inset-0">
					<CoverImage coverUrl={post.coverUrl} slug={post.slug} title={post.title} sizes="(max-width: 1024px) 100vw, 62vw" priority />
				</div>
				<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
				<div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
					<h2 className="font-bold text-2xl leading-tight text-white group-hover:underline decoration-accent-pop underline-offset-4 sm:text-3xl lg:text-4xl">
						{post.title}
					</h2>
					<time className="mt-3 block text-white/50 text-xs tabular-nums uppercase">
						{formatDate(post.date)}
					</time>
				</div>
			</div>
		</Link>
	);
}

export function PostCardCompactList({ posts }: { posts: CardPost[] }) {
	if (posts.length === 0) return null;
	return (
		<ul className="divide-y divide-border">
			{posts.map((post) => (
				<li key={post.url} className="py-5 first:pt-0 last:pb-0">
					{post.isDraft ? <PostCardCompactDraft post={post} /> : <PostCardCompact post={post} />}
				</li>
			))}
		</ul>
	);
}

export function PostCardCompactDraftList({ posts }: { posts: CardPost[] }) {
	if (posts.length === 0) return null;
	return (
		<ul className="divide-y divide-border">
			{posts.map((post) => (
				<li key={post.url} className="py-5 first:pt-0 last:pb-0">
					<PostCardCompactDraft post={post} />
				</li>
			))}
		</ul>
	);
}
