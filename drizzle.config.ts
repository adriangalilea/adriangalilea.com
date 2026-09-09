import { defineConfig } from "drizzle-kit";
import { env } from "./lib/env";

export default defineConfig({
  schema: "./lib/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: env("DATABASE_URL"),
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
