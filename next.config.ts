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
    ];
  },
};

export default nextConfig;
