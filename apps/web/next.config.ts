import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const repoRoot = path.join(__dirname, "..", "..");

// Auto-discover games/* packages so adding a new game never requires
// touching this file — see games/<slug>/package.json for the naming
// convention (@game-platform/game-<slug>).
const gamesDir = path.join(repoRoot, "games");
const gamePackages = fs
  .readdirSync(gamesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `@game-platform/game-${entry.name}`);

const nextConfig: NextConfig = {
  transpilePackages: [
    "@game-platform/ui",
    "@game-platform/shared",
    "@game-platform/game-sdk",
    ...gamePackages,
  ],
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
