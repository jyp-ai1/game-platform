import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@game-platform/ui",
    "@game-platform/shared",
    "@game-platform/game-2048",
  ],
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
