import { SITE_URL } from "@/data/site";
import { getAllContent, isNote, isPage } from "@/lib/content";

export function GET() {
  const published = getAllContent()
    .filter(
      (c): c is typeof c & { publishedAt: string } =>
        (isPage(c) || isNote(c)) && !!c.publishedAt && !c.isDraft,
    )
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

  const items = published
    .map((c) => {
      const url = `${SITE_URL}${c.path}`;
      const pubDate = new Date(c.publishedAt).toUTCString();
      const title = isPage(c) ? c.title : c.content.slice(0, 80);
      const description = isPage(c) ? c.description : null;
      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${pubDate}</pubDate>${description ? `\n      <description>${escapeXml(description)}</description>` : ""}
    </item>`;
    })
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Adrian Galilea</title>
    <link>${SITE_URL}</link>
    <description>Adrian Galilea's personal site</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
