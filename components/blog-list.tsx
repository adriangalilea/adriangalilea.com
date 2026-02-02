"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { slugToGradient } from "@/lib/gradient";

export type SerializedPost = {
	url: string;
	slug: string;
	title: string;
	description?: string;
	publishedAt: string;
	tags: string[];
	draft: boolean;
	coverUrl: string | null;
};

function formatDate(date: string) {
	return new Date(date).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function PostCover({ post }: { post: SerializedPost }) {
	if (post.coverUrl) {
		return (
			<div className="relative h-full w-full overflow-hidden bg-black transition-transform duration-300 group-hover:scale-[1.02]">
				<img
					src={post.coverUrl}
					alt=""
					aria-hidden
					className="absolute inset-0 h-full w-full scale-150 object-cover blur-3xl opacity-60"
				/>
				<img
					src={post.coverUrl}
					alt={post.title}
					className="relative h-full w-full object-contain"
				/>
			</div>
		);
	}
	return (
		<div
			className="h-full w-full transition-transform duration-300 group-hover:scale-[1.02]"
			style={{ background: slugToGradient(post.slug) }}
		/>
	);
}

function PostCard({ post }: { post: SerializedPost }) {
	return (
		<Link href={post.url} className="group block">
			<div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
				<PostCover post={post} />
			</div>
			<div className="mt-3.5">
				<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
					{post.tags.length > 0 && (
						<>
							<span>{post.tags[0]}</span>
							<span>·</span>
						</>
					)}
					<time className="tabular-nums">{formatDate(post.publishedAt)}</time>
				</p>
				<h3 className="mt-1.5 font-semibold text-lg leading-tight tracking-tight group-hover:text-accent-pop transition-colors">
					{post.title}
				</h3>
				{post.description && (
					<p className="mt-1.5 text-muted-foreground text-sm leading-relaxed line-clamp-2">
						{post.description}
					</p>
				)}
			</div>
		</Link>
	);
}

function DraftCard({ post }: { post: SerializedPost }) {
	return (
		<Link href={post.url} className="group block opacity-40 hover:opacity-70 transition-opacity">
			<div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
				<PostCover post={post} />
			</div>
			<div className="mt-3.5">
				<p className="text-muted-foreground text-xs">
					<time className="tabular-nums">{formatDate(post.publishedAt)}</time>
				</p>
				<h3 className="mt-1.5 font-semibold leading-tight tracking-tight group-hover:text-accent-pop transition-colors">
					{post.title}
				</h3>
				{post.description && (
					<p className="mt-1.5 text-muted-foreground text-sm leading-relaxed line-clamp-2">
						{post.description}
					</p>
				)}
			</div>
		</Link>
	);
}

export function BlogFilteredList({ published, drafts, allTags }: {
	published: SerializedPost[];
	drafts: SerializedPost[];
	allTags: string[];
}) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const activeTag = searchParams.get("tag");

	function selectTag(tag: string | null) {
		const params = new URLSearchParams(searchParams.toString());
		if (tag === null || activeTag === tag) {
			params.delete("tag");
		} else {
			params.set("tag", tag);
		}
		const qs = params.toString();
		router.replace(`/blog${qs ? `?${qs}` : ""}`, { scroll: false });
	}

	const filteredPublished = activeTag
		? published.filter((p) => p.tags.includes(activeTag))
		: published;
	const filteredDrafts = activeTag
		? drafts.filter((p) => p.tags.includes(activeTag))
		: drafts;

	return (
		<>
			{allTags.length > 0 && (
				<nav className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-border/50 pb-4">
					<button
						type="button"
						onClick={() => selectTag(null)}
						className={`text-sm transition-colors ${
							activeTag === null
								? "text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						All
					</button>
					{allTags.map((tag) => (
						<button
							key={tag}
							type="button"
							onClick={() => selectTag(tag)}
							className={`text-sm transition-colors ${
								tag === activeTag
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{tag}
						</button>
					))}
				</nav>
			)}

			{filteredPublished.length > 0 && (
				<div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
					{filteredPublished.map((post) => (
						<PostCard key={post.url} post={post} />
					))}
				</div>
			)}

			{filteredDrafts.length > 0 && (
				<div className={filteredPublished.length > 0 ? "mt-16" : ""}>
					<p className="mb-6 text-muted-foreground text-xs uppercase tracking-widest">
						Drafts
					</p>
					<div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
						{filteredDrafts.map((post) => (
							<DraftCard key={post.url} post={post} />
						))}
					</div>
				</div>
			)}

			{filteredPublished.length === 0 && filteredDrafts.length === 0 && (
				<p className="py-20 text-center text-muted-foreground text-sm">No posts found.</p>
			)}
		</>
	);
}
