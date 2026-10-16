"use client";

import dynamic from "next/dynamic";

// THE CLIENT CODE ONLY SOME BODIES DRAW, loaded only where one draws it. A server
// module's static import of a client component ships that component's chunk to every
// page importing the server module, rendered or not (mdx-components and embeds are
// imported by every page), and a server-side dynamic() does not split it either. A
// dynamic() made here, on the client side, is its own chunk: still rendered into the
// page's HTML at build, its JS and CSS fetched only by the pages whose HTML holds it.
// recharts (one article) and the Telegram post (one article) were 145 KB of brotli on
// every page.

export const Bars = dynamic(() =>
  import("@/components/charts").then((m) => m.Bars),
);
export const CompareLines = dynamic(() =>
  import("@/components/charts").then((m) => m.CompareLines),
);
export const TelegramChat = dynamic(() =>
  import("@/components/ui/telegram-chat").then((m) => m.TelegramChat),
);
