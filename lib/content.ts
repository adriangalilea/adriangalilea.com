import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, parse, relative } from "node:path";
import GithubSlugger from "github-slugger";
import matter from "gray-matter";
import imageSize from "image-size";
import { toString as mdastToString } from "mdast-util-to-string";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import {
  ANIMATED_EXTENSIONS,
  AVATAR_EXTENSIONS,
  COVER_EXTENSIONS,
  IMAGE_EXTENSIONS,
  POSTER_EXTENSIONS,
} from "@/lib/media";
import { BLUR_MANIFEST } from "@/lib/prepared";
import { type QuoteTone, toneFrom } from "@/lib/quote-card";
import { formatDate } from "@/lib/utils";

// A READER, NOTHING ELSE. The media beside a published piece is served from the same
// path under public/ (`scripts/prepare.mts` mirrors it, by `dir`, before Next runs), so
// a file's URL is its path in content/ and nothing here writes to disk.
export const CONTENT_DIR = join(process.cwd(), "content");

// The preparation step creates this input. Missing it is a broken pipeline, not a
// reason to silently publish without prepared previews.
const blurManifest: Record<string, string> = JSON.parse(
  readFileSync(BLUR_MANIFEST, "utf-8"),
);
const NOTE_MAX_CHARS = 280;
export function imageBlur(src: string): string | undefined {
  return blurManifest[src.replace(/^\//, "")];
}

const warnedCovers = new Set<string>();

// ============================================================================
// TYPES
// ============================================================================

export type Status = "soon" | "shipped" | "lab" | "sunset";
export type Verdict = "pending" | "partial" | "confirmed" | "missed";

export type TOCItem = {
  depth: number;
  title: string;
  id: string;
};

// Shared fields all content has
type ContentBase = {
  slug: string[];
  path: string;
  content: string;
  cover: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  poster: string | null;
  blurDataURL: string | null;
  publishedAt: Date | null;
  isDraft: boolean;
  /** The directory under content/ it was read from: the media in it is served. */
  dir: string;
};

// Post: all non-folder content
type PostBase = ContentBase & {
  tags: string[];
};

// Note: short-form, no title, no description
export type Note = PostBase & {
  type: "note";
  source: string | null;
  estimatedDate: string | null;
  verdict: Verdict | null;
  deadline: string | null;
};

// Page: long-form with title
export type Page = PostBase & {
  type: "page";
  title: string;
  description: string | null;
  toc: TOCItem[];
  updatedAt: Date | null;
  verdict: Verdict | null;
  deadline: string | null;
  source: string | null;
};

export type Post = Note | Page;

// Folder: container
export type Folder = ContentBase & {
  type: "folder";
  title: string;
  description: string | null;
  status: Status | null;
  links: Record<string, string>;
  feedThrough: boolean;
  avatar: string | null;
  /** What the quote card needs to know about the portrait, read from the sidecar
   *  `avatar.json` that `mise portrait` (ui repo) writes beside it: the picture's tone
   *  and where its subject sits. Asset preparation, done once on the Mac — the build
   *  reads two numbers and never touches a pixel. Null when the sidecar is missing,
   *  which is a portrait half-prepared and is said so at build. */
  portrait: {
    tone: QuoteTone;
    focus: number;
    /** Natural pixels of the avatar file - what the lightbox needs to fly it home. */
    size: [number, number];
  } | null;
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

/** The URL a directory under content/ is served from: its own path. */
function urlOf(dir: string): string {
  const rel = relative(CONTENT_DIR, dir);
  return rel ? `/${rel}` : "";
}

const mdxParser = unified().use(remarkParse).use(remarkMdx);

const NOTE_EMBED_NAMES = new Set(["ContentQuote"]);
const NOTE_MAX_EMBEDS = 1;

type MDXAnalysis = {
  textContent: string;
  toc: TOCItem[];
  embedCount: number;
};

function analyzeMDX(source: string): MDXAnalysis {
  const tree = mdxParser.parse(source);
  const toc: TOCItem[] = [];
  let embedCount = 0;
  // A TOC entry links to the id rehype-slug gives its heading (lib/mdx), so it is made
  // by the same slugger, fed every heading in order: a repeated title numbers the same.
  const slugger = new GithubSlugger();

  function walk(nodes: typeof tree.children) {
    for (const node of nodes) {
      if (node.type === "heading") {
        const depth = (node as { depth: number }).depth;
        const title = mdastToString(node);
        const id = slugger.slug(title);
        if (depth >= 2 && depth <= 4) toc.push({ depth, title, id });
      }
      if (
        node.type === "mdxJsxFlowElement" &&
        NOTE_EMBED_NAMES.has((node as { name: string }).name)
      ) {
        embedCount++;
      }
      if ("children" in node) {
        walk((node as { children: typeof tree.children }).children);
      }
    }
  }

  walk(tree.children);

  return {
    textContent: mdastToString(tree),
    toc,
    embedCount,
  };
}

/** `./x.png` is a file beside the one that names it, served at its own path. */
function rewriteMediaPaths(content: string, dir: string): string {
  const base = urlOf(dir);
  return content
    .replace(/\]\(\.\//g, `](${base}/`)
    .replace(/src=["']\.\//g, `src="${base}/`);
}

type CoverInfo = {
  url: string;
  width: number | null;
  height: number | null;
  poster: string | null;
  blurDataURL: string | null;
} | null;

function resolveCover(dir: string): CoverInfo {
  const base = urlOf(dir);
  for (const ext of COVER_EXTENSIONS) {
    const src = join(dir, `cover${ext}`);
    if (existsSync(src)) {
      // Videos have no dimensions until their poster is measured below.
      let width: number | null = null;
      let height: number | null = null;
      if (IMAGE_EXTENSIONS.includes(ext)) {
        const dims = imageSize(readFileSync(src));
        width = dims.width ?? null;
        height = dims.height ?? null;
      }

      let poster: string | null = null;
      let blurDataURL: string | null = null;
      if (ANIMATED_EXTENSIONS.includes(ext)) {
        for (const posterExt of POSTER_EXTENSIONS) {
          const posterSrc = join(dir, `poster${posterExt}`);
          if (existsSync(posterSrc)) {
            poster = `${base}/poster${posterExt}`;
            blurDataURL =
              blurManifest[relative(CONTENT_DIR, posterSrc)] ?? null;

            if (!width || !height) {
              const dims = imageSize(readFileSync(posterSrc));
              width = dims.width ?? null;
              height = dims.height ?? null;
            }
            break;
          }
        }
        if (!poster) {
          const warnKey = `poster:${base}`;
          if (!warnedCovers.has(warnKey)) {
            warnedCovers.add(warnKey);
            console.warn(
              `⚠ ${base} has animated cover but no poster: add poster.webp for crossfade`,
            );
          }
        }
      } else {
        blurDataURL = blurManifest[relative(CONTENT_DIR, src)] ?? null;
      }

      return {
        url: `${base}/cover${ext}`,
        width,
        height,
        poster,
        blurDataURL,
      };
    }
  }
  return null;
}

/** The portrait's sidecar, written by `mise portrait` beside the avatar. A portrait
 *  without one renders neutral and centred, and says so once at build - the fix is
 *  `mise portraits content/quotes` in the ui repo, not a decoder here. */
function readPortrait(dir: string, slug: string[]): Folder["portrait"] {
  const side = join(dir, "avatar.json");
  const hasAvatar = AVATAR_EXTENSIONS.some((ext) =>
    existsSync(join(dir, `avatar${ext}`)),
  );
  if (!existsSync(side)) {
    if (hasAvatar)
      console.warn(
        `[content] ${slug.join("/")}: avatar has no avatar.json - run \`mise portraits\` (ui repo)`,
      );
    return null;
  }
  // The sidecar holds FACTS - where the subject is, the average colour - and the tone is
  // derived here by the rule (pure arithmetic, no pixel), so a change to the rule in the
  // registry needs no re-annotation of forty files.
  const raw = JSON.parse(readFileSync(side, "utf-8")) as {
    focus: number;
    average: [number, number, number];
    size: [number, number];
  };
  return { tone: toneFrom(...raw.average), focus: raw.focus, size: raw.size };
}

function resolveAvatar(dir: string): string | null {
  const ext = AVATAR_EXTENSIONS.find((e) =>
    existsSync(join(dir, `avatar${e}`)),
  );
  return ext ? `${urlOf(dir)}/avatar${ext}` : null;
}

// ============================================================================
// PARSING
// ============================================================================

function parseContent(filePath: string, slug: string[]): Content | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    if (data.isPublished === false) return null;

    const { textContent, toc, embedCount } = analyzeMDX(content);
    const { dir, name } = parse(filePath);
    // A directory's index owns what lies beside it (cover, poster, avatar, og.png); a
    // sibling file shares the directory and owns none of it.
    const owner = name === "index";
    const coverInfo = owner ? resolveCover(dir) : null;
    const rewritten = rewriteMediaPaths(content, dir);

    const base: ContentBase = {
      slug,
      path: `/${slug.join("/")}`,
      content: rewritten,
      cover: coverInfo?.url ?? null,
      coverWidth: coverInfo?.width ?? null,
      coverHeight: coverInfo?.height ?? null,
      poster: coverInfo?.poster ?? null,
      blurDataURL: coverInfo?.blurDataURL ?? null,
      publishedAt: data.publishedAt ?? null,
      isDraft: data.isDraft ?? false,
      dir,
    };

    if (data.type === "folder") {
      return {
        ...base,
        type: "folder",
        title: data.title ?? slug[slug.length - 1],
        description: data.description ?? null,
        status: data.status ?? null,
        links: data.links ?? {},
        feedThrough: data.feedThrough ?? false,
        avatar: resolveAvatar(dir),
        portrait: readPortrait(dir, slug),
      };
    }

    const tags = data.tags ?? [];

    if (!data.title) {
      const textLength = textContent.trim().length;
      const isExempt = slug[0] === "quotes" || slug[0] === "predictions";
      if (!isExempt && textLength > NOTE_MAX_CHARS) {
        throw new Error(
          `Note exceeds ${NOTE_MAX_CHARS} chars: ${filePath} (${textLength} chars). Add a title to make it a page.`,
        );
      }
      if (embedCount > NOTE_MAX_EMBEDS) {
        throw new Error(
          `Note has ${embedCount} embeds: ${filePath} (max ${NOTE_MAX_EMBEDS}). Add a title to make it a page.`,
        );
      }
      return {
        ...base,
        type: "note",
        tags,
        source: data.source ?? null,
        estimatedDate: data.estimatedDate ?? null,
        verdict: data.verdict ?? null,
        deadline: data.deadline ?? null,
      };
    }

    return {
      ...base,
      type: "page",
      title: data.title,
      description: data.description ?? null,
      toc,
      tags,
      updatedAt: data.updatedAt ?? null,
      verdict: data.verdict ?? null,
      deadline: data.deadline ?? null,
      source: data.source ?? null,
    };
  } catch (e) {
    // A file that cannot be parsed fails the build; a page that silently vanishes
    // from the site is worse than one that names its error.
    throw new Error(`${filePath}: ${(e as Error).message}`, { cause: e });
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
let _backlinksMap: Map<string, Content[]> | null = null;

const BACKLINK_RE = /slug=["']([^"']+)["']/g;

function buildBacklinksMap(all: Content[]): Map<string, Content[]> {
  const map = new Map<string, Content[]>();
  for (const c of all) {
    BACKLINK_RE.lastIndex = 0;
    const seen = new Set<string>();
    let m: RegExpExecArray | null = BACKLINK_RE.exec(c.content);
    while (m !== null) {
      const target = m[1];
      if (!seen.has(target)) {
        seen.add(target);
        const list = map.get(target);
        if (list) list.push(c);
        else map.set(target, [c]);
      }
      m = BACKLINK_RE.exec(c.content);
    }
  }
  return map;
}

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
  _backlinksMap = buildBacklinksMap(_cachedContent);
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

export function getAllFolders(): Folder[] {
  return getAllContent().filter(isFolder);
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

export type AuthorInfo = {
  name: string;
  avatar: string | null;
  path: string;
  portrait: Folder["portrait"];
};

/** The date a note shows, already formatted - the quote card takes a string because it
 *  does not own a locale. `estimatedDate` is when the words were said ("~500 BC") and
 *  wins over `publishedAt`, which is when they went on the site. */
export function noteDate(note: Note): string | null {
  if (note.estimatedDate) return note.estimatedDate;
  return note.publishedAt ? formatDate(note.publishedAt) : null;
}

export function getAuthorForContent(c: Content): AuthorInfo | null {
  const all = getAllContent();
  for (let i = c.slug.length - 1; i >= 1; i--) {
    const ancestorPath = c.slug.slice(0, i).join("/");
    const folder = all.find(
      (x) => x.slug.join("/") === ancestorPath && isFolder(x),
    ) as Folder | undefined;
    if (!folder?.feedThrough) continue;
    return {
      name: folder.title,
      avatar: folder.avatar,
      path: folder.path,
      portrait: folder.portrait,
    };
  }
  return null;
}

/** Where a piece's link preview is served, a static file `scripts/prepare.mts` draws:
 *  every note gets one, a page or a folder when it has a cover. Null for the rest. */
export function ogImagePath(c: Content): string | null {
  return isNote(c) || c.cover ? `/og/${c.slug.join("/")}.jpg` : null;
}

export function getBacklinks(target: Content): Content[] {
  if (!_backlinksMap) getAllContent();
  const list = _backlinksMap?.get(target.slug.join("/"));
  if (!list) return [];
  return list.filter((c) => c.path !== target.path);
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
    .filter((c) => c.publishedAt)
    .sort((a, b) => scoreForFeatured(b) - scoreForFeatured(a));
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
