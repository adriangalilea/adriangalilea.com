import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, parse, relative } from "node:path";
import sharp from "sharp";

const CONTENT_DIR = join(process.cwd(), "content");
const PUBLIC_DIR = join(process.cwd(), "public");
const OUT_DIR = join(process.cwd(), ".next");
const OUT_FILE = join(OUT_DIR, "blur-manifest.json");

const IMAGE_EXTENSIONS = new Set([".png", ".webp", ".jpg", ".jpeg"]);

function findBlurSources(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findBlurSources(full));
      continue;
    }
    const { name, ext } = parse(entry.name);
    if (
      (name === "cover" || name === "poster") &&
      IMAGE_EXTENSIONS.has(ext.toLowerCase())
    ) {
      results.push(full);
    }
  }
  return results;
}

async function generateBlur(imagePath) {
  const buf = await sharp(imagePath)
    .resize(20)
    .blur(2)
    .jpeg({ quality: 40 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

const sources = findBlurSources(CONTENT_DIR);
const manifest = {};

for (const src of sources) {
  const key = relative(CONTENT_DIR, src);
  try {
    manifest[key] = await generateBlur(src);
  } catch (e) {
    console.warn(`Failed to generate blur for ${key}:`, e.message);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2));
console.log(
  `Blur manifest: ${Object.keys(manifest).length} entries written to ${OUT_FILE}`,
);

// OG blur: generate heavily blurred 1200x630 PNGs for Satori OG backgrounds.
// Satori doesn't support CSS filter:blur(), so we pre-render them here.
// Finds cover/poster/og images in content dirs, outputs to public/<slug>/<name>.og.blur.png

function findOGSources(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findOGSources(full));
      continue;
    }
    const { name, ext } = parse(entry.name);
    if (
      (name === "cover" || name === "poster" || name === "og") &&
      IMAGE_EXTENSIONS.has(ext.toLowerCase())
    ) {
      results.push(full);
    }
  }
  return results;
}

let ogBlurCount = 0;
for (const src of findOGSources(CONTENT_DIR)) {
  const slugPath = relative(CONTENT_DIR, parse(src).dir);
  if (!slugPath) continue;
  const { name } = parse(src);
  const destDir = join(PUBLIC_DIR, slugPath);
  const dest = join(destDir, `${name}.og.blur.png`);
  if (existsSync(dest)) continue;
  try {
    mkdirSync(destDir, { recursive: true });
    await sharp(src)
      .resize(1200, 630, { fit: "cover" })
      .blur(60)
      .modulate({ brightness: 1.3 })
      .png()
      .toFile(dest);
    ogBlurCount++;
  } catch (e) {
    console.warn(`OG blur failed for ${slugPath}/${name}:`, e.message);
  }
}
console.log(`OG blur: ${ogBlurCount} new images generated`);
