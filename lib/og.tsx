import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { type Content, getAuthorForContent, isNote } from "@/lib/content";
import { stripMarkdown } from "@/lib/utils";

const W = 1200;
const H = 630;
const PAD = 60;

function slugToHue(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 360);
}

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

function loadAvatarBase64(content: Content): string | null {
  const author = getAuthorForContent(content);
  if (!author?.avatar) return null;
  return readImageAsDataURI(join(process.cwd(), "public", author.avatar));
}

function getFonts() {
  const geistRegular = loadFont("Geist-Regular.ttf");
  const geistBold = loadFont("Geist-Bold.ttf");
  return [
    { name: "Geist", data: geistRegular, weight: 400 as const },
    { name: "Geist", data: geistBold, weight: 700 as const },
  ];
}

export function generateQuoteOG(content: Content): ImageResponse {
  if (!isNote(content)) throw new Error("generateQuoteOG requires a Note");
  const author = getAuthorForContent(content);
  if (!author) throw new Error("generateQuoteOG requires a Note with author");

  const slugStr = content.slug.join("/");
  const hue = slugToHue(slugStr);
  const accent = `hsl(${hue}, 70%, 65%)`;
  const text = stripMarkdown(content.content).slice(0, 240);
  const avatarData = loadAvatarBase64(content);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        fontFamily: "Geist",
        padding: PAD,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 96, color: accent, lineHeight: 0.8 }}>
          {"\u201C"}
        </span>
        <span
          style={{
            fontSize: 30,
            color: "#e5e5e5",
            fontStyle: "italic",
            lineHeight: 1.5,
          }}
        >
          {text}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 8,
          }}
        >
          {avatarData && (
            <img
              src={avatarData}
              width={44}
              height={44}
              style={{ borderRadius: 22 }}
            />
          )}
          <span style={{ fontSize: 22, color: "#999" }}>{author.name}</span>
        </div>
      </div>
    </div>,
    { width: W, height: H, fonts: getFonts() },
  );
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
