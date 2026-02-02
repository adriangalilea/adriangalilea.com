import { defineCollections, defineConfig } from "fumadocs-mdx/config";
import { z } from "zod";

export const blog = defineCollections({
	type: "doc",
	dir: "content/blog",
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		publishedAt: z.coerce.date(),
		editedAt: z.coerce.date().optional(),
		image: z.string().optional(),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
	}),
});

export default defineConfig();
