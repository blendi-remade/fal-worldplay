import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to allow the build
  turbopack: {},
  // SparkJS uses WASM internally
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.fal.media" },
      { protocol: "https", hostname: "**.worldlabs.ai" },
    ],
  },
};

export default nextConfig;
