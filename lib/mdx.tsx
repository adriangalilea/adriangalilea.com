import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { compile, run } from "@mdx-js/mdx";
import rehypeShiki from "@shikijs/rehype";
import type { MDXComponents } from "mdx/types";
import type { ReactElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { ShikiTransformer } from "shiki";
import rehypeFigure from "./rehype-figure";
import rehypeImageSize from "./rehype-image-size";

const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, ".next", "cache", "content-mdx");

// A COMPILED BODY IS KEPT BY EVERYTHING IT IS MADE FROM: the source, the pipeline (the
// packages below and this repo's own plugins, read as files) and the local images
// rehype-image-size measured into it. Any of them changing compiles it again.
const PIPELINE = createHash("sha1")
  .update(
    ["@mdx-js/mdx", "@shikijs/rehype", "shiki", "remark-gfm", "rehype-slug"]
      .map(
        (pkg) =>
          JSON.parse(
            readFileSync(
              join(ROOT, "node_modules", pkg, "package.json"),
              "utf8",
            ),
          ).version,
      )
      .join(),
  )
  .update(readFileSync(join(ROOT, "lib/mdx.tsx")))
  .update(readFileSync(join(ROOT, "lib/rehype-figure.ts")))
  .update(readFileSync(join(ROOT, "lib/rehype-image-size.ts")))
  .digest("hex");

/** The local files a body names (`](/x)`, `src="/x"`, the forms lib/content rewrites
 *  `./x` to), as bytes: what rehype-image-size measures. A link to a page names no file
 *  and is skipped. */
function namedFiles(source: string): Buffer[] {
  return [...source.matchAll(/(?:\]\(|src=["'])(\/[^)"'\s]+)/g)]
    .map((m) => join(ROOT, "content", m[1] ?? ""))
    .filter((p) => existsSync(p) && statSync(p).isFile())
    .map((p) => readFileSync(p));
}

const langAttr: ShikiTransformer = {
  pre(node) {
    node.properties["data-language"] = this.options.lang;
  },
};

const shikiOptions = {
  themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
  defaultColor: false,
  defaultLanguage: "text",
  transformers: [langAttr],
};

const compileOptions = {
  outputFormat: "function-body" as const,
  development: false,
  remarkPlugins: [remarkGfm],
  rehypePlugins: [
    rehypeImageSize,
    rehypeFigure,
    rehypeSlug,
    [rehypeShiki, shikiOptions],
  ] as never,
};

function hashSource(source: string): string {
  const h = createHash("sha1").update(PIPELINE).update(source);
  for (const file of namedFiles(source)) h.update(file);
  return h.digest("hex");
}

const memJs = new Map<string, string>();

async function getCompiledJS(source: string): Promise<string> {
  const hash = hashSource(source);

  const cached = memJs.get(hash);
  if (cached) return cached;

  const diskPath = join(CACHE_DIR, `${hash}.js`);
  if (existsSync(diskPath)) {
    const js = readFileSync(diskPath, "utf-8");
    memJs.set(hash, js);
    return js;
  }

  const compiled = await compile(source, compileOptions);
  const js = String(compiled);

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(diskPath, js);
  memJs.set(hash, js);
  return js;
}

type MDXModule = {
  default: (props: { components?: MDXComponents }) => ReactElement;
};

const memModule = new Map<string, MDXModule>();

async function getModule(js: string): Promise<MDXModule> {
  const cached = memModule.get(js);
  if (cached) return cached;
  const mod = (await run(js, {
    ...jsxRuntime,
    baseUrl: import.meta.url,
  })) as MDXModule;
  memModule.set(js, mod);
  return mod;
}

export async function renderMDX(
  source: string,
  components?: MDXComponents,
): Promise<ReactElement> {
  const js = await getCompiledJS(source);
  const mod = await getModule(js);
  const MDXContent = mod.default;
  return <MDXContent components={components} />;
}
