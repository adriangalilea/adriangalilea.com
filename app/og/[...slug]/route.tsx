import {
  getAuthorForContent,
  getContentByPath,
  isFolder,
  isNote,
  isPage,
} from "@/lib/content";
import { generateCoverOG, generateQuoteOG } from "@/lib/og";

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
