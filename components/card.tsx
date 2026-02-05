import type { ReactNode } from "react";
import type { Content, Note, Post, Folder } from "@/lib/content";
import { isNote, isPost, isFolder, getFeaturedChildren, wasRecentlyUpdated } from "@/lib/content";
import { StatusBadge, STATUS_CONFIG } from "@/components/status-badge";
import { ClickableWrapper } from "@/components/clickable-wrapper";
import { cn } from "@/lib/utils";

// ============================================================================
// STYLES
// ============================================================================

const cardBase = "rounded-xl border border-white/10 bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-200 ease-out";
const cardHover = "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg hover:border-white/20";
const cardDraft = "opacity-50 grayscale-[30%]";

const statusHoverClasses: Record<string, string> = {
	violet: "hover:border-violet-400/20 hover:bg-violet-500/5",
	rose: "hover:border-rose-400/20 hover:bg-rose-500/5",
	cyan: "hover:border-cyan-400/20 hover:bg-cyan-500/5",
	yellow: "hover:border-yellow-400/20 hover:bg-yellow-500/5",
};

// ============================================================================
// NOTE CARD
// ============================================================================

function NoteCard({ note, renderedContent }: { note: Note; renderedContent?: ReactNode }) {
	return (
		<ClickableWrapper
			href={note.path}
			className={cn("group cursor-pointer", cardBase, cardHover, "p-4", note.isDraft && cardDraft)}
		>
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
		</ClickableWrapper>
	);
}

// ============================================================================
// POST CARD
// ============================================================================

function PostCard({ post }: { post: Post }) {
	return (
		<ClickableWrapper
			href={post.path}
			className={cn("group cursor-pointer", cardBase, cardHover, post.isDraft && cardDraft)}
		>
			{post.cover && (
				<div className="w-full overflow-hidden">
					<img src={post.cover} alt={post.title} draggable={false} className="w-full h-auto" />
				</div>
			)}
			<div className="p-4">
				{post.tags.length > 0 && (
					<p className="flex flex-wrap items-center gap-x-1.5 text-xs uppercase tracking-wide mb-1">
						{post.tags.map((t, i) => (
							<span key={t}>
								<span className="text-accent-pop">{t}</span>
								{i < post.tags.length - 1 && <span className="text-muted-foreground">,</span>}
							</span>
						))}
					</p>
				)}
				<h3 className="font-semibold leading-tight tracking-tight">{post.title}</h3>
				{post.description && (
					<p className="text-sm text-foreground-low mt-1">{post.description}</p>
				)}
				{post.publishedAt && (
					<time className="mt-2 block text-muted-foreground text-xs tabular-nums">
						{new Date(post.publishedAt).toLocaleDateString("en-US", {
							year: "numeric",
							month: "short",
							day: "numeric",
						})}
					</time>
				)}
			</div>
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
				colorKey && statusHoverClasses[colorKey],
			)}
		>
			{folder.status && <StatusBadge status={folder.status} absolute />}
			{folder.cover && (
				<div className="w-full overflow-hidden">
					<img src={folder.cover} alt={folder.title} draggable={false} className="w-full h-auto" />
				</div>
			)}
			<div className="p-4">
				<span className="font-semibold">{folder.title}</span>
				{folder.description && (
					<p className="text-sm text-foreground-low mt-1">{folder.description}</p>
				)}
				{folder.techs.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{folder.techs.map((t) => (
							<span key={t} className="text-xs text-foreground-lowest">{t}</span>
						))}
					</div>
				)}
			</div>
		</ClickableWrapper>
	);
}

// ============================================================================
// X-RAY FOLDER CARD - shows preview of internal posts
// ============================================================================

function MiniPostCard({ post }: { post: Post }) {
	const isUpdated = wasRecentlyUpdated(post);

	return (
		<ClickableWrapper href={post.path} className={cn("group/post cursor-pointer", cardBase, cardHover)}>
			{post.cover && (
				<div className="w-full overflow-hidden">
					<img src={post.cover} alt={post.title} draggable={false} className="w-full h-auto" />
				</div>
			)}
			<div className="p-3">
				{post.tags.length > 0 && (
					<p className="flex flex-wrap items-center gap-x-1 text-[10px] uppercase tracking-wide mb-0.5">
						{post.tags.slice(0, 2).map((t, i) => (
							<span key={t}>
								<span className="text-accent-pop">{t}</span>
								{i < Math.min(post.tags.length, 2) - 1 && <span className="text-muted-foreground">,</span>}
							</span>
						))}
					</p>
				)}
				<h4 className="font-medium text-sm leading-tight">
					{post.title}
					{isUpdated && <span className="ml-1.5 text-[10px] text-accent-pop">updated</span>}
				</h4>
				{post.description && (
					<p className="text-xs text-foreground-low mt-0.5 line-clamp-2">{post.description}</p>
				)}
			</div>
		</ClickableWrapper>
	);
}

function XrayFolderCard({ folder }: { folder: Folder }) {
	const colorKey = folder.status ? STATUS_CONFIG[folder.status].colorKey : null;
	const featuredPosts = getFeaturedChildren(folder.slug).filter(isPost);
	const postsToShow = featuredPosts.slice(0, 1);
	const remaining = featuredPosts.length - 1;

	return (
		<div
			className={cn(
				"group/folder relative",
				cardBase,
				cardHover,
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
						{folder.techs.length > 0 && (
							<div className="mt-2 flex flex-wrap gap-1">
								{folder.techs.map((t) => (
									<span key={t} className="text-xs text-foreground-lowest">{t}</span>
								))}
							</div>
						)}
					</div>
				</div>
			</ClickableWrapper>

			{postsToShow.length > 0 && (
				<div className="px-4 pb-4">
					{postsToShow.map((post) => (
						<MiniPostCard key={post.path} post={post} />
					))}
					{remaining > 0 && (
						<ClickableWrapper href={folder.path} className="mt-2 block text-xs text-foreground-lowest hover:text-foreground-low">
							+ {remaining} more
						</ClickableWrapper>
					)}
				</div>
			)}
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
	return children.some(isPost);
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

	if (isPost(content)) {
		return <PostCard post={content} />;
	}

	if (isFolder(content)) {
		return shouldShowXray(content)
			? <XrayFolderCard folder={content} />
			: <FolderCard folder={content} />;
	}

	const _exhaustive: never = content;
	return null;
}
