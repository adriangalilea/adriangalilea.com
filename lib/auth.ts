import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { env } from "./env";
import * as schema from "./schema";
import { telegram } from "./telegram-plugin";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  socialProviders: {
    github: {
      clientId: env("GITHUB_CLIENT_ID"),
      clientSecret: env("GITHUB_CLIENT_SECRET"),
    },
  },
  plugins: [
    telegram({
      botToken: env("TELEGRAM_BOT_TOKEN"),
    }),
    nextCookies(),
  ],
});
