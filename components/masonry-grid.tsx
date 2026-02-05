import type { Content, Post } from "@/lib/content";
import { isPost, isFolder, getChildren } from "@/lib/content";
import { ContentCard } from "./content-card";

// Determine if a folder should show x-ray view (no cover + has children)
function shouldShowXray(content: Content): boolean {
	if (!isFolder(content)) return false;
	if (content.cover) return false;

	const children = getChildren(content.slug);
	return children.some(isPost);
}

// Estimate height based on content properties
function estimateHeight(content: Content): number {
	let height = 80; // base padding

	if (content.cover) height += 250; // cover image

	if (isFolder(content)) {
		height += 30; // title
		if (content.description) height += 30;
		if (content.techs?.length) height += 24;
		if (shouldShowXray(content)) height += 180;
	} else if (isPost(content)) {
		if (content.isNote) {
			// Notes are compact - just content + date
			height = 80 + Math.min(content.content.length / 3, 60);
		} else {
			height += 30; // title
			if (content.description) height += 30;
			if (content.tags?.length) height += 24;
			if (content.publishedAt) height += 20;
		}
	}

	return height;
}

// Get best date for sorting (folders use best internal post date)
function getBestDate(content: Content): Date | null {
	if (isPost(content)) {
		return content.publishedAt ? new Date(content.publishedAt) : null;
	}

	if (isFolder(content) && !content.cover) {
		const children = getChildren(content.slug).filter(isPost);
		const dates = children
			.map((p) => p.publishedAt)
			.filter((d): d is Date => d != null)
			.map((d) => new Date(d));
		if (dates.length > 0) {
			return new Date(Math.max(...dates.map((d) => d.getTime())));
		}
	}

	return null;
}

// Sort by relevancy: drafts at bottom, then by date (newest first)
function sortByRelevancy(items: Content[]): Content[] {
	return [...items].sort((a, b) => {
		// Drafts go to bottom
		const aDraft = isPost(a) && a.isDraft;
		const bDraft = isPost(b) && b.isDraft;
		if (aDraft && !bDraft) return 1;
		if (!aDraft && bDraft) return -1;

		// By date (newest first)
		const aDate = getBestDate(a);
		const bDate = getBestDate(b);
		if (!aDate && !bDate) return 0;
		if (!aDate) return 1;
		if (!bDate) return -1;
		return bDate.getTime() - aDate.getTime();
	});
}

// Distribute items to columns using shortest-column algorithm
function distributeToColumns(items: Content[], numColumns: number): Content[][] {
	if (items.length === 0 || numColumns < 1) return Array.from({ length: numColumns }, () => []);

	const columns: Content[][] = Array.from({ length: numColumns }, () => []);
	const columnHeights: number[] = Array(numColumns).fill(0);
	const sorted = sortByRelevancy(items);

	for (const content of sorted) {
		// Find shortest column
		let minIdx = 0;
		for (let i = 1; i < numColumns; i++) {
			if (columnHeights[i] < columnHeights[minIdx]) minIdx = i;
		}
		columns[minIdx].push(content);
		columnHeights[minIdx] += estimateHeight(content);
	}

	return columns;
}

export function MasonryGrid({ items }: { items: Content[] }) {
	const cols1 = distributeToColumns(items, 1);
	const cols2 = distributeToColumns(items, 2);
	const cols3 = distributeToColumns(items, 3);
	const cols4 = distributeToColumns(items, 4);

	return (
		<>
			{/* 1 column - mobile */}
			<div className="grid grid-cols-1 gap-4 sm:hidden">
				{cols1.map((column, colIdx) => (
					<div key={colIdx} className="flex flex-col gap-4">
						{column.map((content) => (
							<ContentCard key={content.path} content={content} xray={shouldShowXray(content)} />
						))}
					</div>
				))}
			</div>

			{/* 2 columns - sm */}
			<div className="hidden sm:grid lg:hidden grid-cols-2 gap-4 items-start">
				{cols2.map((column, colIdx) => (
					<div key={colIdx} className="flex flex-col gap-4">
						{column.map((content) => (
							<ContentCard key={content.path} content={content} xray={shouldShowXray(content)} />
						))}
					</div>
				))}
			</div>

			{/* 3 columns - lg */}
			<div className="hidden lg:grid xl:hidden grid-cols-3 gap-4 items-start">
				{cols3.map((column, colIdx) => (
					<div key={colIdx} className="flex flex-col gap-4">
						{column.map((content) => (
							<ContentCard key={content.path} content={content} xray={shouldShowXray(content)} />
						))}
					</div>
				))}
			</div>

			{/* 4 columns - xl */}
			<div className="hidden xl:grid grid-cols-4 gap-4 items-start">
				{cols4.map((column, colIdx) => (
					<div key={colIdx} className="flex flex-col gap-4">
						{column.map((content) => (
							<ContentCard key={content.path} content={content} xray={shouldShowXray(content)} />
						))}
					</div>
				))}
			</div>
		</>
	);
}
