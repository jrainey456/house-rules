import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force webpack for stability
  webpack: (config, { isServer }) => {
    // Basic optimization for deployment
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
      },
    };
    return config;
  },
};

export default nextConfig;
