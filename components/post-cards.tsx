import Link from "next/link";
import { blogData, resolveCover } from "@/lib/source";
import { slugToGradient } from "@/lib/gradient";

type AnyPost = Parameters<typeof blogData>[0] & { url: string; slugs: string[]; data: { title?: string } };

export function PostCover({ post }: { post: AnyPost }) {
	const coverUrl = resolveCover(post);
	const slug = post.slugs[0];
	if (coverUrl) {
		return (
			<div className="relative h-full w-full overflow-hidden bg-black">
				<img
					src={coverUrl}
					alt=""
					aria-hidden
					className="absolute inset-0 h-full w-full scale-150 object-cover blur-3xl opacity-60"
				/>
				<img
					src={coverUrl}
					alt={post.data.title ?? ""}
					className="relative h-full w-full object-contain"
				/>
			</div>
		);
	}
	return <div className="h-full w-full" style={{ background: slugToGradient(slug) }} />;
}

export function Tags({ tags, activeTag, onTagClick, className }: { tags: string[]; activeTag?: string; onTagClick?: (tag: string) => void; className?: string }) {
	if (tags.length === 0) return null;
	return (
		<div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
			{tags.map((t: string) => (
				<button
					key={t}
					type="button"
					onClick={() => onTagClick?.(t)}
					className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
						t === activeTag
							? "bg-foreground text-background"
							: "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
					}`}
				>
					{t}
				</button>
			))}
		</div>
	);
}

function formatDate(date: Date) {
	return new Date(date).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function PublishedCard({ post, index, activeTag }: { post: AnyPost; index?: number; activeTag?: string }) {
	const d = blogData(post);
	return (
		<Link href={post.url} className="group flex gap-4">
			{index !== undefined && (
				<span className="mt-0.5 shrink-0 font-mono text-accent-pop text-lg font-bold tabular-nums">
					{index}
				</span>
			)}
			<div className="flex-1 min-w-0">
				<h3 className="font-bold leading-snug group-hover:underline decoration-accent-pop underline-offset-4">
					{post.data.title}
				</h3>
				{d.description && (
					<p className="mt-0.5 text-muted-foreground text-sm line-clamp-1">
						{d.description}
					</p>
				)}
				<time className="mt-1 block text-muted-foreground text-xs tabular-nums uppercase">
					{formatDate(d.publishedAt)}
				</time>
			</div>
			<div className="shrink-0 overflow-hidden rounded-lg w-[100px] h-[70px] sm:w-[120px] sm:h-[80px]">
				<PostCover post={post} />
			</div>
		</Link>
	);
}

export function DraftCard({ post, activeTag }: { post: AnyPost; activeTag?: string }) {
	const d = blogData(post);
	return (
		<Link href={post.url} className="group flex gap-4 opacity-50 hover:opacity-75 transition-opacity">
			<div className="flex-1 min-w-0">
				<h3 className="font-semibold leading-snug text-sm group-hover:underline decoration-accent-pop underline-offset-4">
					{post.data.title}
				</h3>
				{d.description && (
					<p className="mt-0.5 text-muted-foreground text-xs line-clamp-1">
						{d.description}
					</p>
				)}
				<time className="mt-0.5 block text-muted-foreground text-xs tabular-nums uppercase">
					{formatDate(d.publishedAt)}
				</time>
			</div>
			<div className="shrink-0 overflow-hidden rounded-lg w-[80px] h-[56px]">
				<PostCover post={post} />
			</div>
		</Link>
	);
}

export function FeaturedHero({ post }: { post: AnyPost }) {
	const d = blogData(post);
	return (
		<Link href={post.url} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl">
			<div className="absolute inset-0">
				<PostCover post={post} />
			</div>
			<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
			<div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
				<h2 className="font-bold text-2xl leading-tight text-white group-hover:underline decoration-accent-pop underline-offset-4 sm:text-3xl lg:text-4xl">
					{post.data.title}
				</h2>
				{d.description && (
					<p className="mt-2 text-white/70 text-sm line-clamp-2 sm:text-base">
						{d.description}
					</p>
				)}
				<time className="mt-3 block text-white/50 text-xs tabular-nums uppercase">
					{formatDate(d.publishedAt)}
				</time>
			</div>
		</Link>
	);
}

export function PublishedList({ posts, startIndex = 1, activeTag }: { posts: AnyPost[]; startIndex?: number; activeTag?: string }) {
	if (posts.length === 0) return null;
	return (
		<ul className="divide-y divide-border">
			{posts.map((post, i) => (
				<li key={post.url} className="py-5 first:pt-0 last:pb-0">
					<PublishedCard post={post} index={startIndex + i} activeTag={activeTag} />
				</li>
			))}
		</ul>
	);
}

export function DraftList({ posts, activeTag }: { posts: AnyPost[]; activeTag?: string }) {
	if (posts.length === 0) return null;
	return (
		<ul className="divide-y divide-border/50">
			{posts.map((post) => (
				<li key={post.url} className="py-4 first:pt-0 last:pb-0">
					<DraftCard post={post} activeTag={activeTag} />
				</li>
			))}
		</ul>
	);
}
