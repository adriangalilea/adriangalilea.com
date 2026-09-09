import { createAuthClient } from "better-auth/react";
import { telegramLoginClient } from "./telegram-login";

// Written out in full so Next inlines it into the client bundle.
const botId = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;
if (!botId) throw new Error("NEXT_PUBLIC_TELEGRAM_BOT_ID is not set");

export const authClient = createAuthClient({
  plugins: [telegramLoginClient({ botId: Number(botId) })],
});
