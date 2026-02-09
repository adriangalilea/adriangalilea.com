import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactCompiler: true,
	reactStrictMode: true,
	cacheComponents: true,
	experimental: {
		viewTransition: true,
	},
};

export default nextConfig;
