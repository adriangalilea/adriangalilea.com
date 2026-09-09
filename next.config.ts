import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  // resvg is a native addon (the OG route rasterizes the quote still with it) and cannot
  // be placed in an ESM chunk; it is loaded from node_modules at runtime instead.
  serverExternalPackages: ["@resvg/resvg-js"],
  // The OG route is force-static: every card is rendered at build, and its helpers read
  // fonts, covers and avatars from disk THEN. Nothing runs at request time, so the
  // function bundle must not carry the 30 MB of public/ and content/ the tracer would
  // otherwise pull in through those dynamic paths.
  outputFileTracingExcludes: {
    "/og/[...slug]": ["./public/**", "./content/**", "./lib/fonts/**"],
  },
  async redirects() {
    return [
      {
        source: "/blog/rss.xml",
        destination: "/rss.xml",
        permanent: true,
      },
      {
        source: "/blog/funda-magnetica",
        destination: "/magic-sleeve",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
