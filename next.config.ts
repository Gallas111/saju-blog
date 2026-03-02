import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.sajuboka.com",
      },
    ],
  },
  // Disable turbopack for build (Korean path issue)
  turbopack: undefined,
};

export default nextConfig;
