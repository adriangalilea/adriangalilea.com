import { blog } from "fumadocs-mdx:collections/server";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";
import { loader } from "fumadocs-core/source";
import type { MDXContent } from "mdx/types";
import { existsSync, cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

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

export function blogData(page: AnyPage) {
	const d = page.data as unknown as Record<string, unknown>;
	return {
		body: d.body as MDXContent,
		publishedAt: d.publishedAt as Date,
		editedAt: d.editedAt as Date | undefined,
		tags: (d.tags as string[]) ?? [],
		draft: (d.draft as boolean) ?? false,
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
	const all = blogSource.getPages().sort(byDate);
	return {
		published: all.filter((p) => !blogData(p).draft),
		drafts: all.filter((p) => blogData(p).draft),
	};
}
