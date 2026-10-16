import type { MetadataRoute } from "next";
import { SITE_URL } from "@/data/site";

// Crawl every page; the API answers the site's own scripts, and a crawler there is a
// function run that indexes nothing.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
