import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/site";
import {
  type Content,
  getAllContent,
  isFolder,
  isListed,
  isPage,
  isPost,
} from "@/lib/content";

// Every page offered to crawlers, built at deploy like every page: each listed piece
// (`isListed`, the same test the RSS feed and recommendations use), and a folder when
// something listed lives in it. The tag filter (`?tag=`) is the same page filtered,
// never a page of its own, so no tag is listed.

function date(value: Date | string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime()))
    throw new Error(`sitemap: unreadable date ${String(value)}`);
  return d;
}

/** When a piece last changed, by its own dates: a page's edit when later than its
 *  publication. */
function changedAt(c: Content & { publishedAt: Date }): Date {
  const published = date(c.publishedAt);
  if (isPage(c) && c.updatedAt) {
    const updated = date(c.updatedAt);
    return updated > published ? updated : published;
  }
  return published;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const all = getAllContent();
  const ancestors = (c: Content) =>
    c.slug.slice(0, -1).map((_, i) => c.slug.slice(0, i + 1).join("/"));
  const published = all.filter(isPost).filter(isListed);

  // A folder changed when the newest piece inside it did.
  const folderChanged = new Map<string, Date>();
  for (const c of published) {
    const at = changedAt(c);
    for (const a of ancestors(c)) {
      const seen = folderChanged.get(a);
      if (!seen || at > seen) folderChanged.set(a, at);
    }
  }
  const folders = all.filter(
    (c) => isFolder(c) && folderChanged.has(c.slug.join("/")),
  );

  const pieces = [
    ...published.map((c) => ({ path: c.path, at: changedAt(c) })),
    ...folders.map((c) => {
      const at = folderChanged.get(c.slug.join("/"));
      if (!at) throw new Error(`sitemap: ${c.path} has no published piece`);
      return { path: c.path, at };
    }),
  ].sort((a, b) => a.path.localeCompare(b.path));
  if (pieces.length === 0) throw new Error("sitemap: no published content");

  const newest = new Date(Math.max(...pieces.map((p) => p.at.getTime())));
  return [
    { url: SITE_URL, lastModified: newest },
    ...pieces.map((p) => ({ url: `${SITE_URL}${p.path}`, lastModified: p.at })),
    { url: `${SITE_URL}/privacy` },
  ];
}
