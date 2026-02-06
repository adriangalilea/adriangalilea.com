import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import type { Content, Folder } from "@/lib/content";
import { isPost, isNote, isFolder, getTagsFromContent, getChildrenForSlug, getChildren, getFolderTags } from "@/lib/content";
import { renderMDX, renderMDXString } from "@/lib/mdx";
import { getMDXComponents } from "@/mdx-components";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/card";
import { TagFilter, TagFilterFallback } from "@/components/tag-filter";
import { FilterableGrid, GridFallback } from "@/components/filterable-grid";

type Props = {
	folder?: Folder;
	slug: string[];
};

// Sorting logic - drafts to bottom, newest first
function getBestDate(content: Content): Date | null {
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
		<div className="mx-auto w-full max-w-[90rem] px-4 py-6">
			{/* Breadcrumb - only for nested folders */}
			{slug.length > 1 && (
				<nav className="mb-6 text-sm text-foreground-lowest">
					<Link href="/" className="hover:text-foreground">
						Home
					</Link>
					{slug.slice(0, -1).map((seg, i) => (
						<span key={seg}>
							<span className="mx-2">/</span>
							<Link href={`/${slug.slice(0, i + 1).join("/")}`} className="hover:text-foreground">
								{seg}
							</Link>
						</span>
					))}
				</nav>
			)}

			{/* Folder Header - only if folder metadata exists */}
			{folder && (
				<header className="mb-12">
					<div className="flex items-center gap-3 mb-4">
						<h1 className="font-bold text-4xl tracking-tight">{folder.title}</h1>
						{folder.status && <StatusBadge status={folder.status} />}
					</div>
					{folder.description && <p className="text-xl text-foreground-low">{folder.description}</p>}

					{/* Links */}
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

					{/* KPIs */}
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

					{/* Techs */}
					{folder.techs.length > 0 && (
						<div className="mt-4 flex flex-wrap gap-2">
							{folder.techs.map((tech) => (
								<span key={tech} className="text-xs text-foreground-lowest bg-muted px-2 py-1 rounded">
									{tech}
								</span>
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
