import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import {
  type Content,
  type Folder,
  getAuthorForContent,
  isNote,
  type Page,
} from "@/lib/content";
import { SERIF_CH } from "@/lib/faces";
import { isVideo } from "@/lib/media";
import { renderQuoteSvg } from "@/lib/quote-card";
import { stripMarkdown } from "@/lib/utils";

const W = 1200;
const H = 630;
const PUBLIC_DIR = join(process.cwd(), "public");

// THE QUOTE CARD IS NOT DRAWN HERE. `renderQuoteSvg` in `lib/quote-card` is the layout -
// the same module the page's <Quote> reads its numbers from, so a shared link and the
// page it opens are one card, not two that drifted. This file only supplies what the
// still cannot get for itself: the words, the portrait as bytes, the portrait's tone, and
// a rasterizer.
//
// resvg is handed the font FILES outright, so the three voices resolve to the faces they
// name instead of to whatever a build machine's fontconfig has lying around. Tinos is the
// quotes' face on the page (`--font-quote`, app/layout.tsx), shipped here under Apache
// 2.0 (lib/fonts/LICENSE-Tinos.txt), so a shared link and the page it opens cannot
// disagree about the type.
const STILL_FONTS = {
  Tinos: join(process.cwd(), "lib/fonts/Tinos-Regular.ttf"),
  Geist: join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf",
  ),
  "Geist Mono": join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf",
  ),
};

/** Portraits are PNG (`content/quotes/<author>/avatar.png`), which resvg embeds. */
function portraitDataURI(publicPath: string): string {
  if (!publicPath.endsWith(".png"))
    throw new Error(`portrait must be a png: ${publicPath}`);
  const buf = readFileSync(join(PUBLIC_DIR, publicPath));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** The card for a note. With an author, their words under their portrait in their
 *  colour; without one, Adrian's own words on the neutral ground - every note gets a
 *  preview. */
export async function generateQuoteOG(content: Content): Promise<Response> {
  if (!isNote(content)) throw new Error("generateQuoteOG requires a Note");
  const author = getAuthorForContent(content);
  const avatar = author?.avatar ? portraitDataURI(author.avatar) : null;
  // Tone and focus come off the sidecar `mise portrait` wrote beside the avatar. Asset
  // preparation, not a build step: no pixel is decoded here.
  const portrait = author?.portrait ?? null;
  const year =
    content.estimatedDate ??
    (content.publishedAt
      ? String(new Date(content.publishedAt).getFullYear())
      : null);

  const svg = renderQuoteSvg(
    {
      text: stripMarkdown(content.content),
      author: { name: author?.name ?? "Adrian Galilea" },
      date: year,
    },
    {
      width: W,
      height: H,
      avatar,
      background: portrait?.tone.ground,
      accent: portrait?.tone.accent,
      focus: portrait?.focus,
      fontFamily: "Tinos",
      ch: SERIF_CH,
      nameFamily: "Geist",
      dateFamily: "Geist Mono",
      fonts: Object.keys(STILL_FONTS),
    },
  );
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: {
      loadSystemFonts: false,
      fontFiles: Object.values(STILL_FONTS),
      defaultFontFamily: "Tinos",
    },
  })
    .render()
    .asPng();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
}

/** The picture a page or folder is previewed with: an author-provided `og.png` beside
 *  the content, else the cover itself, else the poster standing in for a video cover.
 *  Sharp reads every cover format the site accepts (a gif's first frame). */
function coverSource(content: Page | Folder): string {
  const og = join(PUBLIC_DIR, content.slug.join("/"), "og.png");
  if (existsSync(og)) return og;
  if (content.cover && !isVideo(content.cover))
    return join(PUBLIC_DIR, content.cover);
  if (content.poster) return join(PUBLIC_DIR, content.poster);
  throw new Error(`no still to preview ${content.path} with`);
}

/** The cover, contained over a blurred, brightened fill of itself. */
export async function generateCoverOG(
  content: Page | Folder,
): Promise<Response> {
  const src = readFileSync(coverSource(content));
  const fill = await sharp(src)
    .resize(W, H, { fit: "cover" })
    .blur(60)
    .modulate({ brightness: 1.3 })
    .png()
    .toBuffer();
  const still = await sharp(src)
    .resize(W, H, { fit: "inside" })
    .png()
    .toBuffer();
  const png = await sharp(fill)
    .composite([{ input: still, gravity: "centre" }])
    .png()
    .toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
}
