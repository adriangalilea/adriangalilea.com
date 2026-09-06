import {
  getAllContent,
  getContentByPath,
  isFolder,
  isNote,
  isPage,
} from "@/lib/content";
import { generateCoverOG, generateQuoteOG } from "@/lib/og";

// Prerendered at build: the serverless runtime has neither content/ nor
// public/ in its bundle, so a dynamic render can only 404.
export const dynamic = "force-static";

// EVERY note gets a card, not only the ones with an author: Adrian's own notes shared a
// bare link for as long as the quote card needed a portrait to exist, and it does not.
export function generateStaticParams() {
  return getAllContent()
    .filter(
      (c) => isNote(c) || ((isPage(c) || isFolder(c)) && c.cover !== null),
    )
    .map((c) => ({ slug: c.slug }));
}

const CACHE_HEADERS = {
  "Cache-Control":
    "public, immutable, no-transform, max-age=31536000, s-maxage=31536000",
};

function withCacheHeaders(res: Response): Response {
  for (const [key, value] of Object.entries(CACHE_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const slugStr = slug.join("/");
  const content = getContentByPath(slug);
  if (!content) return new Response(null, { status: 404 });

  if (isNote(content)) {
    return withCacheHeaders(await generateQuoteOG(content));
  }

  if ((isPage(content) || isFolder(content)) && content.cover) {
    return withCacheHeaders(generateCoverOG(slugStr));
  }

  return new Response(null, { status: 404 });
}
