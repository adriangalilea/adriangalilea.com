import type { MDXComponents } from "mdx/types";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { Content } from "./content";

export async function renderMDX(content: Content, components?: MDXComponents) {
  const { content: mdxContent, frontmatter } = await compileMDX({
    source: content.content,
    components,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug],
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
        rehypePlugins: [rehypeSlug],
      },
    },
  });

  return { mdxContent, frontmatter };
}
