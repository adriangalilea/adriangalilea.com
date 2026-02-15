import type { MDXComponents } from "mdx/types";
import rehypeShiki from "@shikijs/rehype";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { Content } from "./content";
import rehypeFigure from "./rehype-figure";

const shikiOptions = {
  themes: {
    light: "catppuccin-latte",
    dark: "catppuccin-mocha",
  },
  defaultColor: false,
  defaultLanguage: "text",
} as const;

export async function renderMDX(content: Content, components?: MDXComponents) {
  const { content: mdxContent, frontmatter } = await compileMDX({
    source: content.content,
    components,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeFigure, rehypeSlug, [rehypeShiki, shikiOptions]],
      },
    },
  });

  return { mdxContent, frontmatter };
}

export async function renderMDXString(
  source: string,
  components?: MDXComponents,
) {
  const { content: mdxContent, frontmatter } = await compileMDX({
    source,
    components,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeFigure, rehypeSlug, [rehypeShiki, shikiOptions]],
      },
    },
  });

  return { mdxContent, frontmatter };
}
