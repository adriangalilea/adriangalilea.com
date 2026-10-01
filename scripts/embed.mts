// `pnpm embed`: every `<Telegram url>`, `<Tweet url>` and `<GitHub url>` in content/
// gets its facts fetched and its pictures downloaded, ONCE. GitHub is read with your
// own `gh auth token`, which stays on this machine. A post already kept is never fetched again
// (it is what the post said when it was quoted); to refresh one, trash its JSON and run
// this again. The only place an embed touches the network.

import { execSync } from "node:child_process";
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
import {
  fetchGithub,
  type GithubFacts,
  type GithubUser,
} from "@/lib/github-data";
import { fetchTelegramPost, type TelegramPost } from "@/lib/telegram-chat-post";
import { fetchTweet, type Tweet } from "@/lib/tweet-data";

function* contentFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* contentFiles(path);
    else if (/\.mdx?$/.test(entry.name)) yield path;
  }
}

const EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

/** Download one picture beside the post and answer its served path. */
async function keep(
  src: string,
  kind: EmbedKind,
  key: string,
  name: string,
): Promise<string> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`embed: ${src}: HTTP ${res.status}`);
  // GitHub's avatars have no extension in their path; the response says what they are.
  const type = res.headers.get("content-type")?.split(";")[0] ?? "";
  const ext = extname(new URL(src).pathname) || EXT[type];
  if (!ext) throw new Error(`embed: ${src}: a picture of type "${type}"`);
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

/** Every face in the facts is kept, once per person. */
async function github(url: string, key: string): Promise<GithubFacts> {
  const token = execSync("gh auth token", { encoding: "utf8" }).trim();
  const facts = await fetchGithub(url, token);
  const kept = new Map<string, Promise<string>>();
  const face = async (u: GithubUser): Promise<GithubUser> => {
    if (!kept.has(u.login))
      kept.set(u.login, keep(u.avatar, "github", key, `avatar-${u.login}`));
    return { ...u, avatar: await (kept.get(u.login) as Promise<string>) };
  };
  if (facts.kind === "repo")
    return { ...facts, owner: await face(facts.owner) };
  if (facts.kind === "profile")
    return { ...facts, user: await face(facts.user) };
  if (facts.kind === "comment")
    return {
      ...facts,
      author: await face(facts.author),
      thread: { ...facts.thread, author: await face(facts.thread.author) },
    };
  return { ...facts, author: await face(facts.author) };
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
      : kind === "github"
        ? await github(url, key)
        : await tweet(await fetchTweet(url), key);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, `${JSON.stringify(facts, null, 2)}\n`);
  console.log(`kept ${kind} ${url} -> ${file}`);
  fetched++;
}
console.log(`${wanted.size} embeds, ${fetched} fetched`);
