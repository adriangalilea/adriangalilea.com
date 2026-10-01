import { TelegramChat } from "@/components/ui/telegram-chat";
import { Tweet as TweetCard } from "@/components/ui/tweet";
import { readEmbed } from "@/lib/embeds";
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

/** A post on X: `<Tweet url="…" />`. */
export function Tweet({ url }: { url: string }) {
  const tweet = readEmbed<TweetFacts>("tweet", url);
  return (
    <div className="not-prose my-8">
      <TweetCard tweet={tweet} className="mx-auto max-w-xl" />
    </div>
  );
}
