#!/usr/bin/env node
/**
 * Sprint 15 RC — objective per-game coverage (evidence for game-coverage.md).
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(REPO, "docs/reports/sprint15/game-coverage.md");
const JSON_OUT = path.join(REPO, "docs/reports/sprint15/game-coverage.json");

const CHECKS = {
  rule: {
    label: "Rule",
    re: /"won"|"over"|"lost"|"playing"|stage-clear|humanVsCpuStatus|useHumanVsCpuFeel|gameStatus|status:\s*"playing"|reportScore\s*\(|computeScore/,
  },
  feel: {
    label: "Feel",
    re: /playGameFeel\s*\(|useHumanVsCpuFeel\s*\(|feelTap\s*\(/,
  },
  retry: {
    label: "Retry",
    re: /emitGameRetry\s*\(/,
  },
  exit: {
    label: "Exit",
    re: /feel\.handleExit|onExit=\{/,
  },
  mobile: {
    label: "Mobile",
    re: /standard-game-shell|touch-none|PuzzlePlayField|max-w-\[min|max-w-sm/,
  },
};

async function loadSlugs() {
  const playable = await readFile(
    path.join(REPO, "apps/web/lib/playable-games.ts"),
    "utf8"
  );
  return playable.match(/"([a-z0-9-]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
}

async function readGameSrc(slug) {
  const dir = path.join(REPO, "games", slug, "src");
  const files = (await readdir(dir)).filter((f) => /\.tsx?$/.test(f));
  const parts = await Promise.all(
    files.map(async (f) => ({
      name: f,
      content: await readFile(path.join(dir, f), "utf8"),
    }))
  );
  return parts;
}

function gitModifiedFiles(slug) {
  try {
    const out = execSync(`git status --short games/${slug}/`, {
      cwd: REPO,
      encoding: "utf8",
    });
    return out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^\?\?\s+|\w+\s+/, "").trim())
      .filter((p) => p.startsWith(`games/${slug}/`));
  } catch {
    return [];
  }
}

function pass(col, src) {
  return CHECKS[col].re.test(src) ? "PASS" : "FAIL";
}

async function main() {
  const slugs = await loadSlugs();
  const rows = [];
  const summary = Object.fromEntries(Object.keys(CHECKS).map((k) => [k, 0]));

  for (const slug of slugs) {
    let parts;
    try {
      parts = await readGameSrc(slug);
    } catch {
      rows.push({
        slug,
        error: "missing source",
        rule: "FAIL",
        feel: "FAIL",
        retry: "FAIL",
        exit: "FAIL",
        mobile: "FAIL",
        modified: [],
      });
      continue;
    }

    const src = parts.map((p) => p.content).join("\n");
    const modified = gitModifiedFiles(slug);
    const row = {
      slug,
      modified,
      rule: pass("rule", src),
      feel: pass("feel", src),
      retry: pass("retry", src),
      exit: pass("exit", src),
      mobile: pass("mobile", src),
    };
    for (const k of Object.keys(CHECKS)) {
      if (row[k] === "PASS") summary[k]++;
    }
    rows.push(row);
  }

  const total = slugs.length;
  const allPass = Object.values(summary).every((n) => n === total);
  const fails = rows.filter(
    (r) =>
      r.error ||
      r.rule === "FAIL" ||
      r.feel === "FAIL" ||
      r.retry === "FAIL" ||
      r.exit === "FAIL" ||
      r.mobile === "FAIL" ||
      r.modified.length === 0
  );

  const lines = [
    "# Sprint 15 — Game Coverage (Release Candidate Evidence)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    ...Object.entries(CHECKS).map(
      ([k, def]) => `- **${def.label}:** ${summary[k]}/${total}`
    ),
    `- **Modified (git):** ${rows.filter((r) => r.modified.length > 0).length}/${total}`,
    `- **RC Ready:** ${allPass && fails.length === 0 ? "YES" : "NO"}`,
    "",
    ...(fails.length
      ? [
          "## FAIL / Missing",
          "",
          ...fails.map(
            (r) =>
              `- \`${r.slug}\`${r.error ? " (no source)" : ""} — ${["rule", "feel", "retry", "exit", "mobile"].filter((c) => r[c] === "FAIL").join(", ") || ""}${r.modified.length === 0 ? " modified:0" : ""}`
          ),
          "",
        ]
      : []),
    "## Coverage Table",
    "",
    "| Game | Rule | Feel | Retry | Exit | Mobile | Modified Files |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((r) => {
      const mods =
        r.modified.length > 0
          ? r.modified.map((f) => path.basename(f)).join(", ")
          : r.error
            ? "—"
            : "⚠ none";
      return `| ${r.slug} | ${r.rule ?? "FAIL"} | ${r.feel ?? "FAIL"} | ${r.retry ?? "FAIL"} | ${r.exit ?? "FAIL"} | ${r.mobile ?? "FAIL"} | ${mods} |`;
    }),
    "",
  ];

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, lines.join("\n"));
  await writeFile(
    JSON_OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total,
        summary,
        modified: rows.filter((r) => r.modified.length > 0).length,
        rcReady: allPass && fails.length === 0,
        fails: fails.map((r) => r.slug),
        rows,
      },
      null,
      2
    )
  );

  console.log("Game Coverage");
  for (const [k, def] of Object.entries(CHECKS)) {
    console.log(`  ${def.label}: ${summary[k]}/${total}`);
  }
  console.log(`  Modified: ${rows.filter((r) => r.modified.length > 0).length}/${total}`);
  console.log(`  RC Ready: ${allPass && fails.length === 0 ? "YES" : "NO"}`);
  if (fails.length) {
    console.log("  FAIL:", fails.map((r) => r.slug).join(", "));
    process.exit(1);
  }
}

main();
