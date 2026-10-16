import { SITE_URL } from "@/data/site";
import { getAllContent, isListed, isPage, isPost } from "@/lib/content";

// Built at deploy, like every page: the feed changes only with the content, and
// reading content at request time copies media into public/, which a deployed
// function cannot write (it answered 500).
export const dynamic = "force-static";

export function GET() {
  const published = getAllContent()
    .filter(isPost)
    .filter(isListed)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

  const items = published
    .map((c) => {
      const url = `${SITE_URL}${c.path}`;
      const pubDate = new Date(c.publishedAt).toUTCString();
      const title = isPage(c) ? c.title : noteTitle(c.content);
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

/** A note has no title: its words on one line, cut at the last whole word before
 *  80 characters, with an ellipsis where it was cut. */
function noteTitle(content: string): string {
  const line = content.replace(/\s+/g, " ").trim();
  if (line.length <= 80) return line;
  const cut = line.slice(0, 80);
  const word = cut.lastIndexOf(" ");
  return `${(word > 40 ? cut.slice(0, word) : cut).replace(/[\s,.;:]+$/, "")}…`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
