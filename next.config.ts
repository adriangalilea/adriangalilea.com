import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactCompiler: true,
	reactStrictMode: true,
	experimental: {
		viewTransition: true,
	},
};

export default nextConfig;
