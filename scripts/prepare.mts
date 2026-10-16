// WHAT NEXT IS HANDED READY, run before `next dev` and `next build` (package.json).
//
// 1. MEDIA. Every media file under content/ is copied to the same path under public/,
//    where the CDN serves it as a static file; lib/content names a file by that path.
// 2. BLURS. A blur data URL for every local image (the ui registry's `prepareMedia`),
//    written to .next/cache/prepare/blur.json, which lib/content reads at import.
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
import { dirname, join, relative } from "node:path";
import sharp from "sharp";
import { IMAGE_EXTENSIONS, isMedia } from "@/lib/media";
import { prepareMedia } from "@/lib/prepare-media";

const ROOT = process.cwd();
const CONTENT = join(ROOT, "content");
const PUBLIC = join(ROOT, "public");
const PREPARED = join(ROOT, ".next", "cache", "prepare");
const OG_CACHE = join(PREPARED, "og");
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

function* filesUnder(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* filesUnder(path);
    else yield path;
  }
}
const media = [...filesUnder(CONTENT)].filter(isMedia);

// 1. MEDIA
let copied = 0;
for (const src of media) {
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

// 2. BLURS
const BLUR = join(PREPARED, "blur.json");
const BLUR_KEYS = join(PREPARED, "blur.keys.json");
const blurRecipe = sha(
  source("lib/prepare-media.ts"),
  JSON.stringify(sharp.versions),
);
const readJSON = (path: string): Record<string, string> =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
const blurs = readJSON(BLUR);
const blurKeys = readJSON(BLUR_KEYS);
const nextBlurs: Record<string, string> = {};
const nextBlurKeys: Record<string, string> = {};
let blurred = 0;
for (const src of media) {
  if (!IMAGE_EXTENSIONS.includes(src.slice(src.lastIndexOf(".")).toLowerCase()))
    continue;
  const rel = relative(CONTENT, src);
  const bytes = readFileSync(src);
  const key = sha(blurRecipe, bytes);
  const kept = blurKeys[rel] === key ? blurs[rel] : undefined;
  const blur = kept ?? (await prepareMedia(bytes)).asset.blurDataURL;
  if (!blur) throw new Error(`${rel}: prepareMedia made no blur`);
  nextBlurs[rel] = blur;
  nextBlurKeys[rel] = key;
  if (!kept) blurred++;
}
mkdirSync(PREPARED, { recursive: true });
writeFileSync(BLUR, JSON.stringify(nextBlurs, null, 2));
writeFileSync(BLUR_KEYS, JSON.stringify(nextBlurKeys, null, 2));

// 3. PREVIEWS (lib/content reads blur.json at import, so it is imported after 2)
const { getAllContent, ogImagePath } = await import("@/lib/content");
const { stillOf } = await import("@/lib/og");
const ogRecipe = sha(
  source("lib/og.ts"),
  JSON.stringify(sharp.versions),
  versionOf("@resvg/resvg-js"),
);
rmSync(OG_PUBLIC, { recursive: true, force: true });
mkdirSync(OG_CACHE, { recursive: true });
const used = new Set<string>();
let drawn = 0;
let previews = 0;
for (const content of getAllContent()) {
  const url = ogImagePath(content);
  if (!url) continue;
  const still = stillOf(content);
  const cached = join(OG_CACHE, `${sha(ogRecipe, ...still.inputs)}.jpg`);
  used.add(cached);
  if (!existsSync(cached)) {
    writeFileSync(cached, await still.draw());
    drawn++;
  }
  const dest = join(PUBLIC, url);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(cached, dest);
  previews++;
}
for (const name of readdirSync(OG_CACHE)) {
  const path = join(OG_CACHE, name);
  if (!used.has(path)) rmSync(path);
}

console.log(
  `prepare: ${media.length} media (${copied} copied), ${Object.keys(nextBlurs).length} blurs (${blurred} made), ${previews} previews (${drawn} drawn) in ${Math.round(performance.now() - started)} ms`,
);
