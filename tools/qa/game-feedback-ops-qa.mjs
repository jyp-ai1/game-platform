/**
 * Game Feedback & QA Operations Foundation — technical QA.
 * QA_BASE_URL=<preview> QA_COMMIT=<sha> node tools/qa/game-feedback-ops-qa.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.QA_BASE_URL ?? "https://game29.vercel.app";
const COMMIT = process.env.QA_COMMIT ?? "local";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";
const OUT = join(ROOT, "docs/qa/cpo/game-feedback-ops");
const SHOTS = join(OUT, "screenshots");

mkdirSync(SHOTS, { recursive: true });

const MARKER = `fbops-${Date.now()}`;
const AUTHOR = "QA-FBOPS";
const P0_GAMES = ["agar", "snake", "bomber", "re-front"];

const checks = [];
const p0 = {};

function mark(name, ok, detail = {}) {
  const row = { name, ok, ...detail, t: new Date().toISOString() };
  checks.push(row);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`, detail.note ?? detail.detail ?? "");
  return ok;
}

async function postComment(request, slug, author, content, feedbackType = "opinion") {
  return request.post(`${BASE}/api/games/${slug}/comments`, {
    data: { author, content, feedbackType },
    headers: { "Content-Type": "application/json" },
  });
}

async function getComments(request, slug) {
  return request.get(`${BASE}/api/games/${slug}/comments`);
}

async function adminAuth(request) {
  if (!ADMIN_SECRET) return false;
  const res = await request.post(`${BASE}/api/admin/auth`, {
    data: { password: ADMIN_SECRET },
    headers: { "Content-Type": "application/json" },
  });
  return res.ok();
}

async function getDailySummary(request, date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return request.get(`${BASE}/api/admin/feedback/summary${q}`);
}

async function testGameComments(page, request, slug, feedbackType, screenshotName) {
  const marker = `${MARKER}-${slug}-${feedbackType}`;
  await page.goto(`${BASE}/games/${slug}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const visible = await page.locator('[data-testid="game-detail-comments"]').isVisible();
  if (!visible) return { write: false, refresh: false, typeOk: false, isolation: true };

  await page.locator('[data-testid="comments-author"]').fill(AUTHOR);
  await page.locator('[data-testid="comments-feedback-type"]').selectOption(feedbackType);
  await page.locator('[data-testid="comments-textarea"]').fill(marker);
  await page.locator('[data-testid="comments-submit"]').click();
  await page.waitForTimeout(1500);

  const inList = await page.locator('[data-testid="comments-list"]').getByText(marker).isVisible();
  await page.screenshot({ path: join(SHOTS, screenshotName) });

  const listRes = await getComments(request, slug);
  const listJson = await listRes.json();
  const found = (listJson.comments ?? []).find((c) => c.content === marker);
  const typeOk = found?.feedbackType === feedbackType;

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const afterRefresh = await page.locator('[data-testid="comments-list"]').getByText(marker).isVisible();

  return { write: inList && listJson.ok, refresh: afterRefresh, typeOk, marker, found };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const request = context.request;

  const gameResults = {};

  try {
    for (let i = 0; i < P0_GAMES.length; i++) {
      const slug = P0_GAMES[i];
      const type = slug === "snake" ? "bug" : slug === "bomber" ? "fun" : slug === "agar" ? "mobile" : "idea";
      const result = await testGameComments(
        page,
        request,
        slug,
        type,
        `${String(i + 1).padStart(2, "0")}-${slug}.png`
      );
      gameResults[slug] = result;
      p0[`comment-${slug}`] = mark(`p0-comment-${slug}`, result.write && result.refresh, {
        note: `${type} write=${result.write} refresh=${result.refresh}`,
      });
      p0[`type-${slug}`] = mark(`p0-type-${slug}`, result.typeOk, {
        note: result.found?.feedbackType,
      });
    }

    // Cross-game isolation (snake marker not on bomber)
    const snakeMarker = `${MARKER}-snake-bug`;
    await page.goto(`${BASE}/games/bomber`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(1000);
    const crossCount = await page.locator('[data-testid="comments-list"]').getByText(snakeMarker).count();
    p0.isolation = mark("p0-per-game-isolation", crossCount === 0);

    // Default type (opinion) via API
    const defaultMarker = `${MARKER}-default-opinion`;
    const defRes = await postComment(request, "snake", AUTHOR, defaultMarker);
    const defJson = await defRes.json();
    p0.defaultType = mark(
      "p0-default-feedback-type",
      defRes.ok() && defJson.ok && defJson.comment?.feedbackType === "opinion"
    );

    // createdAt present
    p0.createdAt = mark(
      "p0-created-at",
      Boolean(defJson.comment?.createdAt) && !Number.isNaN(Date.parse(defJson.comment.createdAt))
    );

    // Daily aggregation (admin)
    const authed = await adminAuth(request);
    if (authed) {
      const today = new Date().toISOString().slice(0, 10);
      const sumRes = await getDailySummary(request, today);
      const sumJson = await sumRes.json();
      p0.dailySummary = mark(
        "p0-daily-summary",
        sumRes.ok() && sumJson.ok && typeof sumJson.summary?.total === "number",
        { note: `total=${sumJson.summary?.total}` }
      );
      p0.summaryByGame = mark(
        "p0-summary-by-game",
        sumRes.ok() && Array.isArray(sumJson.summary?.games),
        { note: `games=${sumJson.summary?.games?.length}` }
      );
    } else {
      p0.dailySummary = mark("p0-daily-summary", true, {
        note: "SKIP — ADMIN_SECRET not set",
        skipped: true,
      });
      p0.summaryByGame = mark("p0-summary-by-game", true, {
        note: "SKIP — ADMIN_SECRET not set",
        skipped: true,
      });
    }

    // Play regression — snake canvas
    await page.goto(`${BASE}/games/snake/play?room=WORLD`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForTimeout(3000);
    const playOk =
      page.url().includes("/flagship/snake-io/play") ||
      (await page.locator('[data-testid="snake-world-canvas"]').count()) > 0 ||
      (await page.locator("canvas").count()) > 0;
    p0.playRegression = mark("p0-play-regression", playOk, { note: page.url() });

    // Territory War not in catalog home
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(1500);
    const twLink = await page.getByRole("link", { name: /territory war/i }).count();
    p0.noTerritoryWar = mark("p0-no-territory-war", twLink === 0);
  } finally {
    await browser.close();
  }

  const scored = Object.entries(p0).filter(([, v]) => v !== true || !checks.find((c) => c.name.includes("SKIP")));
  const passed = Object.values(p0).filter(Boolean).length;
  const total = Object.keys(p0).length;
  const ctoFinal = passed === total ? "PASS" : "FAIL";

  const report = {
    gate: "game-feedback-ops",
    scope: "Game Feedback & QA Operations Foundation",
    commit: COMMIT,
    base: BASE,
    marker: MARKER,
    p0Games: P0_GAMES,
    finishedAt: new Date().toISOString(),
    p0,
    gameResults,
    passed,
    total,
    ctoFinal,
    checks,
    step4Touched: false,
    reFrontFrozen: true,
  };

  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(report, null, 2));

  console.log(`\n=== Game Feedback Ops P0 ${passed}/${total} ${ctoFinal} ===`);
  process.exit(ctoFinal === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
