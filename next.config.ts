import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
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
      {
        source: "/cmd_sco",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
