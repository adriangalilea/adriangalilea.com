import { createAuthClient } from "better-auth/react";
import { telegramLoginClient } from "./telegram-login";

export const authClient = createAuthClient({
  plugins: [
    telegramLoginClient({
      botId: Number(process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID),
    }),
  ],
});
