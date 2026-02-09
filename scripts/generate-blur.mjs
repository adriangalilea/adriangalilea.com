import { readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, parse } from "node:path";
import sharp from "sharp";

const CONTENT_DIR = join(process.cwd(), "content");
const PUBLIC_DIR = join(process.cwd(), "public");
const OUT_DIR = join(process.cwd(), ".next");
const OUT_FILE = join(OUT_DIR, "blur-manifest.json");

const IMAGE_EXTENSIONS = new Set([".png", ".webp", ".jpg", ".jpeg"]);
const COVER_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif"];
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

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
		if ((name === "cover" || name === "poster") && IMAGE_EXTENSIONS.has(ext.toLowerCase())) {
			results.push(full);
		}
	}
	return results;
}

async function generateBlur(imagePath) {
	const buf = await sharp(imagePath).resize(20).blur(2).jpeg({ quality: 40 }).toBuffer();
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
console.log(`Blur manifest: ${Object.keys(manifest).length} entries written to ${OUT_FILE}`);

// OG image generation
function findContentDirs(dir) {
	const dirs = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith(".")) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			dirs.push(full);
			dirs.push(...findContentDirs(full));
		}
	}
	return dirs;
}

async function generateOG(contentDir, slugPath) {
	const destDir = join(PUBLIC_DIR, slugPath);
	const dest = join(destDir, "og.png");
	if (existsSync(dest)) return;

	for (const ext of COVER_EXTENSIONS) {
		const src = join(contentDir, `cover${ext}`);
		if (!existsSync(src)) continue;
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
			console.log(`OG: ${slugPath}/og.png`);
		} catch (e) {
			console.warn(`OG failed for ${slugPath}:`, e.message);
		}
		return;
	}
}

let ogCount = 0;
for (const dir of [CONTENT_DIR, ...findContentDirs(CONTENT_DIR)]) {
	const slugPath = relative(CONTENT_DIR, dir) || "";
	if (!slugPath) continue;
	await generateOG(dir, slugPath);
	ogCount++;
}
console.log(`OG images: checked ${ogCount} content directories`);
