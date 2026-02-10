import {
  getAllContent,
  getAuthorForContent,
  getContentByPath,
  isFolder,
  isNote,
  isPage,
} from "@/lib/content";
import { generateCoverOG, generateQuoteOG } from "@/lib/og";

export function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  return params.then(({ slug }) => {
    const slugStr = slug.join("/");
    const content = getContentByPath(slug);
    if (!content) return new Response(null, { status: 404 });

    if (isNote(content) && getAuthorForContent(content)) {
      return generateQuoteOG(content);
    }

    if ((isPage(content) || isFolder(content)) && content.cover) {
      return generateCoverOG(slugStr);
    }

    return new Response(null, { status: 404 });
  });
}

export async function generateStaticParams() {
  return getAllContent()
    .filter((c) => {
      if (isNote(c) && getAuthorForContent(c)) return true;
      if ((isPage(c) || isFolder(c)) && c.cover) return true;
      return false;
    })
    .map((c) => ({ slug: c.slug }));
}
