import { Suspense } from "react";
import type { Metadata } from "next";
import { getBlogPosts, blogData, resolveCover } from "@/lib/source";
import { BlogFilteredList, type SerializedPost } from "@/components/blog-list";

export const metadata: Metadata = {
	title: "Blog",
	description: "Writing by Adrian Galilea",
};

function serializePost(post: Parameters<typeof blogData>[0] & { url: string; slugs: string[] }): SerializedPost {
	const d = blogData(post);
	return {
		url: post.url,
		slug: post.slugs[0],
		title: (post.data as { title?: string }).title ?? "",
		description: d.description,
		publishedAt: new Date(d.publishedAt).toISOString(),
		tags: d.tags,
		draft: d.draft,
		coverUrl: resolveCover(post),
	};
}

export default function BlogIndex() {
	const { published, drafts } = getBlogPosts();

	const serializedPublished = published.map(serializePost);
	const serializedDrafts = drafts.map(serializePost);

	const allTags = [...new Set([...serializedPublished, ...serializedDrafts].flatMap((p) => p.tags))].sort();

	return (
		<main className="mx-auto w-full max-w-6xl px-6 py-16">
			<Suspense>
				<BlogFilteredList
					published={serializedPublished}
					drafts={serializedDrafts}
					allTags={allTags}
				/>
			</Suspense>
		</main>
	);
}
