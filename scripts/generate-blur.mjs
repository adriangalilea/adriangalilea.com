import { readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, parse } from "node:path";
import sharp from "sharp";

const CONTENT_DIR = join(process.cwd(), "content");
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
