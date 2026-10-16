import { Mail, Rss, Send } from "lucide-react";
import { GithubMark } from "@/components/github-mark";

export const SITE_URL = "https://adriangalilea.com";

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
