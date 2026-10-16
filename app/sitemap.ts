import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/site";
import { type Content, getAllContent, isFolder, isPage } from "@/lib/content";

// Every page a reader can reach from the feed, for crawlers, which until now found the
// pieces only through the RSS feed and the links inside articles. Built at deploy like
// every page. Published means on the site and finished: a `publishedAt`, not a draft,
// inside no draft folder (`isPublished: false` never reaches `getAllContent`). A folder
// is a page when something published lives in it. The tag filter (`?tag=`) is the same
// page filtered, never a page of its own, so no tag is listed.

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
  const draftFolders = new Set(
    all.filter((c) => isFolder(c) && c.isDraft).map((c) => c.slug.join("/")),
  );
  const ancestors = (c: Content) =>
    c.slug.slice(0, -1).map((_, i) => c.slug.slice(0, i + 1).join("/"));

  const published = all.filter(
    (c): c is Content & { publishedAt: Date } =>
      !isFolder(c) &&
      c.publishedAt !== null &&
      !c.isDraft &&
      !ancestors(c).some((a) => draftFolders.has(a)),
  );

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
