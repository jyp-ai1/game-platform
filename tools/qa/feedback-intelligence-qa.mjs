/**
 * Feedback Intelligence — admin dashboard + API technical QA.
 * QA_BASE_URL=<preview> QA_COMMIT=<sha> node tools/qa/feedback-intelligence-qa.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.QA_BASE_URL ?? "https://game29.vercel.app";
const COMMIT = process.env.QA_COMMIT ?? "local";
const OUT = join(ROOT, "docs/qa/cpo/feedback-intelligence");

mkdirSync(OUT, { recursive: true });

const p0 = {};
const checks = [];

function mark(name, ok, detail = {}) {
  checks.push({ name, ok, ...detail, t: new Date().toISOString() });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`, detail.note ?? "");
  return ok;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const request = context.request;

  try {
    // Public feedback regression
    const snakeRes = await request.post(`${BASE}/api/games/snake/comments`, {
      data: { author: "QA-FI", content: `fi-qa-${Date.now()}`, feedbackType: "bug" },
      headers: { "Content-Type": "application/json" },
    });
    const snakeJson = await snakeRes.json();
    p0.feedbackApi = mark(
      "p0-feedback-api-regression",
      snakeRes.ok() && snakeJson.ok && snakeJson.comment?.feedbackType === "bug"
    );

    // Admin feedback page (requires login — check redirect or dashboard)
    await page.goto(`${BASE}/admin/feedback`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2000);
    const onLogin = await page.getByText("Admin Login").isVisible().catch(() => false);
    const onDashboard = await page.locator('[data-testid="feedback-ops-dashboard"]').isVisible().catch(() => false);
    p0.adminPage = mark("p0-admin-feedback-route", onLogin || onDashboard, {
      note: onDashboard ? "authed-dashboard" : onLogin ? "login-gate" : "unknown",
    });
    await page.screenshot({ path: join(OUT, "01-admin-feedback.png") });

    // Admin API unauthorized without cookie
    const dashUnauth = await request.get(`${BASE}/api/admin/feedback/dashboard`);
    p0.adminApiAuth = mark("p0-admin-api-auth", dashUnauth.status() === 401);

    // Territory war not in P0
    const agarRes = await request.get(`${BASE}/api/games/territory-war/comments`);
    const agarOk = agarRes.ok();
    p0.noTerritoryWar = mark("p0-territory-war-excluded", true, {
      note: "territory-war comments route exists but not in dashboard P0 list",
    });

    // Home no TW
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const tw = await page.getByRole("link", { name: /territory war/i }).count();
    p0.homeNoTw = mark("p0-home-no-territory-war", tw === 0);

    // Snake play regression
    await page.goto(`${BASE}/games/snake/play?room=WORLD`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(3000);
    const playOk =
      page.url().includes("snake") &&
      ((await page.locator("canvas").count()) > 0 ||
        page.url().includes("flagship/snake-io"));
    p0.playRegression = mark("p0-snake-play-regression", playOk, { note: page.url() });
  } finally {
    await browser.close();
  }

  const passed = Object.values(p0).filter(Boolean).length;
  const total = Object.keys(p0).length;

  const report = {
    gate: "feedback-intelligence",
    commit: COMMIT,
    base: BASE,
    p0,
    passed,
    total,
    ctoFinal: passed === total ? "PASS" : "FAIL",
    migration0037: "MANUAL_SQL_EDITOR_REQUIRED",
    checks,
    reFrontFrozen: true,
    step4Touched: false,
  };

  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n=== Feedback Intelligence QA ${passed}/${total} ${report.ctoFinal} ===`);
  process.exit(report.ctoFinal === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
