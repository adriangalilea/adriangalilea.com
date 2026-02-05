import type { ReactNode } from "react";
import type { Content } from "@/lib/content";
import { isPage, isFolder, isNote, isPost, getChildren } from "@/lib/content";
import { renderMDXString } from "@/lib/mdx";
import { getMDXComponents } from "@/mdx-components";
import { Card } from "./card";

// ============================================================================
// HEIGHT ESTIMATION - for column balancing
// ============================================================================

function estimateHeight(content: Content): number {
	let height = 48; // base padding (p-4 = 32px + gaps)

	// Covers take significant space - estimate high to balance columns
	if (content.cover) height += 350;

	if (isNote(content)) {
		// Notes: tags + content text + date
		if (content.tags.length > 0) height += 20;
		height += Math.min(content.content.length / 2, 120) + 20;
	} else if (isPage(content)) {
		height += 28; // title
		if (content.description) height += 20 + Math.min(content.description.length / 4, 40);
		if (content.tags.length > 0) height += 20;
		if (content.publishedAt) height += 18;
	} else if (isFolder(content)) {
		height += 28; // title
		if (content.description) height += 20 + Math.min(content.description.length / 4, 40);
		if (content.techs.length > 0) height += 20;
	}

	return height;
}

// ============================================================================
// SORTING
// ============================================================================

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
		// Drafts go to bottom
		if (a.isDraft && !b.isDraft) return 1;
		if (!a.isDraft && b.isDraft) return -1;

		// By date (newest first)
		const aDate = getBestDate(a);
		const bDate = getBestDate(b);
		if (!aDate && !bDate) return 0;
		if (!aDate) return 1;
		if (!bDate) return -1;
		return bDate.getTime() - aDate.getTime();
	});
}

// ============================================================================
// COLUMN DISTRIBUTION
// ============================================================================

function distributeToColumns(items: Content[], numColumns: number): Content[][] {
	if (items.length === 0 || numColumns < 1) return Array.from({ length: numColumns }, () => []);

	const columns: Content[][] = Array.from({ length: numColumns }, () => []);
	const columnHeights: number[] = Array(numColumns).fill(0);
	const sorted = sortByRelevancy(items);

	for (const content of sorted) {
		let minIdx = 0;
		for (let i = 1; i < numColumns; i++) {
			if (columnHeights[i] < columnHeights[minIdx]) minIdx = i;
		}
		columns[minIdx].push(content);
		columnHeights[minIdx] += estimateHeight(content);
	}

	return columns;
}

// ============================================================================
// MASONRY GRID
// ============================================================================

type MasonryGridProps = {
	items: Content[];
};

export async function MasonryGrid({ items }: MasonryGridProps) {
	// Pre-render MDX for notes (server-side)
	const noteContent = new Map<string, ReactNode>();
	for (const item of items) {
		if (isNote(item)) {
			const { mdxContent } = await renderMDXString(item.content, getMDXComponents());
			noteContent.set(item.path, mdxContent);
		}
	}

	const cols1 = distributeToColumns(items, 1);
	const cols2 = distributeToColumns(items, 2);
	const cols3 = distributeToColumns(items, 3);
	const cols4 = distributeToColumns(items, 4);

	const renderColumn = (column: Content[]) => (
		<div className="flex flex-col gap-4">
			{column.map((content) => (
				<Card
					key={content.path}
					content={content}
					renderedNoteContent={isNote(content) ? noteContent.get(content.path) : undefined}
				/>
			))}
		</div>
	);

	return (
		<>
			{/* 1 column - mobile */}
			<div className="grid grid-cols-1 gap-4 sm:hidden">
				{cols1.map((column, i) => <div key={i}>{renderColumn(column)}</div>)}
			</div>

			{/* 2 columns - sm */}
			<div className="hidden sm:grid lg:hidden grid-cols-2 gap-4 items-start">
				{cols2.map((column, i) => <div key={i}>{renderColumn(column)}</div>)}
			</div>

			{/* 3 columns - lg */}
			<div className="hidden lg:grid xl:hidden grid-cols-3 gap-4 items-start">
				{cols3.map((column, i) => <div key={i}>{renderColumn(column)}</div>)}
			</div>

			{/* 4 columns - xl */}
			<div className="hidden xl:grid grid-cols-4 gap-4 items-start">
				{cols4.map((column, i) => <div key={i}>{renderColumn(column)}</div>)}
			</div>
		</>
	);
}
