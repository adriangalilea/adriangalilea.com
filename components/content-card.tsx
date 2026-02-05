import Link from "next/link";
import type { Content, Post, Folder } from "@/lib/content";
import { isPost, isFolder, getFeaturedChildren, wasRecentlyUpdated } from "@/lib/content";
import { StatusBadge, STATUS_CONFIG } from "@/components/status-badge";
import { cn } from "@/lib/utils";

type ContentCardProps = {
	content: Content;
	xray?: boolean;
};

// Base card styles
const cardBase = "rounded-xl border border-white/10 bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-200 ease-out";
const cardHover = "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg hover:border-white/20";
const cardDraft = "opacity-50 grayscale-[30%]";

// Status hover classes - explicit for Tailwind
const statusHoverClasses: Record<string, string> = {
	violet: "hover:border-violet-400/20 hover:bg-violet-500/5",
	rose: "hover:border-rose-400/20 hover:bg-rose-500/5",
	cyan: "hover:border-cyan-400/20 hover:bg-cyan-500/5",
	yellow: "hover:border-yellow-400/20 hover:bg-yellow-500/5",
};

// Mini post card for x-ray view
function MiniPostCard({ post }: { post: Post }) {
	const isUpdated = wasRecentlyUpdated(post);

	return (
		<Link href={post.path} className={cn("group/post block", cardBase, cardHover)}>
			{post.cover && (
				<div className="w-full overflow-hidden">
					<img src={post.cover} alt={post.title ?? ""} className="w-full h-auto" />
				</div>
			)}
			<div className="p-3">
				{post.tags && post.tags.length > 0 && (
					<p className="flex flex-wrap items-center gap-x-1 text-[10px] uppercase tracking-wide mb-0.5">
						{post.tags.slice(0, 2).map((t, i) => (
							<span key={t}>
								<span className="text-accent-pop">{t}</span>
								{i < Math.min(post.tags!.length, 2) - 1 && <span className="text-muted-foreground">,</span>}
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
		</Link>
	);
}

// X-ray folder card showing internal posts
function XrayFolderCard({ folder }: { folder: Folder }) {
	const colorKey = folder.status ? STATUS_CONFIG[folder.status].colorKey : null;
	const featuredPosts = getFeaturedChildren(folder.slug);
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
			<Link href={folder.path} className="block p-4">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<span className="font-semibold">{folder.title}</span>
						{folder.description && (
							<p className="text-sm text-foreground-low mt-1">{folder.description}</p>
						)}
						{folder.techs && folder.techs.length > 0 && (
							<div className="mt-2 flex flex-wrap gap-1">
								{folder.techs.map((t) => (
									<span key={t} className="text-xs text-foreground-lowest">{t}</span>
								))}
							</div>
						)}
					</div>
				</div>
			</Link>

			{postsToShow.length > 0 && (
				<div className="px-4 pb-4">
					{postsToShow.map((post) => (
						<MiniPostCard key={post.path} post={post} />
					))}
					{remaining > 0 && (
						<Link href={folder.path} className="mt-2 block text-xs text-foreground-lowest hover:text-foreground-low">
							+ {remaining} more
						</Link>
					)}
				</div>
			)}
		</div>
	);
}

// Folder card
function FolderCard({ folder }: { folder: Folder }) {
	const colorKey = folder.status ? STATUS_CONFIG[folder.status].colorKey : null;

	return (
		<Link
			href={folder.path}
			className={cn(
				"group block relative",
				cardBase,
				cardHover,
				colorKey && statusHoverClasses[colorKey],
			)}
		>
			{folder.status && <StatusBadge status={folder.status} absolute />}
			{folder.cover && (
				<div className="w-full overflow-hidden">
					<img src={folder.cover} alt={folder.title} className="w-full h-auto" />
				</div>
			)}
			<div className="p-4">
				<span className="font-semibold">{folder.title}</span>
				{folder.description && (
					<p className="text-sm text-foreground-low mt-1">{folder.description}</p>
				)}
				{folder.techs && folder.techs.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{folder.techs.map((t) => (
							<span key={t} className="text-xs text-foreground-lowest">{t}</span>
						))}
					</div>
				)}
			</div>
		</Link>
	);
}

// Post card
function PostCard({ post }: { post: Post }) {
	// Notes show content inline
	if (post.isNote) {
		return (
			<Link href={post.path} className={cn("group block", cardBase, cardHover, "p-4", post.isDraft && cardDraft)}>
				<p className="text-sm leading-relaxed">{post.content.trim()}</p>
				{post.publishedAt && (
					<time className="mt-3 block text-xs text-foreground-lowest">
						{new Date(post.publishedAt).toLocaleDateString("en-US", {
							year: "numeric",
							month: "short",
							day: "numeric",
						})}
					</time>
				)}
			</Link>
		);
	}

	return (
		<Link href={post.path} className={cn("group block", cardBase, cardHover, post.isDraft && cardDraft)}>
			{post.cover && (
				<div className="w-full overflow-hidden">
					<img src={post.cover} alt={post.title ?? ""} className="w-full h-auto" />
				</div>
			)}
			<div className="p-4">
				{post.tags && post.tags.length > 0 && (
					<p className="flex flex-wrap items-center gap-x-1.5 text-xs uppercase tracking-wide mb-1">
						{post.tags.map((t, i) => (
							<span key={t}>
								<span className="text-accent-pop">{t}</span>
								{i < post.tags!.length - 1 && <span className="text-muted-foreground">,</span>}
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
		</Link>
	);
}

export function ContentCard({ content, xray }: ContentCardProps) {
	if (isFolder(content)) {
		return xray ? <XrayFolderCard folder={content} /> : <FolderCard folder={content} />;
	}

	if (isPost(content)) {
		return <PostCard post={content} />;
	}

	// TypeScript exhaustiveness check
	const _: never = content;
	return null;
}
