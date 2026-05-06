import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Keep local and container build artifacts separate to avoid webpack runtime corruption.
	distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
