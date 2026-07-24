#!/usr/bin/env node
/** Extract game metadata from Supabase migration SQL files into JSON. */
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, "..", "..", "..");
const MIGRATIONS = path.join(REPO, "supabase", "migrations");
const OUT = path.join(__dirname, "..", "data", "all-50-metadata.json");

const CATEGORY_MAP = {
  brain: "puzzle",
  classic: "arcade",
  action: "arcade",
  retro: "arcade",
  board: "board",
};

/** @type {Map<string, Record<string, unknown>>} */
const games = new Map();

function slugToTitle(slug) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function parseUpdateBlocks(sql) {
  const updateRe =
    /update public\.games\s+set[\s\S]*?where slug = '([a-z0-9-]+)'/gi;
  let um;
  while ((um = updateRe.exec(sql)) !== null) {
    const slug = um[1];
    const block = um[0];
    const desc = block.match(/description = '([^']*)'/)?.[1];
    const how = block.match(/how_to_play = '([^']*)'/)?.[1];
    const diff = block.match(/difficulty = '(EASY|MEDIUM|HARD)'/)?.[1];
    const tagsMatch = block.match(/tags = array\[([^\]]*)\]/);
    const tags = tagsMatch?.[1]?.match(/'([^']+)'/g)?.map((t) => t.slice(1, -1));
    if (!desc && !how && !tags) continue;
    const prev = games.get(slug) ?? { slug, title: slugToTitle(slug), category: "casual", features: { save: true, ranking: true }, skipScaffold: true };
    games.set(slug, {
      ...prev,
      ...(desc ? { description: desc } : {}),
      ...(how ? { howToPlay: how } : {}),
      ...(diff ? { difficulty: diff } : {}),
      ...(tags ? { tags } : {}),
    });
  }
}

function parseInsertBlock(sql) {
  const re =
    /\(\s*'([a-z0-9-]+)',\s*'([^']*)',\s*'([^']*)',\s*'[^']*',\s*'(EASY|MEDIUM|HARD)',\s*'[^']*',\s*\d+,\s*\(select id from public\.categories where slug = '([^']+)'\)[\s\S]*?array\[([^\]]*)\],\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const [, slug, title, description, difficulty, catSlug, tagsRaw, howToPlay] = m;
    const tags = tagsRaw.match(/'([^']+)'/g)?.map((t) => t.slice(1, -1)) ?? [];
    const category = CATEGORY_MAP[catSlug] ?? catSlug;
    if (!["arcade", "puzzle", "board", "casual", "sports"].includes(category)) continue;
    games.set(slug, {
      slug,
      title,
      category,
      description,
      howToPlay,
      difficulty,
      tags,
      features: { save: true, ranking: true },
      skipScaffold: true,
    });
  }
}

async function main() {
  const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS, file), "utf8");
    parseInsertBlock(sql);
    parseUpdateBlocks(sql);
  }

  const playable = (
    await readFile(path.join(REPO, "apps/web/lib/playable-games.ts"), "utf8")
  ).match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];

  const batch = {
    label: "RC1 — All 50 playable games",
    sortOrderBase: 1,
    games: playable.map((slug, i) => {
      const existing = games.get(slug);
      if (existing) return { ...existing, sortOrder: i + 1 };
      return {
        slug,
        title: slugToTitle(slug),
        category: "casual",
        description: `${slugToTitle(slug)} 무료 온라인 게임.`,
        howToPlay: "화면 안내에 따라 플레이하세요.",
        difficulty: "EASY",
        tags: ["casual"],
        features: { save: true, ranking: true },
        skipScaffold: true,
        sortOrder: i + 1,
      };
    }),
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(batch, null, 2), "utf8");
  console.log(`Wrote ${batch.games.length} games → ${path.relative(REPO, OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
