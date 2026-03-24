import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  experimental: {
    viewTransition: true,
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
