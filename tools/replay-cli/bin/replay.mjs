#!/usr/bin/env node
/**
 * Replay CLI — Game Operating System developer tool.
 * Usage: node tools/replay-cli/bin/replay.mjs create-game <name>
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const [, , cmd, ...args] = process.argv;

const COMMANDS = {
  "create-game": createGame,
  plugins: listPlugins,
  help: showHelp,
};

function showHelp() {
  console.log(`
Replay CLI — Game Operating System

  replay create-game <name>   Scaffold new game with Replay Engine + plugins
  replay plugins              List available plugins
  replay help                 Show this help
`);
}

function listPlugins() {
  const plugins = [
    "leaderboard", "passport", "journey", "achievement", "collection",
    "multiplayer", "ads", "analytics", "notification", "voice", "tournament",
  ];
  console.log("Replay Plugins:\n");
  for (const p of plugins) console.log(`  · ${p}`);
  console.log("\nUse in game: configureGamePlugins(['leaderboard', 'passport', ...])");
}

function createGame(name) {
  if (!name) {
    console.error("Usage: replay create-game <name>");
    process.exit(1);
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const dir = resolve(process.cwd(), "games", slug);
  if (existsSync(dir)) {
    console.error(`Already exists: ${dir}`);
    process.exit(1);
  }
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({
    name: `@game-platform/game-${slug}`,
    version: "0.0.0",
    private: true,
    main: "./src/index.tsx",
    dependencies: {
      "@game-platform/replay-engine": "*",
      "@game-platform/ui": "*",
    },
    peerDependencies: { react: "^19" },
  }, null, 2));
  writeFileSync(join(dir, "src", "index.tsx"), `import { configureGamePlugins, ReplayOS } from "@game-platform/replay-engine";

configureGamePlugins(ReplayOS.plugins.DEFAULT);

export { default } from "./Game";
`);
  writeFileSync(join(dir, "src", "Game.tsx"), `import { useEffect } from "react";
import { ReplayOS } from "@game-platform/replay-engine";

export default function Game() {
  useEffect(() => {
    ReplayOS.Replay.init({ gameSlug: "${slug}" });
  }, []);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <h1>${name}</h1>
      <p>Powered by Replay Engine</p>
    </div>
  );
}
`);
  console.log(`✓ Created game: games/${slug}`);
  console.log("  Next: npm install && wire in game-player.tsx");
}

const fn = COMMANDS[cmd] ?? showHelp;
if (cmd && COMMANDS[cmd]) {
  COMMANDS[cmd](...args);
} else {
  showHelp();
}
