import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

// OG image dimensions according to standard
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Get all blog posts with header images
const posts = await getCollection('blog');
const postsWithHeaders = posts.filter(post => {
  const headerPath = path.join(process.cwd(), 'src/content/blog', post.slug, 'header.png');
  return fs.existsSync(headerPath);
});

// Create a map of routes for static paths
export function getStaticPaths() {
  return postsWithHeaders.map(post => ({
    params: { route: `${post.slug}.png` }
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const route = params.route;
  
  if (!route) {
    return new Response('Missing route parameter', { status: 404 });
  }
  
  // Extract the slug by removing the extension
  const slug = route.replace(/\.png$/, '');
  
  // Get the header image path
  const headerPath = path.join(process.cwd(), 'src/content/blog', slug, 'header.png');
  
  if (!fs.existsSync(headerPath)) {
    return new Response('Header image not found', { status: 404 });
  }
  
  // Read the image file
  const imageBuffer = fs.readFileSync(headerPath);
  
  // Return the image as-is
  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
};