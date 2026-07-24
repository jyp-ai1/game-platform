import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export async function readPlayableSlugs() {
  const src = await readFile(
    path.join(REPO, "apps/web/lib/playable-games.ts"),
    "utf8"
  );
  return src.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
}

export async function readGameMetadata() {
  const raw = await readFile(
    path.join(REPO, "tools/content-factory/data/all-50-metadata.json"),
    "utf8"
  );
  const data = JSON.parse(raw);
  const map = new Map();
  for (const g of data.games ?? []) {
    map.set(g.slug, g);
  }
  return { games: data.games ?? [], bySlug: map };
}

export async function thumbExists(slug) {
  const { access } = await import("node:fs/promises");
  for (const p of [
    path.join(REPO, "apps/web/public/images/games", `${slug}.png`),
    path.join(REPO, "apps/web/public/games", slug, "thumbnail.png"),
  ]) {
    try {
      await access(p);
      return { pass: true, path: p };
    } catch {
      /* try next */
    }
  }
  return { pass: false };
}

export async function readGameSource(slug) {
  const { readdir, readFile: rf } = await import("node:fs/promises");
  const srcDir = path.join(REPO, "games", slug, "src");
  const files = (await readdir(srcDir)).filter((f) => /\.tsx?$/.test(f));
  return (await Promise.all(files.map((f) => rf(path.join(srcDir, f), "utf8")))).join(
    "\n"
  );
}

export function slugToTitle(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function writeReport(subpath, data) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const out = path.join(REPO, "docs/reports/sprint15", subpath);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(data, null, 2), "utf8");
  return out;
}
