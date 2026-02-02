import { blogData, getBlogPosts } from "@/lib/source";
import { SITE_URL } from "@/data/site";

export function GET() {
	const { published } = getBlogPosts();

	const items = published
		.map((post) => {
			const d = blogData(post);
			const url = `${SITE_URL}${post.url}`;
			const pubDate = new Date(d.publishedAt).toUTCString();
			return `    <item>
      <title>${escapeXml(post.data.title ?? "")}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${pubDate}</pubDate>${d.description ? `\n      <description>${escapeXml(d.description)}</description>` : ""}
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
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>
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
