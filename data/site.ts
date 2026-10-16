import { Mail, Rss, Send } from "lucide-react";
import { GithubMark } from "@/components/github-mark";

/** The origin the site is served from: the bare domain answers a 307 to it, so every
 *  absolute URL the site prints (metadata, og:image, the feed) names it directly. */
export const SITE_URL = "https://www.adriangalilea.com";

export const socials = [
  { label: "Telegram", link: "https://t.me/adriangalilea", icon: Send },
  {
    label: "GitHub",
    link: "https://github.com/adriangalilea",
    icon: GithubMark,
  },
  { label: "Email", link: "mailto:adriangalilea@gmail.com", icon: Mail },
  { label: "RSS", link: "/rss.xml", icon: Rss },
] as const;
