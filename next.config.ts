import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  // Add hostname configuration
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  // Avoid Node DNS caching issues in containers
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 500,
      };
    }
    return config;
  },
};

export default nextConfig;
