import { defineCollections, defineConfig } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";
import remarkBreaks from "remark-breaks";
import { z } from "zod";

export const blog = defineCollections({
	type: "doc",
	dir: "content/blog",
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		publishedAt: z.coerce.date(),
		image: z.string().optional(),
		tags: z.array(z.string()).default([]),
		isPublished: z.boolean().default(true),
		isDraft: z.boolean().default(false),
	}),
});

export default defineConfig({
	mdxOptions: {
		remarkPlugins: [remarkBreaks],
	},
	plugins: [lastModified()],
});
