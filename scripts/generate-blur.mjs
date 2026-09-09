import { createHash } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, parse, relative } from "node:path";
import sharp from "sharp";
import { IMAGE_EXTENSIONS } from "../lib/media.ts";
import { prepareMedia } from "../lib/prepare-media.ts";

const CONTENT_DIR = join(process.cwd(), "content");
// Generated inputs must survive Next clearing its build output.
const OUT_DIR = join(process.cwd(), ".source", "media");
const OUT_FILE = join(OUT_DIR, "blur-manifest.json");
const META_FILE = join(OUT_DIR, "blur-manifest.meta.json");
const recipe = createHash("sha256")
  .update(readFileSync(new URL(import.meta.url)))
  .update(readFileSync(new URL("../lib/prepare-media.ts", import.meta.url)))
  .update(JSON.stringify(sharp.versions))
  .digest("hex");

function findBlurSources(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findBlurSources(full));
      continue;
    }
    const { ext } = parse(entry.name);
    if (IMAGE_EXTENSIONS.includes(ext.toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

async function generateBlur(imagePath) {
  const prepared = await prepareMedia(readFileSync(imagePath));
  return prepared.asset.blurDataURL;
}

function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

const prevManifest = readJSON(OUT_FILE);
const prevMeta = readJSON(META_FILE);
const manifest = {};
const meta = { recipe };

let regenCount = 0;
const sources = findBlurSources(CONTENT_DIR);

for (const src of sources) {
  const key = relative(CONTENT_DIR, src);
  const mtime = statSync(src).mtimeMs;
  meta[key] = mtime;

  if (
    prevMeta.recipe === recipe &&
    prevMeta[key] === mtime &&
    typeof prevManifest[key] === "string" &&
    prevManifest[key].length > 0
  ) {
    manifest[key] = prevManifest[key];
    continue;
  }

  manifest[key] = await generateBlur(src);
  regenCount++;
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2));
writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
console.log(
  `Blur manifest: ${Object.keys(manifest).length} entries (${regenCount} regenerated)`,
);
