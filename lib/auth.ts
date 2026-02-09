import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { telegram } from "better-auth-telegram";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  plugins: [
    telegram({
      botToken: process.env.TELEGRAM_BOT_TOKEN as string,
      botUsername: process.env.TELEGRAM_BOT_USERNAME as string,
    }),
    nextCookies(),
  ],
});
