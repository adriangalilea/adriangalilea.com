// `pnpm embed`: every `<Telegram url>` and `<Tweet url>` in content/ gets its facts
// fetched and its pictures downloaded, ONCE. A post already kept is never fetched again
// (it is what the post said when it was quoted); to refresh one, trash its JSON and run
// this again. The only place an embed touches the network.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { extname, join } from "node:path";
import {
  EMBED_TAG,
  type EmbedKind,
  embedFile,
  embedKey,
  embedMedia,
} from "@/lib/embeds";
import { fetchTelegramPost, type TelegramPost } from "@/lib/telegram-chat-post";
import { fetchTweet, type Tweet } from "@/lib/tweet-data";

function* contentFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* contentFiles(path);
    else if (/\.mdx?$/.test(entry.name)) yield path;
  }
}

/** Download one picture beside the post and answer its served path. */
async function keep(
  src: string,
  kind: EmbedKind,
  key: string,
  name: string,
): Promise<string> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`embed: ${src}: HTTP ${res.status}`);
  const ext = extname(new URL(src).pathname) || ".jpg";
  const media = embedMedia(kind, key);
  mkdirSync(media.dir, { recursive: true });
  writeFileSync(
    join(media.dir, `${name}${ext}`),
    Buffer.from(await res.arrayBuffer()),
  );
  return `${media.url}/${name}${ext}`;
}

async function telegram(url: string, key: string): Promise<TelegramPost> {
  const post = await fetchTelegramPost(url);
  const avatar = post.channel.avatar
    ? await keep(post.channel.avatar, "telegram", key, "avatar")
    : undefined;
  const photos = await Promise.all(
    post.photos.map(async (p, i) => ({
      ...p,
      src: await keep(p.src, "telegram", key, `photo-${i + 1}`),
    })),
  );
  const image = post.preview?.image
    ? await keep(post.preview.image, "telegram", key, "preview")
    : undefined;
  return {
    ...post,
    channel: { ...post.channel, ...(avatar ? { avatar } : {}) },
    photos,
    ...(post.preview
      ? { preview: { ...post.preview, ...(image ? { image } : {}) } }
      : {}),
  };
}

/** Pictures are kept; video stays on X's CDN, its poster is kept. */
async function tweet(t: Tweet, key: string, prefix = ""): Promise<Tweet> {
  const avatar = await keep(t.author.avatar, "tweet", key, `${prefix}avatar`);
  const media = await Promise.all(
    t.media.map(async (m, i) =>
      m.kind === "photo"
        ? {
            ...m,
            src: await keep(m.src, "tweet", key, `${prefix}photo-${i + 1}`),
          }
        : {
            ...m,
            poster: await keep(
              m.poster,
              "tweet",
              key,
              `${prefix}poster-${i + 1}`,
            ),
          },
    ),
  );
  const card = t.card?.image
    ? {
        ...t.card,
        image: await keep(t.card.image, "tweet", key, `${prefix}card`),
      }
    : t.card;
  const quote = t.quote ? await tweet(t.quote, key, "quote-") : undefined;
  return {
    ...t,
    author: { ...t.author, avatar },
    media,
    ...(card ? { card } : {}),
    ...(quote ? { quote } : {}),
  };
}

const wanted = new Map<string, { kind: EmbedKind; url: string }>();
for (const file of contentFiles(join(process.cwd(), "content"))) {
  const text = readFileSync(file, "utf8");
  for (const kind of Object.keys(EMBED_TAG) as EmbedKind[])
    for (const m of text.matchAll(
      new RegExp(`<${EMBED_TAG[kind]}\\s+url="([^"]+)"`, "g"),
    ))
      wanted.set(`${kind} ${m[1]}`, { kind, url: m[1] as string });
}

let fetched = 0;
for (const { kind, url } of wanted.values()) {
  const key = embedKey(kind, url);
  const file = embedFile(kind, key);
  if (existsSync(file)) continue;
  const facts =
    kind === "telegram"
      ? await telegram(url, key)
      : await tweet(await fetchTweet(url), key);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, `${JSON.stringify(facts, null, 2)}\n`);
  console.log(`kept ${kind} ${url} -> ${file}`);
  fetched++;
}
console.log(`${wanted.size} embeds, ${fetched} fetched`);
