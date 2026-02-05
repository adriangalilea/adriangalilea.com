import { readdirSync, readFileSync, statSync, existsSync, cpSync, mkdirSync } from "node:fs";
import { join, parse } from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import sharp from "sharp";

const CONTENT_DIR = join(process.cwd(), "content");
const PUBLIC_DIR = join(process.cwd(), "public");
const NOTE_MAX_CHARS = 280;
const MEDIA_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".mov"];
const COVER_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif", ".mp4", ".webm", ".mov"];
const IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif"];
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// ============================================================================
// TYPES - Clean discriminated union, each type has exactly what it needs
// ============================================================================

export type Status = "soon" | "shipped" | "lab" | "sunset";

export type TOCItem = {
	depth: number;
	title: string;
	id: string;
};

type ReadingTime = { text: string; minutes: number; words: number };

// Shared fields all content has
type ContentBase = {
	slug: string[];
	path: string;
	content: string;
	readingTime: ReadingTime;
	media: string[];
	cover: string | null;
	og: string | null;
	publishedAt: Date | null;
	isDraft: boolean;
	_dir: string;
};

// Note: Short-form content, no title, max 280 chars
export type Note = ContentBase & {
	type: "note";
};

// Post: Long-form content with title
export type Post = ContentBase & {
	type: "post";
	title: string;
	description: string | null;
	toc: TOCItem[];
	tags: string[];
	updatedAt: Date | null;
	pinned: boolean;
};

// Folder: Project or collection container
export type Folder = ContentBase & {
	type: "folder";
	title: string;
	description: string | null;
	status: Status | null;
	links: Record<string, string>;
	kpis: { label: string; value: string }[];
	techs: string[];
};

export type Content = Note | Post | Folder;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isNote(c: Content): c is Note {
	return c.type === "note";
}

export function isPost(c: Content): c is Post {
	return c.type === "post";
}

export function isFolder(c: Content): c is Folder {
	return c.type === "folder";
}

// ============================================================================
// HELPERS
// ============================================================================

function isMediaFile(filename: string): boolean {
	const ext = parse(filename).ext.toLowerCase();
	return MEDIA_EXTENSIONS.includes(ext);
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.trim();
}

function extractTOC(content: string): TOCItem[] {
	const headingRegex = /^(#{2,4})\s+(.+)$/gm;
	const items: TOCItem[] = [];
	let match: RegExpExecArray | null;
	while ((match = headingRegex.exec(content)) !== null) {
		items.push({
			depth: match[1].length,
			title: match[2].trim(),
			id: slugify(match[2].trim()),
		});
	}
	return items;
}

function copyMedia(dir: string, slug: string[]): string[] {
	try {
		const files = readdirSync(dir).filter(isMediaFile);
		if (files.length === 0) return [];

		const slugPath = slug.join("/");
		const destDir = join(PUBLIC_DIR, slugPath);
		mkdirSync(destDir, { recursive: true });

		for (const file of files) {
			const src = join(dir, file);
			const dest = join(destDir, file);
			if (!existsSync(dest)) cpSync(src, dest);
		}
		return files;
	} catch {
		return [];
	}
}

function rewriteMediaPaths(content: string, slug: string[]): string {
	const slugPath = slug.join("/");
	return content
		.replace(/\]\(\.\//g, `](/${slugPath}/`)
		.replace(/src=[\"']\.\//g, `src="/${slugPath}/`);
}

function resolveCover(dir: string, slug: string[]): string | null {
	for (const ext of COVER_EXTENSIONS) {
		const src = join(dir, `cover${ext}`);
		if (existsSync(src)) {
			const slugPath = slug.join("/");
			const destDir = join(PUBLIC_DIR, slugPath);
			const dest = join(destDir, `cover${ext}`);
			mkdirSync(destDir, { recursive: true });
			if (!existsSync(dest)) cpSync(src, dest);
			return `/${slugPath}/cover${ext}`;
		}
	}
	return null;
}

export async function resolveOG(content: Content): Promise<string | null> {
	const slugPath = content.slug.join("/");
	const destDir = join(PUBLIC_DIR, slugPath);
	const dest = join(destDir, "og.png");
	const url = `/${slugPath}/og.png`;

	if (existsSync(dest)) return url;

	for (const ext of IMAGE_EXTENSIONS) {
		const src = join(content._dir, `cover${ext}`);
		if (existsSync(src)) {
			mkdirSync(destDir, { recursive: true });
			try {
				const bg = await sharp(src)
					.resize(OG_WIDTH, OG_HEIGHT, { fit: "cover" })
					.blur(50)
					.modulate({ brightness: 0.7 })
					.png()
					.toBuffer();

				const meta = await sharp(src).metadata();
				const scale = OG_HEIGHT / (meta.height ?? OG_HEIGHT);
				const fgW = Math.round((meta.width ?? OG_WIDTH) * scale);
				const fg = await sharp(src).resize(fgW, OG_HEIGHT, { fit: "inside" }).png().toBuffer();

				await sharp(bg).composite([{ input: fg, gravity: "centre" }]).png().toFile(dest);
				return url;
			} catch {
				return null;
			}
		}
	}
	return null;
}

// ============================================================================
// PARSING
// ============================================================================

function parseContent(filePath: string, slug: string[]): Content | null {
	try {
		const raw = readFileSync(filePath, "utf-8");
		const { data, content } = matter(raw);
		const stats = readingTime(content);
		const dir = parse(filePath).dir;
		const media = copyMedia(dir, slug);
		const cover = resolveCover(dir, slug);
		const rewritten = rewriteMediaPaths(content, slug);

		const base: ContentBase = {
			slug,
			path: `/${slug.join("/")}`,
			content: rewritten,
			readingTime: stats,
			media,
			cover,
			og: null,
			publishedAt: data.publishedAt ?? null,
			isDraft: data.isDraft ?? false,
			_dir: dir,
		};

		// Folder: explicit type in frontmatter
		if (data.type === "folder") {
			return {
				...base,
				type: "folder",
				title: data.title ?? slug[slug.length - 1],
				description: data.description ?? null,
				status: data.status ?? null,
				links: data.links ?? {},
				kpis: data.kpis ?? [],
				techs: data.techs ?? [],
			};
		}

		// Note: no title, max 280 chars
		if (!data.title) {
			if (content.trim().length > NOTE_MAX_CHARS) {
				throw new Error(
					`Note exceeds ${NOTE_MAX_CHARS} chars: ${filePath} (${content.trim().length} chars). Add a title to make it a post.`
				);
			}
			return {
				...base,
				type: "note",
			};
		}

		// Post: has title
		return {
			...base,
			type: "post",
			title: data.title,
			description: data.description ?? null,
			toc: extractTOC(content),
			tags: data.tags ?? [],
			updatedAt: data.updatedAt ?? null,
			pinned: data.pinned ?? false,
		};
	} catch (e) {
		console.error(`Error parsing ${filePath}:`, e);
		return null;
	}
}

// ============================================================================
// SCANNING
// ============================================================================

function scanDirectory(dir: string, basePath: string[] = []): Content[] {
	const results: Content[] = [];
	const entries = readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;

		const fullPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			const indexPath = [join(fullPath, "index.mdx"), join(fullPath, "index.md")].find((p) => {
				try {
					statSync(p);
					return true;
				} catch {
					return false;
				}
			});

			if (indexPath) {
				const slug = [...basePath, entry.name];
				const content = parseContent(indexPath, slug);
				if (content) results.push(content);
			}

			results.push(...scanDirectory(fullPath, [...basePath, entry.name]));
		} else if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) {
			if (entry.name === "index.mdx" || entry.name === "index.md") continue;

			const name = parse(entry.name).name;
			const slug = [...basePath, name];
			const content = parseContent(fullPath, slug);
			if (content) results.push(content);
		}
	}

	return results;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export function getAllContent(): Content[] {
	const all = scanDirectory(CONTENT_DIR);

	// Deduplicate: folder wins over note/post with same slug
	const seen = new Map<string, Content>();
	for (const c of all) {
		const existing = seen.get(c.path);
		if (existing) {
			if (c.type === "folder" && existing.type !== "folder") {
				seen.set(c.path, c);
			}
			console.warn(`Duplicate slug: ${c.path} - keeping ${seen.get(c.path)!.type}, discarding ${c.type}`);
		} else {
			seen.set(c.path, c);
		}
	}

	return [...seen.values()];
}

export function getContentByPath(slugPath: string[]): Content | null {
	return getAllContent().find((c) => c.slug.join("/") === slugPath.join("/")) ?? null;
}

export function getChildren(folderSlug: string[]): Content[] {
	const parentPath = folderSlug.join("/");
	return getAllContent().filter((c) => {
		if (c.slug.length !== folderSlug.length + 1) return false;
		return c.slug.slice(0, -1).join("/") === parentPath;
	});
}

export function getRootContent(): Content[] {
	return getAllContent().filter((c) => c.slug.length === 1);
}

export function getAllTags(): string[] {
	const tags = new Set<string>();
	for (const c of getAllContent()) {
		if (isPost(c)) {
			for (const tag of c.tags) tags.add(tag);
		}
	}
	return [...tags].sort();
}

export function getAllFolders(): Folder[] {
	return getAllContent().filter(isFolder);
}

export function getAllPosts(): Post[] {
	return getAllContent().filter(isPost);
}

export function getAllNotes(): Note[] {
	return getAllContent().filter(isNote);
}

// ============================================================================
// SCORING & RECOMMENDATIONS
// ============================================================================

function scoreForFeatured(c: Content): number {
	let score = 0;

	if (isPost(c)) {
		if (c.pinned) score += 10000;
		if (c.updatedAt) {
			const days = (Date.now() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
			if (days < 30) score += 1000 - days * 10;
		}
	}

	if (c.cover) score += 500;

	if (c.publishedAt) {
		const days = (Date.now() - new Date(c.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
		score += Math.max(0, 365 - days);
	}

	return score;
}

export function getFeaturedChildren(folderSlug: string[]): Content[] {
	return getChildren(folderSlug)
		.filter((c) => c.publishedAt && !c.isDraft)
		.sort((a, b) => scoreForFeatured(b) - scoreForFeatured(a));
}

export function wasRecentlyUpdated(c: Content): boolean {
	if (!isPost(c) || !c.updatedAt) return false;
	const days = (Date.now() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
	return days < 30;
}

export function getRecommendations(content: Content, limit = 3): Content[] {
	const all = getAllContent().filter((c) => c.path !== content.path);

	const scored = all.map((c) => {
		let score = 0;

		// Same parent folder = highly related
		if (content.slug.length > 1 && c.slug.length > 1) {
			const contentParent = content.slug.slice(0, -1).join("/");
			const cParent = c.slug.slice(0, -1).join("/");
			if (contentParent === cParent) score += 100;
		}

		// Shared tags (posts only)
		if (isPost(content) && isPost(c)) {
			const shared = content.tags.filter((t) => c.tags.includes(t)).length;
			score += shared * 20;
		}

		// Same type bonus
		if (content.type === c.type) score += 5;

		// Recency bonus
		if (c.publishedAt) {
			const days = (Date.now() - new Date(c.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
			score += Math.max(0, 10 - days / 30);
		}

		// Exclude drafts and unpublished
		if (c.isDraft || !c.publishedAt) score = -1;

		return { content: c, score };
	});

	return scored
		.filter((s) => s.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((s) => s.content);
}

// ============================================================================
// FEED
// ============================================================================

export function getFeedContent(): Content[] {
	const folderPaths = new Set(getAllFolders().map((f) => f.slug.join("/")));

	return getAllContent()
		.filter((c) => {
			// Folders always show (they're containers)
			if (isFolder(c)) return true;

			// Non-folders must be published
			if (!c.publishedAt) return false;

			// Hide content inside folders (shown via folder page)
			if (c.slug.length > 1) {
				const parentPath = c.slug.slice(0, -1).join("/");
				if (folderPaths.has(parentPath)) return false;
			}

			return true;
		})
		.sort((a, b) => {
			// Get best date for sorting (folders use children's dates)
			const aDate = getBestDateForSort(a);
			const bDate = getBestDateForSort(b);
			if (!aDate && !bDate) return 0;
			if (!aDate) return 1;
			if (!bDate) return -1;
			return bDate.getTime() - aDate.getTime();
		});
}

function getBestDateForSort(content: Content): Date | null {
	if (content.publishedAt) {
		return new Date(content.publishedAt);
	}

	// For folders without publishedAt, use best child date
	if (isFolder(content)) {
		const children = getChildren(content.slug);
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
