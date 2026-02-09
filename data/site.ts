import { Github, Mail, Rss, Send } from "lucide-react";

export const SITE_URL = "https://adriangalilea.com";

export const socials = [
  { label: "Telegram", link: "https://t.me/adriangalilea", icon: Send },
  { label: "GitHub", link: "https://github.com/adriangalilea", icon: Github },
  { label: "Email", link: "mailto:adriangalilea@gmail.com", icon: Mail },
  { label: "RSS", link: "/rss.xml", icon: Rss },
] as const;
