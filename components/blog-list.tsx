"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { PostCard, PostCardDraft, type CardPost } from "@/components/post-cards";

export type { CardPost };

export function BlogFilteredList({ published, drafts, allTags }: {
	published: CardPost[];
	drafts: CardPost[];
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
								: "text-foreground-lowest hover:text-foreground"
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
									: "text-foreground-lowest hover:text-foreground"
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
					<p className="mb-6 text-foreground-lowest text-xs uppercase tracking-widest">
						Drafts
					</p>
					<div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
						{filteredDrafts.map((post) => (
							<PostCardDraft key={post.url} post={post} />
						))}
					</div>
				</div>
			)}

			{filteredPublished.length === 0 && filteredDrafts.length === 0 && (
				<p className="py-20 text-center text-foreground-lowest text-sm">No posts found.</p>
			)}
		</>
	);
}
