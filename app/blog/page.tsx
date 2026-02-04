import { Suspense } from "react";
import type { Metadata } from "next";
import { getBlogPosts, toCardPost } from "@/lib/source";
import { BlogFilteredList } from "@/components/blog-list";

export const metadata: Metadata = {
	title: "Blog",
	description: "Writing by Adrian Galilea",
};

export default function BlogIndex() {
	const { published, drafts } = getBlogPosts();

	const serializedPublished = published.map(toCardPost);
	const serializedDrafts = drafts.map(toCardPost);

	const allTags = [...new Set([...serializedPublished, ...serializedDrafts].flatMap((p) => p.tags))].sort();

	return (
		<main className="mx-auto w-full max-w-[90rem] px-6 py-16">
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
