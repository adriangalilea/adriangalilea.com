import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';

const posts = await getCollection('blog');

const pages = Object.fromEntries(posts.map(({ slug, data }) => [slug, data]));

export const { getStaticPaths, GET } = OGImageRoute({
  param: 'route',
  pages: pages,

  getImageOptions: (path, page) => ({
    title: "Adrian Galilea - Blog",
    description: page.description,
    border: { width: 10 },
    padding: 40,
  }),
});