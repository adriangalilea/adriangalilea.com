import { Suspense, type ReactNode } from "react";
import type { Content, Folder } from "@/lib/content";
import { isPost, isNote, isPage, isFolder, getTagsFromContent, getChildrenForSlug, getChildren, getFolderTags } from "@/lib/content";
import { renderMDX, renderMDXString } from "@/lib/mdx";
import { getMDXComponents } from "@/mdx-components";
import { Card } from "@/components/card";
import { TagFilter, TagFilterFallback } from "@/components/tag-filter";
import { FilterableGrid, GridFallback } from "@/components/filterable-grid";

type Props = {
	folder?: Folder;
	slug: string[];
};

// Sorting logic - drafts to bottom, newest first (considers updatedAt for Pages)
function getBestDate(content: Content): Date | null {
	// For pages, use the most recent of publishedAt or updatedAt
	if (isPage(content)) {
		const published = content.publishedAt ? new Date(content.publishedAt) : null;
		const updated = content.updatedAt ? new Date(content.updatedAt) : null;
		if (published && updated) {
			return updated > published ? updated : published;
		}
		return published ?? updated;
	}

	if (content.publishedAt) {
		return new Date(content.publishedAt);
	}

	if (isFolder(content) && !content.cover) {
		const children = getChildren(content.slug).filter(isPost);
		const dates = children
			.map((c) => c.publishedAt)
			.filter((d): d is Date => d != null)
			.map((d) => new Date(d));
		if (dates.length > 0) {
			return new Date(Math.max(...dates.map((d) => d.getTime())));
		}
	}
	return null;
}

function sortByRelevancy(items: Content[]): Content[] {
	return [...items].sort((a, b) => {
		if (a.isDraft && !b.isDraft) return 1;
		if (!a.isDraft && b.isDraft) return -1;
		const aDate = getBestDate(a);
		const bDate = getBestDate(b);
		if (!aDate && !bDate) return 0;
		if (!aDate) return 1;
		if (!bDate) return -1;
		return bDate.getTime() - aDate.getTime();
	});
}


export async function CollectionView({ folder, slug }: Props) {
	const children = getChildrenForSlug(slug);
	const sortedChildren = sortByRelevancy(children);
	const allTags = getTagsFromContent(children);
	const basePath = slug.length === 0 ? "/" : `/${slug.join("/")}`;

	// Pre-render all cards server-side (in sorted order)
	const items = await Promise.all(
		sortedChildren.map(async (content) => {
			// Pre-render MDX for notes
			const renderedNoteContent = isNote(content)
				? (await renderMDXString(content.content, getMDXComponents())).mdxContent
				: undefined;

			return {
				path: content.path,
				tags: isPost(content) ? content.tags : (isFolder(content) ? getFolderTags(content) : []),
				content: <Card content={content} renderedNoteContent={renderedNoteContent} />,
			};
		})
	);

	const mdxContent = folder?.content.trim()
		? (await renderMDX(folder, getMDXComponents())).mdxContent
		: null;

	return (
		<div className="mx-auto w-full max-w-[90rem] px-6 pb-6">
			{folder && <h1 className="sr-only">{folder.title}</h1>}

			{/* Folder Header */}
			{folder && (folder.description || Object.keys(folder.links).length > 0 || folder.kpis.length > 0) && (
				<header className="mb-6">
					{folder.description && <p className="text-xl text-foreground-low">{folder.description}</p>}
					{Object.keys(folder.links).length > 0 && (
						<div className="mt-4 flex flex-wrap gap-3">
							{Object.entries(folder.links).map(([key, url]) => (
								<a
									key={key}
									href={url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-accent-pop hover:underline"
								>
									{key}
								</a>
							))}
						</div>
					)}
					{folder.kpis.length > 0 && (
						<div className="mt-6 flex flex-wrap gap-6">
							{folder.kpis.map((kpi) => (
								<div key={kpi.label}>
									<div className="text-2xl font-bold">{kpi.value}</div>
									<div className="text-sm text-foreground-lowest">{kpi.label}</div>
								</div>
							))}
						</div>
					)}
				</header>
			)}

			{/* MDX Content */}
			{mdxContent && <div className="prose prose-p:leading-[1.8] mb-12">{mdxContent}</div>}

			{/* Tag Filter - SSG with client enhancement */}
			{allTags.length > 0 && (
				<Suspense fallback={<TagFilterFallback tags={allTags} basePath={basePath} />}>
					<TagFilter tags={allTags} basePath={basePath} />
				</Suspense>
			)}

			{/* Grid - SSG with client-side filtering */}
			{items.length > 0 && (
				<section>
					<Suspense fallback={<GridFallback items={items} />}>
						<FilterableGrid items={items} />
					</Suspense>
				</section>
			)}
		</div>
	);
}
