import {
  getAllContent,
  getAuthorForContent,
  getContentByPath,
  isFolder,
  isNote,
  isPage,
} from "@/lib/content";
import { generateCoverOG, generateQuoteOG } from "@/lib/og";

// Prerendered at build: the serverless runtime has neither content/ nor
// public/ in its bundle, so a dynamic render can only 404.
export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllContent()
    .filter(
      (c) =>
        (isNote(c) && getAuthorForContent(c) !== null) ||
        ((isPage(c) || isFolder(c)) && c.cover !== null),
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

export function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  return params.then(({ slug }) => {
    const slugStr = slug.join("/");
    const content = getContentByPath(slug);
    if (!content) return new Response(null, { status: 404 });

    if (isNote(content) && getAuthorForContent(content)) {
      return withCacheHeaders(generateQuoteOG(content));
    }

    if ((isPage(content) || isFolder(content)) && content.cover) {
      return withCacheHeaders(generateCoverOG(slugStr));
    }

    return new Response(null, { status: 404 });
  });
}
