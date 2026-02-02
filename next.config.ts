import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactCompiler: true,
	reactStrictMode: true,
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "biohaviour.com",
			},
		],
	},
};

const withMDX = createMDX();

export default withMDX(nextConfig);
