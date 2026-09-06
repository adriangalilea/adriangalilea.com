import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { ImageResponse } from "next/og";
import { type Content, getAuthorForContent, isNote } from "@/lib/content";
import { renderQuoteSvg } from "@/lib/quote-card";
import { stripMarkdown } from "@/lib/utils";

const W = 1200;
const H = 630;

function loadFont(name: string): ArrayBuffer {
  const path = join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-sans",
    name,
  );
  const buffer = readFileSync(path);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

function readImageAsDataURI(path: string): string | null {
  if (!existsSync(path)) return null;
  const ext = path.match(/\.[^.]+$/)?.[0];
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
    const mime = ext === ".png" ? "image/png" : "image/jpeg";
    const buf = readFileSync(path);
    return `data:${mime};base64,${buf.toString("base64")}`;
  }
  // Check for .og.png converted version
  const ogPath = path.replace(/\.[^.]+$/, ".og.png");
  if (existsSync(ogPath)) {
    const buf = readFileSync(ogPath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  }
  return null;
}

// Priority: explicit og.png > cover > poster. .og.png = pipeline-converted from webp/gif.
const OG_CANDIDATES = ["og", "cover.og", "cover", "poster.og", "poster"];

function readPngOrJpg(path: string): string | null {
  for (const ext of [".png", ".jpg", ".jpeg"]) {
    const p = `${path}${ext}`;
    if (existsSync(p)) {
      const mime = ext === ".png" ? "image/png" : "image/jpeg";
      return `data:${mime};base64,${readFileSync(p).toString("base64")}`;
    }
  }
  return null;
}

type CoverData = { sharp: string; blur: string | null };

function findCoverData(slugPath: string): CoverData | null {
  const dir = join(process.cwd(), "public", slugPath);
  for (const base of OG_CANDIDATES) {
    const sharp = readPngOrJpg(join(dir, base));
    if (sharp) {
      const blurBase = base.endsWith(".og") ? base : `${base}.og`;
      const blurPath = join(dir, `${blurBase}.blur.png`);
      const blur = existsSync(blurPath)
        ? `data:image/png;base64,${readFileSync(blurPath).toString("base64")}`
        : null;
      return { sharp, blur };
    }
  }
  return null;
}

function getFonts() {
  const geistRegular = loadFont("Geist-Regular.ttf");
  const geistBold = loadFont("Geist-Bold.ttf");
  return [
    { name: "Geist", data: geistRegular, weight: 400 as const },
    { name: "Geist", data: geistBold, weight: 700 as const },
  ];
}

// THE QUOTE CARD IS NOT DRAWN HERE. `renderQuoteSvg` in `lib/quote-card` is the layout -
// the same module the page's <Quote> reads its numbers from, so a shared link and the
// page it opens are one card, not two that drifted. This file only supplies what the
// still cannot get for itself: the words, the portrait as bytes, the portrait's tone, and
// a rasterizer.
//
// resvg, not satori: satori draws JSX and this is already an SVG, and resvg is handed the
// font FILES outright, so the three voices resolve to the faces they name instead of to
// whatever a build machine's fontconfig has lying around. Instrument Serif is the site's
// own serif (app/layout.tsx), shipped here under the OFL (lib/fonts/OFL-InstrumentSerif.txt).
const STILL_FONTS = {
  "Instrument Serif": join(
    process.cwd(),
    "lib/fonts/InstrumentSerif-Regular.ttf",
  ),
  Geist: join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf",
  ),
  "Geist Mono": join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf",
  ),
};

/** The card for a note. With an author, their words under their portrait in their
 *  colour; without one, Adrian's own words on the neutral ground - every note gets a
 *  preview, which is the gap the old route left open. */
export async function generateQuoteOG(content: Content): Promise<Response> {
  if (!isNote(content)) throw new Error("generateQuoteOG requires a Note");
  const author = getAuthorForContent(content);
  const avatar = author?.avatar
    ? readImageAsDataURI(join(process.cwd(), "public", author.avatar))
    : null;
  // Tone and focus come off the sidecar `mise portrait` wrote beside the avatar. Asset
  // preparation, not a build step: no pixel is decoded here.
  const portrait = author?.portrait ?? null;
  const year =
    content.estimatedDate ??
    (content.publishedAt && new Date(content.publishedAt).getFullYear() >= 1000
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
      fontFamily: "Instrument Serif",
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
      defaultFontFamily: "Instrument Serif",
    },
  })
    .render()
    .asPng();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
}

export function generateCoverOG(slugPath: string): ImageResponse {
  const data = findCoverData(slugPath);
  if (!data) throw new Error(`generateCoverOG: no cover data for ${slugPath}`);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#0a0a0a",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {data.blur && (
        <img
          src={data.blur}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            objectFit: "cover",
          }}
        />
      )}
      <img
        src={data.sharp}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: W,
          height: H,
          objectFit: "contain",
        }}
      />
    </div>,
    { width: W, height: H, fonts: getFonts() },
  );
}
