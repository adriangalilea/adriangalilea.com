import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import imageSize from "image-size";
import type * as M from "mdast";
import {
  highlightTree,
  type PreparedMarkdown,
  prepareMarkdown,
} from "@/lib/markdown-prepare";

// THE SITE'S MARKDOWN, PREPARED (ui's markdown-prepare): every piece parsed once, with
// the facts only this repo holds. Its pictures are measured from content/ (a local
// image's URL is its path there: lib/content rewrites `./x.png` to it, and
// scripts/prepare.mts serves the same path from public/), and one that is not on
// disk is a broken post the build refuses. Its tags are the components a piece may
// name (TAGS, drawn by components/markdown.tsx). Its code is coloured here, as ui's
// `code` colours it, so no highlighter loads in a reader's browser.

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, "content");
const CACHE_DIR = join(ROOT, ".next", "cache", "content-markdown");

/** The components a piece may name as tags; any other is a broken post. */
export const TAGS = [
  "Bars",
  "CompareLines",
  "ContentQuote",
  "GitHub",
  "Prediction",
  "Telegram",
  "Tweet",
  "YouTube",
] as const;

/** A local picture's size, from its file; null for another site's. */
function measure(src: string) {
  if (!src.startsWith("/")) return null;
  const file = join(CONTENT_DIR, src);
  if (!existsSync(file))
    throw new Error(`image ${src} is not in content/ (looked at ${file})`);
  const { width, height } = imageSize(readFileSync(file));
  if (!width || !height) throw new Error(`image ${src}: no dimensions`);
  return { width, height };
}

const facts = new Map<string, PreparedMarkdown>();

/** A piece's words, headings, pictures and tags: read as content loads (lib/content),
 *  synchronous, nothing coloured; parsed once a process. */
export function prepared(source: string): PreparedMarkdown {
  const known = facts.get(source);
  if (known) return known;
  const made = prepareMarkdown(source, { measure, tags: TAGS });
  facts.set(source, made);
  return made;
}

// A DRAWN TREE IS KEPT BY EVERYTHING IT IS MADE FROM: the source, the pipeline (its
// packages and this file, read as files) and the pictures measured into it. Any of
// them changing prepares it again.
const PIPELINE = createHash("sha1")
  .update(
    ["shiki", "mdast-util-from-markdown", "micromark-extension-mdx-jsx"]
      .map(
        (pkg) =>
          JSON.parse(
            readFileSync(
              join(ROOT, "node_modules", pkg, "package.json"),
              "utf8",
            ),
          ).version,
      )
      .join(),
  )
  .update(readFileSync(join(ROOT, "lib/markdown.ts")))
  .update(readFileSync(join(ROOT, "lib/markdown-prepare.ts")))
  .update(readFileSync(join(ROOT, "lib/code-highlight.ts")))
  .digest("hex");

const memory = new Map<string, M.Root>();

/** A piece's tree as the page draws it, its code coloured: from memory, from disk
 *  (.next/cache, kept between builds), or prepared now. */
export async function treeOf(source: string): Promise<M.Root> {
  const read = prepared(source);
  const hash = createHash("sha1").update(PIPELINE).update(source);
  for (const image of read.images)
    hash.update(readFileSync(join(CONTENT_DIR, image.src)));
  const key = hash.digest("hex");
  const kept = memory.get(key);
  if (kept) return kept;
  const file = join(CACHE_DIR, `${key}.json`);
  if (existsSync(file)) {
    const tree = JSON.parse(readFileSync(file, "utf8")) as M.Root;
    memory.set(key, tree);
    return tree;
  }
  const tree = await highlightTree(read.tree);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(tree));
  memory.set(key, tree);
  return tree;
}
