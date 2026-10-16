import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderAsync } from "@resvg/resvg-js";
import sharp from "sharp";
import {
  CONTENT_DIR,
  type Content,
  type Folder,
  getAuthorForContent,
  isNote,
  type Note,
  type Page,
} from "@/lib/content";
import { SERIF_CH } from "@/lib/faces";
import { isVideo } from "@/lib/media";
import { renderQuoteSvg } from "@/lib/quote-card";
import { stripMarkdown } from "@/lib/utils";

const W = 1200;
const H = 630;

// THE LINK PREVIEWS, DRAWN BEFORE THE BUILD. `scripts/prepare.mts` writes each still to
// public/og/<slug>.jpg, a static file the CDN serves, so a crawler fetching one costs no
// function and no ISR read. JPEG, because the quote card's grain and a photographic
// cover are what PNG compresses worst: a still was 750 KB as PNG and is 50 KB at this
// quality, which is indistinguishable at the size a preview is shown.
const JPEG = { quality: 85, mozjpeg: true } as const;

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

/** A preview to draw: everything the picture is made from (equal inputs, equal
 *  picture, so a caller may keep the result by them) and the drawing itself. */
export type Still = {
  inputs: (string | Buffer)[];
  draw: () => Promise<Buffer>;
};

/** The still for a piece that has one (`ogImagePath`). */
export function stillOf(content: Content): Still {
  return isNote(content) ? quoteStill(content) : coverStill(content);
}

/** Portraits are PNG (`content/quotes/<author>/avatar.png`), which resvg embeds. */
function portraitDataURI(url: string): string {
  if (!url.endsWith(".png")) throw new Error(`portrait must be a png: ${url}`);
  const buf = readFileSync(join(CONTENT_DIR, url));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** The card for a note. With an author, their words under their portrait in their
 *  colour; without one, Adrian's own words on the neutral ground - every note gets a
 *  preview. */
function quoteStill(note: Note): Still {
  const author = getAuthorForContent(note);
  const avatar = author?.avatar ? portraitDataURI(author.avatar) : null;
  // Tone and focus come off the sidecar `mise portrait` wrote beside the avatar. Asset
  // preparation, not a build step: no pixel is decoded here.
  const portrait = author?.portrait ?? null;
  const year =
    note.estimatedDate ??
    (note.publishedAt
      ? String(new Date(note.publishedAt).getFullYear())
      : null);

  const svg = renderQuoteSvg(
    {
      text: stripMarkdown(note.content),
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
  return {
    inputs: [svg, ...Object.values(STILL_FONTS).map((f) => readFileSync(f))],
    // Off the main thread, so a caller can draw many at once.
    draw: async () => {
      const png = (
        await renderAsync(svg, {
          fitTo: { mode: "width", value: W },
          font: {
            loadSystemFonts: false,
            fontFiles: Object.values(STILL_FONTS),
            defaultFontFamily: "Tinos",
          },
        })
      ).asPng();
      return sharp(png).jpeg(JPEG).toBuffer();
    },
  };
}

/** The picture a page or folder is previewed with: an author-provided `og.png` beside
 *  the content, else the cover itself, else the poster standing in for a video cover.
 *  Sharp reads every cover format the site accepts (a gif's first frame). */
function coverSource(content: Page | Folder): string {
  const og = join(CONTENT_DIR, ...content.slug, "og.png");
  if (existsSync(og)) return og;
  if (content.cover && !isVideo(content.cover))
    return join(CONTENT_DIR, content.cover);
  if (content.poster) return join(CONTENT_DIR, content.poster);
  throw new Error(`no still to preview ${content.path} with`);
}

/** The cover, contained over a blurred, brightened fill of itself. */
function coverStill(content: Page | Folder): Still {
  const src = readFileSync(coverSource(content));
  return {
    inputs: [src],
    draw: async () => {
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
      return sharp(fill)
        .composite([{ input: still, gravity: "centre" }])
        .jpeg(JPEG)
        .toBuffer();
    },
  };
}
