import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

// Bump when compile pipeline output shape changes (plugins, themes, MDX major).
const COMPILER_VERSION = "1";

const CACHE_DIR = join(process.cwd(), ".next", "cache", "content-mdx");

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
    rehypeFigure,
    rehypeSlug,
    [rehypeShiki, shikiOptions],
  ] as never,
};

function hashSource(source: string): string {
  return createHash("sha1")
    .update(`${COMPILER_VERSION}:${source}`)
    .digest("hex");
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
