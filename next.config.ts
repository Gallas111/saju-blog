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
  async redirects() {
    return [
      {
        source: "/blog/2024-samjaetti-fortune-analysis",
        destination: "/blog/2026-samjaetti-fortune-analysis",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
