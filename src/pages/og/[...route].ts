import { getCollection } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';
import fs from 'node:fs';
import path from 'node:path';

const posts = await getCollection('blog');

const pages = Object.fromEntries(posts.map(({ slug, data }) => [slug, data]));

// Check for header.png files
const slugsWithHeaders = posts
  .filter(post => fs.existsSync(path.join(process.cwd(), 'src/content/blog', post.slug, 'header.png')))
  .map(post => post.slug);

export const { getStaticPaths, GET } = OGImageRoute({
  param: 'route',
  pages: pages,

  getImageOptions: (route, page) => {
    const slug = route.replace(/^\/og\//, '').replace(/\.png$/, '');
    const hasHeaderImage = slugsWithHeaders.includes(slug);
    
    // If post has a header image, use it as background
    if (hasHeaderImage) {
      return {
        title: page.title,
        description: page.description,
        bgImage: {
          path: path.join(process.cwd(), 'src/content/blog', slug, 'header.png'),
          fit: 'cover'
        },
        border: { width: 0 },
        padding: 60,
        font: {
          title: {
            weight: 'bold',
            color: 'white',
            shadow: '0 0 15px rgba(0,0,0,0.8)'
          },
          description: {
            color: 'white',
            shadow: '0 0 10px rgba(0,0,0,0.8)'
          }
        },
        logo: false  // Remove the default logo
      };
    }
    
    // Default options if no header image
    return {
      title: page.title,
      description: page.description,
      border: { width: 10 },
      padding: 40,
      logo: false  // Remove the default logo
    };
  },
});