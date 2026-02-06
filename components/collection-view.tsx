import { Suspense, type ReactNode } from "react";
import type { Content, Folder, Page } from "@/lib/content";
import { isPost, isNote, isPage, isFolder, getTagsFromContent, getChildrenForSlug, getChildren, getFolderTags, getFeaturedChildren } from "@/lib/content";
import { renderMDX, renderMDXString } from "@/lib/mdx";
import { getMDXComponents } from "@/mdx-components";
import { Card } from "@/components/card";
import { TagFilter, TagFilterFallback } from "@/components/tag-filter";
import { FilterableGrid, GridFallback } from "@/components/filterable-grid";

// Height calculation for masonry distribution
function getCoverHeight(w: number | null, h: number | null): number {
	if (w && h) return 300 / (w / h);
	return 170; // default 16:9
}

function getItemHeight(content: Content): number {
	let h = 80;
	if (content.cover) h += getCoverHeight(content.coverWidth, content.coverHeight);
	if (isNote(content)) h += Math.min(content.content.length / 3, 100);
	else if (isPage(content) && content.description) h += 40;
	else if (isFolder(content) && !content.cover) {
		const pages = getFeaturedChildren(content.slug).filter(isPage) as Page[];
		if (pages.length > 0) {
			h += 80;
			if (pages[0].cover) h += getCoverHeight(pages[0].coverWidth, pages[0].coverHeight) * 0.7;
		}
	}
	return h;
}

type Props = {
	folder?: Folder;
	slug: string[];
};

// Get best date for a single page (considers updatedAt)
function getPageBestDate(page: Page): Date | null {
	const published = page.publishedAt ? new Date(page.publishedAt) : null;
	const updated = page.updatedAt ? new Date(page.updatedAt) : null;
	if (published && updated) return updated > published ? updated : published;
	return published ?? updated;
}

// Sorting logic - drafts to bottom, newest first
function getBestDate(content: Content): Date | null {
	if (isPage(content)) {
		return getPageBestDate(content);
	}

	// Xray folders: use best date from featured child (the one shown)
	if (isFolder(content) && !content.cover) {
		const featured = getFeaturedChildren(content.slug).filter(isPage) as Page[];
		if (featured.length > 0) {
			return getPageBestDate(featured[0]);
		}
	}

	if (content.publishedAt) {
		return new Date(content.publishedAt);
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
				height: getItemHeight(content),
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
