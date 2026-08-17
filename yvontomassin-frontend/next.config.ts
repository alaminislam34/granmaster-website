import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker standalone deployment
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "10.10.7.74",
        port: "8001",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "10.10.7.74",
        port: "8001",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
