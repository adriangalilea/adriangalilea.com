import type { BetterAuthClientPlugin } from "better-auth/client";
import type { telegram } from "better-auth-telegram";

type TelegramAuthData = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    Telegram?: {
      Login: {
        auth: (
          options: { bot_id: number; request_access?: boolean },
          callback: (data: TelegramAuthData | false) => void,
        ) => void;
      };
    };
  }
}

const SCRIPT_URL = "https://telegram.org/js/telegram-widget.js?22";

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.Telegram?.Login) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = SCRIPT_URL;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Telegram widget script"));
    };
    document.head.appendChild(el);
  });
  return scriptPromise;
}

function openPopup(botId: number): Promise<TelegramAuthData | null> {
  return new Promise((resolve) => {
    window.Telegram!.Login.auth(
      { bot_id: botId, request_access: true },
      (data) => resolve(data || null),
    );
  });
}

// Better Auth client plugin — drop-in replacement for telegramClient()
// that uses Telegram.Login.auth() popup instead of the iframe widget.
// Server-side keeps using `telegram()` from better-auth-telegram as-is.
export function telegramLoginClient(opts: { botId: number }) {
  return {
    id: "telegram",
    $InferServerPlugin: {} as ReturnType<typeof telegram>,
    getActions: ($fetch) => ({
      // Load script + open popup + POST to server, all in one call.
      // Returns the session response or null if the user cancelled.
      telegramLoginPopup: async () => {
        await loadScript();
        const data = await openPopup(opts.botId);
        if (!data) return null;
        return await $fetch("/telegram/signin", {
          method: "POST",
          body: data,
        });
      },
    }),
  } satisfies BetterAuthClientPlugin;
}
