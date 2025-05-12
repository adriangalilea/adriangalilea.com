import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    publishedAt: z.date(),
    editedAt: z.date().optional(),
    description: z.string(),
    image: z.string().optional(),
    isPublish: z.boolean(),
    isDraft: z.boolean().default(false),
    tags: z.array(z.string()),
  }),
});

export const collections = { blog: postsCollection };
