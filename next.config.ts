import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
