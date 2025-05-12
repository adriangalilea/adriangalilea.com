import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import { SITE_URL } from "./src/data/site";


// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), sitemap(), robotsTxt()],
  site: SITE_URL,
  markdown: {
    syntaxHighlight: "shiki",
    shikiConfig: {
      theme: "nord",
      wrap: false
    }
  },
  // Handle folder-based blog posts with static assets
  build: {
    assets: 'assets'
  },
  vite: {
    build: {
      assetsInlineLimit: 0
    }
  }
});