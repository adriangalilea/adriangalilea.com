import { blog } from "fumadocs-mdx:collections/server";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";
import { loader } from "fumadocs-core/source";
import type { MDXContent } from "mdx/types";
import { existsSync, cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

export const blogSource = loader({
	baseUrl: "/blog",
	source: toFumadocsSource(blog, []),
});

type AnyPage = ReturnType<typeof blogSource.getPages>[number];

const COVER_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"];

function getPageInfo(page: AnyPage) {
	return (page.data as unknown as Record<string, unknown>).info as
		| { fullPath: string; path: string }
		| undefined;
}

// Copies cover images to public/ so they can be served as static files.
// Returns the public URL path if a cover exists, null otherwise.
export function resolveCover(page: AnyPage): string | null {
	const info = getPageInfo(page);
	if (!info?.fullPath) return null;

	const dir = dirname(info.fullPath);
	for (const ext of COVER_EXTENSIONS) {
		const src = join(dir, `cover${ext}`);
		if (existsSync(src)) {
			const slug = page.slugs[0];
			const destDir = join(process.cwd(), "public", "blog", slug);
			const dest = join(destDir, `cover${ext}`);
			mkdirSync(destDir, { recursive: true });
			cpSync(src, dest);
			return `/blog/${slug}/cover${ext}`;
		}
	}
	return null;
}

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const ogCache = new Map<string, string | null>();

export async function resolveOG(page: AnyPage): Promise<string | null> {
	const slug = page.slugs[0];
	if (ogCache.has(slug)) return ogCache.get(slug)!;

	const info = getPageInfo(page);
	if (!info?.fullPath) { ogCache.set(slug, null); return null; }

	const dir = dirname(info.fullPath);
	const destDir = join(process.cwd(), "public", "blog", slug);
	const dest = join(destDir, "og.png");
	const url = `/blog/${slug}/og.png`;

	if (existsSync(dest)) { ogCache.set(slug, url); return url; }

	for (const ext of COVER_EXTENSIONS) {
		const src = join(dir, `cover${ext}`);
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
				const fgH = OG_HEIGHT;
				const fg = await sharp(src).resize(fgW, fgH, { fit: "inside" }).png().toBuffer();

				await sharp(bg)
					.composite([{ input: fg, gravity: "centre" }])
					.png()
					.toFile(dest);

				ogCache.set(slug, url);
				return url;
			} catch {
				ogCache.set(slug, null);
				return null;
			}
		}
	}
	ogCache.set(slug, null);
	return null;
}

export function blogData(page: AnyPage) {
	const d = page.data as unknown as Record<string, unknown>;
	return {
		body: d.body as MDXContent,
		publishedAt: d.publishedAt as Date,
		lastModified: d.lastModified as Date | undefined,
		tags: (d.tags as string[]) ?? [],
		isPublished: (d.isPublished as boolean) ?? true,
		isDraft: (d.isDraft as boolean) ?? false,
		description: d.description as string | undefined,
	};
}

function byDate(a: AnyPage, b: AnyPage) {
	return (
		new Date(blogData(b).publishedAt).getTime() -
		new Date(blogData(a).publishedAt).getTime()
	);
}

export function getBlogPosts() {
	const visible = blogSource.getPages().filter((p) => blogData(p).isPublished).sort(byDate);
	return {
		published: visible.filter((p) => !blogData(p).isDraft),
		drafts: visible.filter((p) => blogData(p).isDraft),
	};
}

export function toCardPost(page: AnyPage) {
	const d = blogData(page);
	return {
		url: page.url,
		slug: page.slugs[0],
		title: (page.data as { title?: string }).title ?? "",
		description: d.description,
		date: new Date(d.publishedAt).toISOString(),
		tags: d.tags,
		coverUrl: resolveCover(page),
		isDraft: d.isDraft,
	};
}

export function getRelatedPosts(currentSlug: string, limit = 3) {
	const current = blogSource.getPage([currentSlug]);
	if (!current) return [];

	const currentTags = blogData(current).tags;
	const published = blogSource.getPages()
		.filter((p) => blogData(p).isPublished && !blogData(p).isDraft && p.slugs[0] !== currentSlug)
		.sort(byDate);

	if (currentTags.length === 0) return published.slice(0, limit);

	return published
		.map((p) => {
			const shared = blogData(p).tags.filter((t) => currentTags.includes(t)).length;
			return { page: p, shared };
		})
		.sort((a, b) => b.shared - a.shared || byDate(a.page, b.page))
		.slice(0, limit)
		.map((r) => r.page);
}
