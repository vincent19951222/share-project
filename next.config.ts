import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/assets/ui-prototypes/drink-update/generated/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vincent-1355816760.cos.ap-guangzhou.myqcloud.com",
        pathname: "/obsidian_images/**",
      },
    ],
  },
};

export default nextConfig;
