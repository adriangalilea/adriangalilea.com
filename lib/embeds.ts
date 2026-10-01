// Posts from other places, embedded by their URL: `<Telegram url="https://t.me/…" />`
// and `<Tweet url="https://x.com/…/status/…" />` in any content file. The facts live in
// `data/embeds/<kind>/<key>.json` and their pictures in `public/embeds/<kind>/<key>/`,
// both committed: `pnpm embed` writes what is missing, once, and the build only reads.
// A deploy never asks Telegram or X anything, and a post deleted upstream stays as it
// was when it was quoted.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tweetId } from "@/lib/tweet-data";

export type EmbedKind = "telegram" | "tweet";

export const EMBED_TAG: Record<EmbedKind, string> = {
  telegram: "Telegram",
  tweet: "Tweet",
};

/** The file name a post is kept under: `jardindigital-236`, a tweet's id. */
export function embedKey(kind: EmbedKind, url: string): string {
  if (kind === "tweet") return tweetId(url);
  const m = /^https:\/\/t\.me\/([A-Za-z0-9_]+)\/(\d+)$/.exec(url);
  if (!m) throw new Error(`embed: not a t.me channel post url: ${url}`);
  return `${m[1]}-${m[2]}`;
}

export const embedFile = (kind: EmbedKind, key: string) =>
  join(process.cwd(), "data/embeds", kind, `${key}.json`);

/** Where a kept post's pictures go, on disk and as served. */
export const embedMedia = (kind: EmbedKind, key: string) => ({
  dir: join(process.cwd(), "public/embeds", kind, key),
  url: `/embeds/${kind}/${key}`,
});

export function readEmbed<T>(kind: EmbedKind, url: string): T {
  const file = embedFile(kind, embedKey(kind, url));
  if (!existsSync(file))
    throw new Error(
      `embed: <${EMBED_TAG[kind]} url="${url}" /> has no facts yet. Run \`pnpm embed\`.`,
    );
  return JSON.parse(readFileSync(file, "utf8")) as T;
}
