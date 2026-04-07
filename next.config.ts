import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "cloudinary.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  // Alias @prisma/client to our custom generated output path so that both
  // webpack (pages/API routes) and Turbopack resolve the correct client at
  // runtime — tsconfig paths alone only fix TypeScript type resolution.
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@prisma/client": path.resolve(__dirname, "generated/prisma/client.ts"),
    };
    return config;
  },

  turbopack: {
    resolveAlias: {
      "@prisma/client": "./generated/prisma/client.ts",
    },
  },
};

export default nextConfig;
