import { Github } from "@/components/ui/github";
import { TelegramChat } from "@/components/ui/telegram-chat";
import { Tweet as TweetCard } from "@/components/ui/tweet";
import { readEmbed } from "@/lib/embeds";
import type { GithubFacts } from "@/lib/github-data";
import { postScript, type TelegramPost } from "@/lib/telegram-chat-post";
import type { Tweet as TweetFacts } from "@/lib/tweet-data";

/** A public channel post, drawn by the same bubble as any chat: `<Telegram url="…" />`. */
export function Telegram({ url }: { url: string }) {
  const post = readEmbed<TelegramPost>("telegram", url);
  return (
    <div className="not-prose my-8 flex justify-center">
      <TelegramChat
        // Posts are told in the zone they were written in: mine, Madrid.
        script={postScript(post, { timeZone: "Europe/Madrid" })}
        href={post.url}
        // Telegram's own doodle pattern on Telegram's chat background: the context
        // that makes a lone bubble read as a channel post.
        wallpaper="/tg-pattern.svg"
        frame="none"
        backdrop
        // The article's type and a desktop client's measure, not a phone scaled up.
        text="page"
        composer={false}
        frozen
        className="w-full"
      />
    </div>
  );
}

/** Anything on github.com, by its URL: a profile, a repo, an issue or pull request, one
 *  comment. `lines` cuts a long body: `<GitHub url="…#issuecomment-…" lines={14} />`. */
export function GitHub({ url, lines }: { url: string; lines?: number }) {
  const facts = readEmbed<GithubFacts>("github", url);
  return (
    <div className="not-prose my-8">
      <Github facts={facts} lines={lines} className="mx-auto max-w-2xl" />
    </div>
  );
}

/** A post on X: `<Tweet url="…" />`. */
export function Tweet({ url }: { url: string }) {
  const tweet = readEmbed<TweetFacts>("tweet", url);
  return (
    <div className="not-prose my-8">
      <TweetCard tweet={tweet} className="mx-auto max-w-xl" />
    </div>
  );
}
