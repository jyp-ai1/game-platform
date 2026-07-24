#!/usr/bin/env node
/** Dead code scan — components/hooks with zero importers in apps/web. */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WEB = path.join(REPO, "apps/web");
const OUT = path.join(REPO, "docs/reports/sprint15/dead-code-scan.json");

const IGNORE = new Set([
  "layout.tsx",
  "page.tsx",
  "loading.tsx",
  "error.tsx",
  "not-found.tsx",
  "opengraph-image.tsx",
  "icon.svg",
  "manifest.webmanifest",
  "robots.ts",
  "sitemap.ts",
]);

async function walk(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      await walk(p, acc);
    } else if (/\.(tsx|ts)$/.test(e.name) && !IGNORE.has(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

async function main() {
  const componentDir = path.join(WEB, "components");
  const libDir = path.join(WEB, "lib");
  const files = [...(await walk(componentDir)), ...(await walk(libDir))];

  const allSrc = await Promise.all(
    (await walk(WEB)).map(async (f) => [f, await readFile(f, "utf8")])
  );
  const corpus = allSrc.map(([, t]) => t).join("\n");

  const suspects = [];
  for (const file of files) {
    const base = path.basename(file, path.extname(file));
    if (base.startsWith("_") || base === "index") continue;
    const rel = path.relative(WEB, file).replace(/\\/g, "/");
    const importPatterns = [
      `@/${path.dirname(rel)}/${base}`,
      `@/${rel.replace(/\.tsx?$/, "")}`,
      `./${base}`,
      `"${base}"`,
      `'${base}'`,
      `/${base}'`,
    ];
    const referenced = importPatterns.some((pat) => corpus.includes(pat));
    if (!referenced && !file.includes("components/ui")) {
      suspects.push({ file: rel, export: base });
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    scanned: files.length,
    suspects: suspects.length,
    items: suspects.slice(0, 50),
    overall: suspects.length <= 60 ? "PASS" : "WARN",
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(summary, null, 2), "utf8");
  console.log(`Dead code scan: ${summary.suspects} suspects · ${summary.overall}`);
  process.exit(0);
}

main();
