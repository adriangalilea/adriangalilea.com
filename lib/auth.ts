import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import * as schema from "./schema";
import { telegram } from "./telegram-plugin";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  plugins: [
    telegram({
      botToken: process.env.TELEGRAM_BOT_TOKEN as string,
    }),
    nextCookies(),
  ],
});
