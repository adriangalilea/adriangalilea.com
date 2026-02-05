import { compileMDX } from "next-mdx-remote/rsc";
import type { MDXComponents } from "mdx/types";
import type { Content } from "./content";

export async function renderMDX(content: Content, components?: MDXComponents) {
	const { content: mdxContent, frontmatter } = await compileMDX({
		source: content.content,
		components,
		options: {
			parseFrontmatter: true,
		},
	});

	return { mdxContent, frontmatter };
}

export async function renderMDXString(source: string, components?: MDXComponents) {
	const { content: mdxContent, frontmatter } = await compileMDX({
		source,
		components,
		options: {
			parseFrontmatter: true,
		},
	});

	return { mdxContent, frontmatter };
}
