#!/usr/bin/env node
/**
 * Sprint 13.6 — Release Gate automation.
 * Blocks Preview deploy when any Batch 1 check FAILs.
 *
 * Checks: Rule · Stage · Retry · Save · Score · QA
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const BATCH_1 = ["bubble-pop", "2048", "memory", "color-match"];
const BATCH_1_RULES = BATCH_1.map((s) => `docs/game-rules/${s}.md`);

const GATE_LABELS = ["Rule", "Stage", "Retry", "Save", "Score", "QA"];

function findLatestReportDir() {
  const base = path.join(REPO, "docs/reports/full-loop");
  try {
    return readdirSync(base)
      .map((name) => path.join(base, name))
      .filter((p) => statSync(p).isDirectory())
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
  } catch {
    return null;
  }
}

function loadReport() {
  const dir = findLatestReportDir();
  if (!dir) return null;
  try {
    return JSON.parse(readFileSync(path.join(dir, "results.json"), "utf8"));
  } catch {
    return null;
  }
}

function stepStatus(steps, id) {
  return steps?.find((s) => s.id === id)?.status;
}

function evaluateGame(slug, qa) {
  const checks = [];
  const ruleOk = existsSync(path.join(REPO, `docs/game-rules/${slug}.md`));
  checks.push({ label: "Rule", pass: ruleOk, detail: ruleOk ? "doc ok" : "missing rule doc" });

  if (!qa) {
    checks.push({ label: "Stage", pass: false, detail: "no QA data" });
    checks.push({ label: "Retry", pass: false, detail: "no QA data" });
    checks.push({ label: "Save", pass: false, detail: "no QA data" });
    checks.push({ label: "Score", pass: false, detail: "no QA data" });
    checks.push({ label: "QA", pass: false, detail: "UNKNOWN" });
    return checks;
  }

  const stage = stepStatus(qa.steps, "stageClear");
  const nextStage = stepStatus(qa.steps, "nextStage");
  const stageOk = !stage && !nextStage ? true : stage === "pass" || stage === "skip" || nextStage === "pass" || nextStage === "skip";
  checks.push({ label: "Stage", pass: stageOk, detail: `${stage ?? "—"}/${nextStage ?? "—"}` });

  const retry = stepStatus(qa.steps, "retry");
  checks.push({ label: "Retry", pass: retry === "pass" || retry === "skip", detail: retry ?? "—" });

  const save = stepStatus(qa.steps, "scoreSave");
  checks.push({
    label: "Save",
    pass: save === "pass" || save === "skip",
    detail: save ?? "—",
  });

  const scoreOk = (qa.score != null && qa.score > 0) || qa.verdict === "PASS";
  checks.push({ label: "Score", pass: scoreOk, detail: qa.score != null ? String(qa.score) : "—" });

  checks.push({ label: "QA", pass: qa.verdict === "PASS", detail: qa.verdict ?? "UNKNOWN" });

  return checks;
}

console.log("=== Sprint 13.6 Release Gate ===\n");

let allPass = true;
const report = loadReport();
const bySlug = new Map(report?.games?.map((g) => [g.slug, g]) ?? []);

for (const slug of BATCH_1) {
  const qa = bySlug.get(slug);
  const checks = evaluateGame(slug, qa);
  const gamePass = checks.every((c) => c.pass);

  console.log(`${slug}: ${gamePass ? "PASS" : "FAIL"}`);
  for (const c of checks) {
    const mark = c.pass ? "☑" : "☐";
    console.log(`  ${mark} ${c.label} PASS — ${c.detail}`);
    if (!c.pass) allPass = false;
  }
  console.log("");
}

const rulesOk = BATCH_1_RULES.every((f) => existsSync(path.join(REPO, f)));
if (!rulesOk) {
  allPass = false;
  console.log("FAIL: missing Batch 1 rule docs");
}

if (!report) {
  allPass = false;
  console.log("FAIL: no full-loop QA report found");
}

console.log(allPass ? "\n=== RELEASE GATE: GREEN ===" : "\n=== RELEASE GATE: BLOCKED ===");
console.log(`Report: ${report?.date ?? "none"}`);

process.exit(allPass ? 0 : 1);
