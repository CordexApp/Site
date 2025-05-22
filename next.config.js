/** @type {import('next').NextConfig} */

const nextConfig = {
  /* config options here */
  output: "standalone",
  images: {
    unoptimized: true,
  },
  // Exclude backup directories from the build
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/backup/**', '**/backup-original/**', '**/node_modules/**']
    };
    return config;
  }
};

module.exports = nextConfig; 