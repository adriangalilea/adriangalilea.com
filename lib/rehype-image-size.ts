// Rehype plugin: every local <img> gets its natural width and height, measured from the
// file at compile time.
//
// An image's size is a fact about the file, and the layout has to know it: next/image
// reserves the box before the bytes arrive, and the lightbox sizes and flies the picture
// by its natural pixels. Guessing 800×450 for every picture was the layout shifting on
// every load and the lightbox opening a portrait as a landscape. A local image's URL is
// its path under content/ (the content loader rewrote `./x.png` to it, and
// scripts/prepare.mts serves the same path from public/), so the bytes are at
// content/<src>. Remote images are left alone: nothing here fetches.
// A local image that is not on disk is a broken post, and the build says which.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Element, Root } from "hast";
import imageSize from "image-size";
import type { Plugin } from "unified";

const CONTENT_DIR = join(process.cwd(), "content");

function measure(node: Element) {
  const src = node.properties.src;
  if (typeof src !== "string" || !src.startsWith("/")) return;
  if (node.properties.width && node.properties.height) return;
  const file = join(CONTENT_DIR, src);
  if (!existsSync(file))
    throw new Error(`image ${src} is not in content/ (looked at ${file})`);
  const { width, height } = imageSize(readFileSync(file));
  if (!width || !height) throw new Error(`image ${src}: no dimensions`);
  node.properties.width = width;
  node.properties.height = height;
}

function walk(node: Root | Element) {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    if (child.tagName === "img") measure(child);
    walk(child);
  }
}

const rehypeImageSize: Plugin<[], Root> = () => (tree) => {
  walk(tree);
};

export default rehypeImageSize;
