import type { ReactNode } from "react";
import type { Content, Note, Page, Folder } from "@/lib/content";
import { isNote, isPage, isFolder, getFeaturedChildren, wasRecentlyUpdated } from "@/lib/content";
import { StatusBadge, STATUS_CONFIG } from "@/components/status-badge";
import { ClickableWrapper } from "@/components/clickable-wrapper";
import { CoverImage } from "@/components/cover-image";
import { cn } from "@/lib/utils";
import { PenLine } from "lucide-react";

// ============================================================================
// STYLES
// ============================================================================

function CardShine() {
	return <div className="glass-card-shine" />;
}

const cardBase = "rounded-xl glass-card overflow-hidden";
const cardHover = "hover:scale-[1.02] hover:-translate-y-1";
const feedFlat = "glass-card-feed-flat";
const cardDraft = "opacity-50 grayscale-[30%]";

const statusHoverClasses: Record<string, string> = {
	violet: "hover:bg-violet-500/5 max-sm:bg-violet-500/5",
	rose: "hover:bg-rose-500/5 max-sm:bg-rose-500/5",
	cyan: "hover:bg-cyan-500/5 max-sm:bg-cyan-500/5",
	yellow: "hover:bg-yellow-500/5 max-sm:bg-yellow-500/5",
};

// ============================================================================
// NOTE CARD
// ============================================================================

function NoteCard({ note, renderedContent }: { note: Note; renderedContent?: ReactNode }) {
	return (
		<ClickableWrapper
			href={note.path}
			className={cn("group cursor-pointer", cardBase, cardHover, feedFlat, note.isDraft && cardDraft)}
		>
			{note.cover && (
				<CoverImage
					cover={note.cover}
					slug={note.slug.join("/")}
					title=""
					width={note.coverWidth}
					height={note.coverHeight}
					poster={note.poster}
					blurDataURL={note.blurDataURL}
					loop={note.coverLoop}
					intrinsic
					hoverPlay
					sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
				/>
			)}
			<div className="p-4">
				{renderedContent ? (
					<div className="prose prose-sm max-w-none prose-p:my-0 prose-p:leading-relaxed">
						{renderedContent}
					</div>
				) : (
					<p className="text-sm leading-relaxed">{note.content.trim()}</p>
				)}
				{note.publishedAt && (
					<time className="mt-3 block text-xs text-foreground-lowest">
						{new Date(note.publishedAt).toLocaleDateString("en-US", {
							year: "numeric",
							month: "short",
							day: "numeric",
						})}
					</time>
				)}
			</div>
			<CardShine />
		</ClickableWrapper>
	);
}

// ============================================================================
// PAGE CARD
// ============================================================================

function PageCard({ page }: { page: Page }) {
	return (
		<ClickableWrapper
			href={page.path}
			className={cn("group cursor-pointer", cardBase, cardHover, feedFlat, page.isDraft && cardDraft)}
		>
			{page.cover && (
				<CoverImage
					cover={page.cover}
					slug={page.slug.join("/")}
					title={page.title}
					width={page.coverWidth}
					height={page.coverHeight}
					poster={page.poster}
					blurDataURL={page.blurDataURL}
					loop={page.coverLoop}
					intrinsic
					hoverPlay
					sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
				/>
			)}
			<div className="p-4">
				<h3 className="font-semibold leading-tight tracking-tight">{page.title}</h3>
				{page.description && (
					<p className="text-sm text-foreground-low mt-1">{page.description}</p>
				)}
				{page.publishedAt && (
					<div className="mt-2 flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
						<time>
							{new Date(page.publishedAt).toLocaleDateString("en-US", {
								year: "numeric",
								month: "short",
								day: "numeric",
							})}
						</time>
						{page.updatedAt && new Date(page.updatedAt) > new Date(page.publishedAt) && (
							<>
								<span className="text-foreground-lowest">·</span>
								<PenLine className="size-3" />
								<time>
									{new Date(page.updatedAt).toLocaleDateString("en-US", {
										year: "numeric",
										month: "short",
										day: "numeric",
									})}
								</time>
							</>
						)}
					</div>
				)}
			</div>
			<CardShine />
		</ClickableWrapper>
	);
}

// ============================================================================
// FOLDER CARD
// ============================================================================

function FolderCard({ folder }: { folder: Folder }) {
	const colorKey = folder.status ? STATUS_CONFIG[folder.status].colorKey : null;

	return (
		<ClickableWrapper
			href={folder.path}
			className={cn(
				"group relative cursor-pointer",
				cardBase,
				cardHover,
				feedFlat,
				colorKey && statusHoverClasses[colorKey],
			)}
		>
			{folder.status && <StatusBadge status={folder.status} absolute />}
			{folder.cover && (
				<CoverImage
					cover={folder.cover}
					slug={folder.slug.join("/")}
					title={folder.title}
					width={folder.coverWidth}
					height={folder.coverHeight}
					poster={folder.poster}
					blurDataURL={folder.blurDataURL}
					loop={folder.coverLoop}
					intrinsic
					hoverPlay
					sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
				/>
			)}
			<div className="p-4">
				<span className="font-semibold">{folder.title}</span>
				{folder.description && (
					<p className="text-sm text-foreground-low mt-1">{folder.description}</p>
				)}
			</div>
			<CardShine />
		</ClickableWrapper>
	);
}

// ============================================================================
// X-RAY FOLDER CARD - shows preview of internal posts
// ============================================================================

function MiniPageCard({ page }: { page: Page }) {
	const isUpdated = wasRecentlyUpdated(page);

	return (
		<ClickableWrapper href={page.path} className={cn("group cursor-pointer", cardBase, cardHover)}>
			{page.cover && (
				<CoverImage
					cover={page.cover}
					slug={page.slug.join("/")}
					title={page.title}
					width={page.coverWidth}
					height={page.coverHeight}
					poster={page.poster}
					blurDataURL={page.blurDataURL}
					loop={page.coverLoop}
					intrinsic
					hoverPlay
					size="small"
					sizes="300px"
				/>
			)}
			<div className="p-3">
				<h4 className="font-medium text-sm leading-tight">
					{page.title}
					{isUpdated && <span className="ml-1.5 text-[10px] text-accent-pop">updated</span>}
				</h4>
				{page.description && (
					<p className="text-xs text-foreground-low mt-0.5 line-clamp-2">{page.description}</p>
				)}
			</div>
			<CardShine />
		</ClickableWrapper>
	);
}

function XrayFolderCard({ folder }: { folder: Folder }) {
	const colorKey = folder.status ? STATUS_CONFIG[folder.status].colorKey : null;
	const featuredPages = getFeaturedChildren(folder.slug).filter(isPage);
	const pagesToShow = featuredPages.slice(0, 1);
	const remaining = featuredPages.length - 1;

	return (
		<div
			className={cn(
				"group/folder relative cursor-pointer",
				cardBase,
				cardHover,
				feedFlat,
				colorKey && statusHoverClasses[colorKey]
			)}
		>
			{folder.status && <StatusBadge status={folder.status} absolute />}
			<ClickableWrapper href={folder.path} className="block p-4">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<span className="font-semibold">{folder.title}</span>
						{folder.description && (
							<p className="text-sm text-foreground-low mt-1">{folder.description}</p>
						)}
					</div>
				</div>
			</ClickableWrapper>

			{pagesToShow.length > 0 && (
				<div className="px-4 pb-4">
					{pagesToShow.map((page) => (
						<MiniPageCard key={page.path} page={page} />
					))}
					{remaining > 0 && (
						<ClickableWrapper href={folder.path} className="mt-2 block text-xs text-foreground-lowest hover:text-foreground-low">
							+ {remaining} more
						</ClickableWrapper>
					)}
				</div>
			)}
			<CardShine />
		</div>
	);
}

// ============================================================================
// HELPERS
// ============================================================================

function shouldShowXray(content: Content): boolean {
	if (!isFolder(content)) return false;
	if (content.cover) return false;
	const children = getFeaturedChildren(content.slug);
	return children.some(isPage);
}

// ============================================================================
// MAIN EXPORT - Card({ content })
// ============================================================================

type CardProps = {
	content: Content;
	renderedNoteContent?: ReactNode;
};

export function Card({ content, renderedNoteContent }: CardProps) {
	if (isNote(content)) {
		return <NoteCard note={content} renderedContent={renderedNoteContent} />;
	}

	if (isPage(content)) {
		return <PageCard page={content} />;
	}

	if (isFolder(content)) {
		return shouldShowXray(content)
			? <XrayFolderCard folder={content} />
			: <FolderCard folder={content} />;
	}

	const _exhaustive: never = content;
	return null;
}
