import { createAuthClient } from "better-auth/react";
import { telegramClient } from "better-auth-telegram/client";

export const authClient = createAuthClient({
  plugins: [telegramClient()],
});
