import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join, parse, relative } from "node:path";
import matter from "gray-matter";
import imageSize from "image-size";
import readingTime from "reading-time";
import sharp from "sharp";
import {
  ANIMATED_EXTENSIONS,
  AVATAR_EXTENSIONS,
  COVER_EXTENSIONS,
  IMAGE_EXTENSIONS,
  isMedia,
  NON_WEBM_ANIMATED,
  POSTER_EXTENSIONS,
} from "@/lib/media";

const CONTENT_DIR = join(process.cwd(), "content");
const PUBLIC_DIR = join(process.cwd(), "public");

const blurManifest: Record<string, string> = (() => {
  try {
    return JSON.parse(
      readFileSync(join(process.cwd(), ".next", "blur-manifest.json"), "utf-8"),
    );
  } catch {
    return {};
  }
})();
const NOTE_MAX_CHARS = 280;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const warnedCovers = new Set<string>();

// ============================================================================
// TYPES
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
  coverWidth: number | null;
  coverHeight: number | null;
  poster: string | null;
  blurDataURL: string | null;
  coverLoop: boolean;
  og: string | null;
  publishedAt: Date | null;
  isDraft: boolean;
  _dir: string;
};

// Post: all non-folder content
type PostBase = ContentBase & {
  tags: string[];
};

// Note: short-form, no title, no description
export type Note = PostBase & {
  type: "note";
  source: string | null;
};

// Page: long-form with title
export type Page = PostBase & {
  type: "page";
  title: string;
  description: string | null;
  toc: TOCItem[];
  updatedAt: Date | null;
  pinned: boolean;
};

export type Post = Note | Page;

// Folder: container
export type Folder = ContentBase & {
  type: "folder";
  title: string;
  description: string | null;
  status: Status | null;
  links: Record<string, string>;
  kpis: { label: string; value: string }[];
  techs: string[];
  feedThrough: boolean;
  avatar: string | null;
};

export type Content = Post | Folder;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isPost(c: Content): c is Post {
  return c.type === "note" || c.type === "page";
}

export function isNote(c: Content): c is Note {
  return c.type === "note";
}

export function isPage(c: Content): c is Page {
  return c.type === "page";
}

export function isFolder(c: Content): c is Folder {
  return c.type === "folder";
}

// ============================================================================
// HELPERS
// ============================================================================

function needsCopy(src: string, dest: string): boolean {
  if (!existsSync(dest)) return true;
  return statSync(src).size !== statSync(dest).size;
}

function syncFile(src: string, dest: string): void {
  if (needsCopy(src, dest)) cpSync(src, dest);
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
  for (
    let match = headingRegex.exec(content);
    match !== null;
    match = headingRegex.exec(content)
  ) {
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
    const files = readdirSync(dir).filter(isMedia);
    if (files.length === 0) return [];

    const slugPath = slug.join("/");
    const destDir = join(PUBLIC_DIR, slugPath);
    mkdirSync(destDir, { recursive: true });

    for (const file of files) {
      const src = join(dir, file);
      const dest = join(destDir, file);
      syncFile(src, dest);
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
    .replace(/src=["']\.\//g, `src="/${slugPath}/`);
}

type CoverInfo = {
  url: string;
  width: number | null;
  height: number | null;
  poster: string | null;
  blurDataURL: string | null;
} | null;

function resolveCover(dir: string, slug: string[]): CoverInfo {
  for (const ext of COVER_EXTENSIONS) {
    const src = join(dir, `cover${ext}`);
    if (existsSync(src)) {
      const slugPath = slug.join("/");
      const destDir = join(PUBLIC_DIR, slugPath);
      const dest = join(destDir, `cover${ext}`);
      mkdirSync(destDir, { recursive: true });
      syncFile(src, dest);

      // Remove stale covers with different extensions
      for (const oldExt of COVER_EXTENSIONS) {
        if (oldExt === ext) continue;
        const stale = join(destDir, `cover${oldExt}`);
        if (existsSync(stale)) {
          console.warn(
            `Removing stale cover: ${stale} (replaced by cover${ext})`,
          );
          unlinkSync(stale);
        }
      }

      if (NON_WEBM_ANIMATED.includes(ext) && !warnedCovers.has(slugPath)) {
        warnedCovers.add(slugPath);
        console.warn(
          `⚠ ${slugPath}/cover${ext} is not webm — convert with: ffmpeg -i content/${slugPath}/cover${ext} -c:v libvpx-vp9 -crf 30 -b:v 0 -an content/${slugPath}/cover.webm`,
        );
      }

      // Get dimensions for images (not videos)
      let width: number | null = null;
      let height: number | null = null;
      if (IMAGE_EXTENSIONS.includes(ext)) {
        try {
          const buffer = readFileSync(src);
          const dims = imageSize(buffer);
          width = dims.width ?? null;
          height = dims.height ?? null;
        } catch {
          // Ignore dimension errors
        }
      }

      let poster: string | null = null;
      let blurDataURL: string | null = null;
      if (ANIMATED_EXTENSIONS.includes(ext)) {
        for (const posterExt of POSTER_EXTENSIONS) {
          const posterSrc = join(dir, `poster${posterExt}`);
          if (existsSync(posterSrc)) {
            const posterDest = join(destDir, `poster${posterExt}`);
            syncFile(posterSrc, posterDest);
            poster = `/${slugPath}/poster${posterExt}`;
            blurDataURL =
              blurManifest[relative(CONTENT_DIR, posterSrc)] ?? null;

            if (!width || !height) {
              try {
                const buffer = readFileSync(posterSrc);
                const dims = imageSize(buffer);
                width = dims.width ?? null;
                height = dims.height ?? null;
              } catch {
                // Ignore dimension errors
              }
            }
            break;
          }
        }
        if (!poster) {
          const warnKey = `poster:${slugPath}`;
          if (!warnedCovers.has(warnKey)) {
            warnedCovers.add(warnKey);
            console.warn(
              `⚠ ${slugPath} has animated cover but no poster — add poster.webp for crossfade`,
            );
          }
        }
      } else {
        blurDataURL = blurManifest[relative(CONTENT_DIR, src)] ?? null;
      }

      return {
        url: `/${slugPath}/cover${ext}`,
        width,
        height,
        poster,
        blurDataURL,
      };
    }
  }
  return null;
}

function resolveAvatar(dir: string, slug: string[]): string | null {
  for (const ext of AVATAR_EXTENSIONS) {
    const src = join(dir, `avatar${ext}`);
    if (existsSync(src)) {
      const slugPath = slug.join("/");
      const destDir = join(PUBLIC_DIR, slugPath);
      const dest = join(destDir, `avatar${ext}`);
      mkdirSync(destDir, { recursive: true });
      syncFile(src, dest);
      return `/${slugPath}/avatar${ext}`;
    }
  }
  return null;
}

// Sync check — only returns URL if OG was already generated at build time.
export function resolveOG(content: Content): string | null {
  const slugPath = content.slug.join("/");
  const dest = join(PUBLIC_DIR, slugPath, "og.png");
  return existsSync(dest) ? `/${slugPath}/og.png` : null;
}

// Async generation — called from build scripts, not at render time.
export async function generateOG(content: Content): Promise<string | null> {
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
        const fg = await sharp(src)
          .resize(fgW, OG_HEIGHT, { fit: "inside" })
          .png()
          .toBuffer();

        await sharp(bg)
          .composite([{ input: fg, gravity: "centre" }])
          .png()
          .toFile(dest);
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
    const coverInfo = resolveCover(dir, slug);
    const rewritten = rewriteMediaPaths(content, slug);

    // isPublished: false = completely hidden, not even parsed
    if (data.isPublished === false) return null;

    const base: ContentBase = {
      slug,
      path: `/${slug.join("/")}`,
      content: rewritten,
      readingTime: stats,
      media,
      cover: coverInfo?.url ?? null,
      coverWidth: coverInfo?.width ?? data.coverWidth ?? null,
      coverHeight: coverInfo?.height ?? data.coverHeight ?? null,
      poster: coverInfo?.poster ?? null,
      blurDataURL: coverInfo?.blurDataURL ?? null,
      coverLoop: data.coverLoop ?? true,
      og: null,
      publishedAt: data.publishedAt ?? null,
      isDraft: data.isDraft ?? false,
      _dir: dir,
    };

    if (
      coverInfo &&
      ANIMATED_EXTENSIONS.includes(parse(coverInfo.url).ext) &&
      !base.coverWidth &&
      !base.coverHeight
    ) {
      const key = `dims:${slug.join("/")}`;
      if (!warnedCovers.has(key)) {
        warnedCovers.add(key);
        console.warn(
          `⚠ ${slug.join("/")} has animated cover but no dimensions — set coverWidth/coverHeight in frontmatter`,
        );
      }
    }

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
        feedThrough: data.feedThrough ?? false,
        avatar: resolveAvatar(dir, slug),
      };
    }

    const tags = data.tags ?? [];

    // Note: no title, max 280 chars
    if (!data.title) {
      if (content.trim().length > NOTE_MAX_CHARS) {
        throw new Error(
          `Note exceeds ${NOTE_MAX_CHARS} chars: ${filePath} (${content.trim().length} chars). Add a title to make it a page.`,
        );
      }
      return {
        ...base,
        type: "note",
        tags,
        source: data.source ?? null,
      };
    }

    // Page: has title
    return {
      ...base,
      type: "page",
      title: data.title,
      description: data.description ?? null,
      toc: extractTOC(content),
      tags,
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
      const indexPath = [
        join(fullPath, "index.mdx"),
        join(fullPath, "index.md"),
      ].find((p) => {
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

let _cachedContent: Content[] | null = null;

export function getAllContent(): Content[] {
  if (_cachedContent) return _cachedContent;

  const all = scanDirectory(CONTENT_DIR);

  // Deduplicate: folder wins over note/post with same slug
  const seen = new Map<string, Content>();
  for (const c of all) {
    const existing = seen.get(c.path);
    if (existing) {
      if (c.type === "folder" && existing.type !== "folder") {
        seen.set(c.path, c);
      }
      console.warn(
        `Duplicate slug: ${c.path} - keeping ${seen.get(c.path)?.type}, discarding ${c.type}`,
      );
    } else {
      seen.set(c.path, c);
    }
  }

  _cachedContent = [...seen.values()];
  return _cachedContent;
}

export function getContentByPath(slugPath: string[]): Content | null {
  return (
    getAllContent().find((c) => c.slug.join("/") === slugPath.join("/")) ?? null
  );
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

export function getAllPages(): Page[] {
  return getAllContent().filter(isPage);
}

export function getChildrenForSlug(slug: string[]): Content[] {
  const direct = slug.length === 0 ? getRootContent() : getChildren(slug);

  // Collect non-folder descendants from feedThrough folders
  const result: Content[] = [];
  const feedThroughQueue: string[][] = [];

  for (const c of direct) {
    if (isFolder(c) && c.feedThrough) {
      feedThroughQueue.push(c.slug);
    } else {
      result.push(c);
    }
  }

  for (
    let folderSlug = feedThroughQueue.pop();
    folderSlug !== undefined;
    folderSlug = feedThroughQueue.pop()
  ) {
    for (const child of getChildren(folderSlug)) {
      if (isFolder(child) && (child as Folder).feedThrough) {
        feedThroughQueue.push(child.slug);
      } else if (!isFolder(child)) {
        result.push(child);
      }
    }
  }

  return result;
}

export type AuthorInfo = { name: string; avatar: string | null; path: string };

export function getAuthorForContent(c: Content): AuthorInfo | null {
  const all = getAllContent();
  for (let i = c.slug.length - 1; i >= 1; i--) {
    const ancestorPath = c.slug.slice(0, i).join("/");
    const folder = all.find(
      (x) => x.slug.join("/") === ancestorPath && isFolder(x),
    ) as Folder | undefined;
    if (!folder?.feedThrough) continue;
    return { name: folder.title, avatar: folder.avatar, path: folder.path };
  }
  return null;
}

export function getBacklinks(target: Content): Content[] {
  const targetSlug = target.slug.join("/");
  return getAllContent().filter((c) => {
    if (c.path === target.path) return false;
    return c.content.includes(`slug="${targetSlug}"`);
  });
}

export function getTagsFromContent(items: Content[]): string[] {
  const tags = new Set<string>();
  for (const c of items) {
    if (isPost(c)) {
      for (const tag of c.tags) tags.add(tag);
    } else if (isFolder(c)) {
      for (const tag of getFolderTags(c)) tags.add(tag);
    }
  }
  return [...tags].sort();
}

export function getFolderTags(folder: Folder): string[] {
  const children = getChildren(folder.slug);
  const tags = new Set<string>();
  for (const c of children) {
    if (isPost(c)) {
      for (const tag of c.tags) tags.add(tag);
    }
  }
  return [...tags];
}

// ============================================================================
// SCORING & RECOMMENDATIONS
// ============================================================================

function scoreForFeatured(c: Content): number {
  let score = 0;

  if (isPage(c)) {
    if (c.pinned) score += 10000;
    if (c.updatedAt) {
      // More recent updatedAt = higher score (epoch ms as tiebreaker)
      score += new Date(c.updatedAt).getTime() / 1e10;
    }
  }

  if (c.cover) score += 500;

  if (c.publishedAt) {
    // More recent publishedAt = higher score
    score += new Date(c.publishedAt).getTime() / 1e10;
  }

  return score;
}

export function getFeaturedChildren(folderSlug: string[]): Content[] {
  return getChildren(folderSlug)
    .filter((c) => c.publishedAt && !c.isDraft)
    .sort((a, b) => scoreForFeatured(b) - scoreForFeatured(a));
}

export function wasRecentlyUpdated(c: Content): boolean {
  if (!isPage(c) || !c.updatedAt || !c.publishedAt) return false;
  return new Date(c.updatedAt).getTime() > new Date(c.publishedAt).getTime();
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
