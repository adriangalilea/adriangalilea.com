import type { MDXComponents } from "mdx/types";
import defaultMdxComponents from "fumadocs-ui/mdx";

export function getMDXComponents(): MDXComponents {
	return {
		...defaultMdxComponents,
	};
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
	return getMDXComponents();
}
