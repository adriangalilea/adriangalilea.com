import { join } from "node:path";

// Where scripts/prepare.mts keeps what it derives from content/ before Next runs, and
// lib/content reads it. `.next/cache` survives `next build` and Vercel restores it
// before each deploy, so what is kept here is redone only when its inputs change.

export const PREPARED_DIR = join(process.cwd(), ".next", "cache", "prepare");
/** Every local image's blur data URL, by its path under content/. */
export const BLUR_MANIFEST = join(PREPARED_DIR, "blur.json");
