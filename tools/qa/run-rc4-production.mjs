#!/usr/bin/env node
/**
 * RC4 Production Readiness Sprint
 *
 * Usage:
 *   QA_BASE_URL=https://game29-xxxxx.vercel.app npm run qa:rc4-production
 *
 * Deploy workspace + validate:
 *   RC4_DEPLOY=1 npm run qa:rc4-production
 *
 * Fast stress (10 joins for local smoke):
 *   RC4_STRESS_COUNT=10 npm run qa:rc4-production
 */
import { execSync, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { REPO } from "./lib/common.mjs";
import { assertAllowedPreviewUrl } from "./lib/release-rules.mjs";
import { resolveStressJoinCount } from "./lib/stress-guard.mjs";
import { runLighthouseEvidence } from "./run-lighthouse-evidence.mjs";

const REPORT_PATH = path.join(REPO, "docs/releases/RC4-production-report.md");
const META_PATH = path.join(REPO, "docs/qa/deployment-meta.json");
const RESULTS_PATH = path.join(REPO, "docs/qa/rc4-production-results.json");
const MOBILE_DIR = path.join(REPO, "docs/qa/rc4-mobile");

const STRESS_RESOLVED = resolveStressJoinCount(process.env.RC4_STRESS_COUNT, "RC4 runner");
if (STRESS_RESOLVED.enabled) {
  process.env.RC4_STRESS_COUNT = String(STRESS_RESOLVED.count);
} else {
  process.env.RC4_STRESS_COUNT = "0";
}

function gitSha() {
  if (process.env.RC_GIT_SHA) return process.env.RC_GIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function installPlaywrightBrowsers() {
  console.log("\n→ Installing Playwright browsers (chromium, msedge, firefox, webkit)…\n");
  const env = { ...process.env };
  delete env.PLAYWRIGHT_BROWSERS_PATH;
  const code = spawnSync(
    "npx",
    ["playwright", "install", "chromium", "msedge", "firefox", "webkit"],
    { cwd: REPO, stdio: "inherit", shell: true, env }
  ).status;
  if (code !== 0) {
    console.warn("Playwright install returned non-zero — continuing with available browsers.");
  }
}

function deployPreview() {
  console.log("\n→ Deploying workspace to Vercel Preview…\n");
  const result = spawnSync("vercel", ["deploy", "--yes"], {
    cwd: REPO,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
  });
  const out = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.status !== 0) throw new Error(`Vercel deploy failed:\n${out}`);
  const match = out.match(/https:\/\/[^\s]+\.vercel\.app/);
  if (!match) throw new Error(`Could not parse Preview URL:\n${out}`);
  const deploymentId = out.match(/dpl_[A-Za-z0-9]+/)?.[0] ?? "cli-deploy";
  return { url: match[0].replace(/\/$/, ""), deploymentId };
}

async function writeDeploymentMeta(visitUrl, deploymentId) {
  const meta = {
    recordedAt: new Date().toISOString(),
    gitSha: gitSha(),
    deploymentId,
    visitUrl,
    target: "preview-rc4",
    productionUrl: "https://game29.vercel.app",
  };
  await mkdir(path.dirname(META_PATH), { recursive: true });
  await writeFile(META_PATH, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return meta;
}

async function readClsFromLighthouse(name) {
  try {
    const raw = await readFile(path.join(REPO, "docs/qa/lighthouse", `${name}.json`), "utf8");
    const data = JSON.parse(raw);
    const cls = data.audits?.["cumulative-layout-shift"]?.numericValue;
    return typeof cls === "number" ? cls : null;
  } catch {
    return null;
  }
}

async function runLighthouseGate(visitUrl) {
  console.log("\n→ Lighthouse (P0-7)…\n");
  let summary;
  try {
    summary = await runLighthouseEvidence(visitUrl);
  } catch (err) {
    console.warn(`Lighthouse failed: ${err.message ?? err}`);
    return { desktop: null, mobile: null, cls: null, pass: false };
  }
  const clsDesktop = await readClsFromLighthouse("desktop");
  const clsMobile = await readClsFromLighthouse("mobile");
  const cls = clsDesktop ?? clsMobile;
  const desktop = summary.desktop?.performance ?? null;
  const mobile = summary.mobile?.performance ?? null;
  const pass =
    desktop != null &&
    mobile != null &&
    desktop >= 95 &&
    mobile >= 90 &&
    cls != null &&
    cls <= 0.1;
  return { desktop, mobile, cls, pass };
}

async function runPlaywright(visitUrl, deploymentId) {
  if (process.env.RC4_SKIP_PLAYWRIGHT === "1") return 0;
  await mkdir(MOBILE_DIR, { recursive: true });
  const code = spawnSync("npx", ["playwright", "test", "--config=tests/e2e/rc4-production.config.ts"], {
    cwd: REPO,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      QA_SKIP_SERVER: "1",
      QA_BASE_URL: visitUrl,
      RC_GIT_SHA: gitSha(),
      RC_DEPLOYMENT_ID: deploymentId,
    },
  }).status;
  return code ?? 1;
}

async function readResults() {
  try {
    return JSON.parse(await readFile(RESULTS_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function patchResults(patch) {
  const cur = (await readResults()) ?? {};
  await writeFile(RESULTS_PATH, `${JSON.stringify({ ...cur, ...patch }, null, 2)}\n`, "utf8");
}

function formatMatrix(matrix = {}) {
  return ["chromium", "msedge", "firefox", "webkit"]
    .map((b) => `${b}: ${matrix[b] ?? "SKIP"}`)
    .join(", ");
}

function formatMobile(mobile = {}) {
  return Object.entries(mobile)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

async function writeReport(meta, results, pwExit, lh) {
  const r = results ?? {};
  const decision =
    pwExit === 0 && r.productionDecision === "READY" && lh.pass ? "READY" : "NOT READY";

  const body = `# RC4 Production Readiness Report

Generated: ${new Date().toISOString()}

## Deployment

| Field | Value |
|-------|-------|
| Git SHA | \`${meta.gitSha}\` |
| Deployment SHA | \`${meta.deploymentId}\` |
| Preview URL | ${meta.visitUrl} |
| Deployment Time | ${meta.recordedAt} |

## Production Gate

| Gate | Result |
|------|--------|
| Browser Matrix | ${formatMatrix(r.browserMatrix)} |
| Mobile QA | ${formatMobile(r.mobile)} |
| Golden Path (3min) | ${r.goldenPath ?? "FAIL"} (${r.goldenPathDurationMs ?? "—"}ms) |
| Join Stress (${r.joinStress?.count ?? 100}x) | ${r.joinStress?.successPct ?? "—"}% · avg ${r.joinStress?.averageMs ?? "—"}ms |
| Living World (60s) | ${r.livingWorld ?? "FAIL"} |
| Telemetry | ${r.telemetry ?? "FAIL"} |
| Lighthouse Desktop | ${lh.desktop ?? "—"} (gate ≥95) |
| Lighthouse Mobile | ${lh.mobile ?? "—"} (gate ≥90) |
| CLS | ${lh.cls ?? "—"} (gate ≤0.1) |
| Console | ${r.console?.errors ?? "—"} errors |
| Crash | ${r.crash ?? "—"} |

## Mobile Evidence

Screenshots: \`docs/qa/rc4-mobile/\`

## Production Decision

**${decision}**

---

## Completion Report

\`\`\`
Git SHA

${meta.gitSha}

Preview URL

${meta.visitUrl}

Browser Matrix

${formatMatrix(r.browserMatrix)}

Mobile QA

${formatMobile(r.mobile)}

Join Stress

${r.joinStress?.successPct ?? "—"}% · avg ${r.joinStress?.averageMs ?? "—"}ms · P95 ${r.joinStress?.p95Ms ?? "—"}ms · max ${r.joinStress?.maxMs ?? "—"}ms

Golden Path

${r.goldenPath ?? "FAIL"}

Living World

${r.livingWorld ?? "FAIL"}

Lighthouse

desktop ${lh.desktop ?? "—"} · mobile ${lh.mobile ?? "—"} · CLS ${lh.cls ?? "—"}

Console

${r.console?.errors ?? "—"}

Crash

${r.crash ?? "—"}

Production Decision

${decision}
\`\`\`
`;

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, body, "utf8");
  return decision;
}

async function main() {
  console.log("\n=== RC4 Production Readiness Sprint ===\n");

  installPlaywrightBrowsers();

  let visitUrl = process.env.QA_BASE_URL;
  let deploymentId = process.env.RC_DEPLOYMENT_ID ?? "—";

  if (process.env.RC4_DEPLOY === "1" || !visitUrl) {
    const deployed = deployPreview();
    visitUrl = deployed.url;
    deploymentId = deployed.deploymentId;
  }

  visitUrl = assertAllowedPreviewUrl(visitUrl);
  console.log(`Preview URL: ${visitUrl}`);
  console.log(`Git SHA: ${gitSha()}\n`);

  const meta = await writeDeploymentMeta(visitUrl, deploymentId);

  const lh = await runLighthouseGate(visitUrl);
  await patchResults({ lighthouse: lh, previewUrl: visitUrl, gitSha: gitSha(), deploymentId });

  const pwExit = await runPlaywright(visitUrl, deploymentId);
  const results = await readResults();
  if (results && !results.lighthouse) {
    await patchResults({ lighthouse: lh });
  }

  const finalResults = await readResults();
  const decision = await writeReport(meta, { ...finalResults, lighthouse: lh }, pwExit, lh);

  console.log("\n--- RC4 Completion Report ---\n");
  console.log(`Git SHA\n\n${meta.gitSha}\n`);
  console.log(`Preview URL\n\n${visitUrl}\n`);
  console.log(`Browser Matrix\n\n${formatMatrix(finalResults?.browserMatrix)}\n`);
  console.log(`Mobile QA\n\n${formatMobile(finalResults?.mobile)}\n`);
  console.log(
    `Join Stress\n\n${finalResults?.joinStress?.successPct ?? "—"}% · avg ${finalResults?.joinStress?.averageMs ?? "—"}ms\n`
  );
  console.log(`Golden Path\n\n${finalResults?.goldenPath ?? "FAIL"}\n`);
  console.log(`Living World\n\n${finalResults?.livingWorld ?? "FAIL"}\n`);
  console.log(`Lighthouse\n\ndesktop ${lh.desktop ?? "—"} · mobile ${lh.mobile ?? "—"} · CLS ${lh.cls ?? "—"}\n`);
  console.log(`Console\n\n${finalResults?.console?.errors ?? "—"}\n`);
  console.log(`Crash\n\n${finalResults?.crash ?? "—"}\n`);
  console.log(`Production Decision\n\n${decision}\n`);
  console.log(`Report: ${REPORT_PATH}\n`);

  process.exit(decision === "READY" ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
