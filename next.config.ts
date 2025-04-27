import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cordex-service-images.s3.us-west-2.amazonaws.com",
        port: "",
        pathname: "/**",
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
