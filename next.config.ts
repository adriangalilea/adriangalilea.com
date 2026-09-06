import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  // resvg is a native addon (the OG route rasterizes the quote still with it) and cannot
  // be placed in an ESM chunk; it is loaded from node_modules at runtime instead.
  serverExternalPackages: ["@resvg/resvg-js"],
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
