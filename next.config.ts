import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    inlineCss: true,
  },
};

export default nextConfig;
