import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.takealot.com"
      },
      {
        protocol: "https",
        hostname: "media.takealot.com"
      }
    ]
  }
};

export default nextConfig;
