// WHAT NEXT IS HANDED READY, run before `next dev` and `next build` (package.json).
//
// 1. BLURS. A blur data URL for every local image (the ui registry's `prepareMedia`),
//    written to .next/cache/prepare/blur.json, which lib/content reads at import.
// 2. MEDIA. The media beside every published piece (lib/content's `dir`) is copied to
//    the same path under public/, where the CDN serves it as a static file; lib/content
//    names a file by that path. A piece with `isPublished: false` is never read, so
//    nothing beside it is served.
// 3. PREVIEWS. Every link preview (`ogImagePath`) drawn by lib/og to
//    public/og/<slug>.jpg: a static file, so a crawler fetching one runs no function
//    and reads no ISR cache.
//
// Blurs and previews are kept in .next/cache/prepare under a hash of what they are made
// from, the bytes and the code that draws them, never a file's mtime (a fresh clone
// touches every file). `next build` keeps .next/cache and Vercel restores it before
// each deploy, so a deploy draws only what changed.

import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { availableParallelism } from "node:os";
import { dirname, join, relative } from "node:path";
import sharp from "sharp";
import { IMAGE_EXTENSIONS, isMedia } from "@/lib/media";
import { prepareMedia } from "@/lib/prepare-media";
import { BLUR_MANIFEST, PREPARED_DIR } from "@/lib/prepared";

const ROOT = process.cwd();
const CONTENT = join(ROOT, "content");
const PUBLIC = join(ROOT, "public");
const OG_CACHE = join(PREPARED_DIR, "og");
const OG_PUBLIC = join(PUBLIC, "og");
const started = performance.now();

const require = createRequire(import.meta.url);
const sha = (...parts: (string | Buffer)[]) => {
  const h = createHash("sha256");
  for (const p of parts) h.update(p).update("\0");
  return h.digest("hex");
};
const source = (path: string) => readFileSync(join(ROOT, path));
const versionOf = (pkg: string): string =>
  JSON.parse(readFileSync(require.resolve(`${pkg}/package.json`), "utf8"))
    .version;

/** `work` over every item, as many at once as the machine has cores; results in the
 *  items' order. */
async function inParallel<T, R>(
  items: T[],
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    for (let i = next++; i < items.length; i = next++)
      results[i] = await work(items[i] as T);
  };
  await Promise.all(Array.from({ length: availableParallelism() }, worker));
  return results;
}

function* filesUnder(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* filesUnder(path);
    else yield path;
  }
}
const media = [...filesUnder(CONTENT)].filter(isMedia);

// 1. BLURS
const BLUR_KEYS = join(PREPARED_DIR, "blur.keys.json");
const blurRecipe = sha(
  source("lib/prepare-media.ts"),
  JSON.stringify(sharp.versions),
);
const readJSON = (path: string): Record<string, string> =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
const blurs = readJSON(BLUR_MANIFEST);
const blurKeys = readJSON(BLUR_KEYS);
const images = media.filter((src) =>
  IMAGE_EXTENSIONS.includes(src.slice(src.lastIndexOf(".")).toLowerCase()),
);
const prepared = await inParallel(images, async (src) => {
  const rel = relative(CONTENT, src);
  const key = sha(blurRecipe, readFileSync(src));
  const kept = blurKeys[rel] === key ? blurs[rel] : undefined;
  const blur =
    kept ?? (await prepareMedia(readFileSync(src))).asset.blurDataURL;
  if (!blur) throw new Error(`${rel}: prepareMedia made no blur`);
  return { rel, key, blur, made: !kept };
});
const byPath = (pick: (b: (typeof prepared)[number]) => string) =>
  JSON.stringify(
    Object.fromEntries(prepared.map((b) => [b.rel, pick(b)])),
    null,
    2,
  );
mkdirSync(PREPARED_DIR, { recursive: true });
writeFileSync(
  BLUR_MANIFEST,
  byPath((b) => b.blur),
);
writeFileSync(
  BLUR_KEYS,
  byPath((b) => b.key),
);

// lib/content reads blur.json at import, so it is imported after 1.
const { getAllContent, ogImagePath } = await import("@/lib/content");
const { stillOf } = await import("@/lib/og");

// 2. MEDIA
const published = new Set(getAllContent().map((c) => c.dir));
const served = media.filter((src) => published.has(dirname(src)));
let copied = 0;
for (const src of served) {
  const dest = join(PUBLIC, relative(CONTENT, src));
  const from = statSync(src);
  if (existsSync(dest)) {
    const to = statSync(dest);
    // A copy carries its source's mtime, written back with less than a millisecond's
    // precision, so equal means within one.
    if (to.size === from.size && Math.abs(to.mtimeMs - from.mtimeMs) < 1)
      continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { preserveTimestamps: true });
  copied++;
}

// 3. PREVIEWS
const ogRecipe = sha(
  source("lib/og.ts"),
  JSON.stringify(sharp.versions),
  versionOf("@resvg/resvg-js"),
);
rmSync(OG_PUBLIC, { recursive: true, force: true });
mkdirSync(OG_CACHE, { recursive: true });
const withPreview = getAllContent().flatMap((content) => {
  const url = ogImagePath(content);
  return url ? [{ content, url }] : [];
});
const previews = await inParallel(withPreview, async ({ content, url }) => {
  const still = stillOf(content);
  const cached = join(OG_CACHE, `${sha(ogRecipe, ...still.inputs)}.jpg`);
  const made = !existsSync(cached);
  if (made) writeFileSync(cached, await still.draw());
  const dest = join(PUBLIC, url);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(cached, dest);
  return { cached, made };
});
const used = new Set(previews.map((p) => p.cached));
for (const name of readdirSync(OG_CACHE)) {
  const path = join(OG_CACHE, name);
  if (!used.has(path)) rmSync(path);
}

const count = (list: { made: boolean }[]) => list.filter((x) => x.made).length;
console.log(
  `prepare: ${served.length} of ${media.length} media served (${copied} copied), ${prepared.length} blurs (${count(prepared)} made), ${previews.length} previews (${count(previews)} drawn) in ${Math.round(performance.now() - started)} ms`,
);
