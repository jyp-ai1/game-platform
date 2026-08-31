/**
 * MP-CTO-023 — Comments MVP (8 P0 gates on Preview).
 * PLAYWRIGHT_BROWSERS_PATH=0 QA_BASE_URL=<preview> QA_COMMIT=<sha> node tools/qa/mp-cto-023-comments.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.QA_BASE_URL ?? "https://game29.vercel.app";
const COMMIT = process.env.QA_COMMIT ?? "local";
const OUT = join(ROOT, "docs/qa/cpo/mp-cto-023");
const SHOTS = join(OUT, "screenshots");

mkdirSync(SHOTS, { recursive: true });

const MARKER = `mp023-${Date.now()}`;
const AUTHOR = "QA-MP023";
const checks = [];
const p0 = {};

function mark(name, ok, detail = {}) {
  const row = { name, ok, ...detail, t: new Date().toISOString() };
  checks.push(row);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`, detail.note ?? detail.detail ?? "");
  return ok;
}

async function postComment(request, slug, author, content) {
  return request.post(`${BASE}/api/games/${slug}/comments`, {
    data: { author, content },
    headers: { "Content-Type": "application/json" },
  });
}

async function getComments(request, slug) {
  return request.get(`${BASE}/api/games/${slug}/comments`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const request = context.request;

  try {
    // 1 — Game detail entry
    await page.goto(`${BASE}/games/snake`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const commentsVisible = await page.locator('[data-testid="game-detail-comments"]').isVisible();
    p0.detailEntry = mark("p0-detail-entry", commentsVisible);
    await page.screenshot({ path: join(SHOTS, "01-detail-entry.png") });

    // 2 — Comment write
    await page.locator('[data-testid="comments-author"]').fill(AUTHOR);
    await page.locator('[data-testid="comments-textarea"]').fill(MARKER);
    await page.locator('[data-testid="comments-submit"]').click();
    await page.waitForTimeout(1500);
    const inList = await page.locator('[data-testid="comments-list"]').getByText(MARKER).isVisible();
    p0.commentWrite = mark("p0-comment-write", inList);
    await page.screenshot({ path: join(SHOTS, "02-comment-write.png") });

    // 3 — Comment list (API)
    const listRes = await getComments(request, "snake");
    const listJson = await listRes.json();
    const apiHas = (listJson.comments ?? []).some((c) => c.content === MARKER);
    p0.commentList = mark("p0-comment-list", listRes.ok() && listJson.ok && apiHas, {
      note: listJson.error,
    });

    // 4 — Refresh persistence
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const afterRefresh = await page.locator('[data-testid="comments-list"]').getByText(MARKER).isVisible();
    p0.refresh = mark("p0-refresh-persistence", afterRefresh);
    await page.screenshot({ path: join(SHOTS, "03-after-refresh.png") });

    // 5 — Incognito (new context)
    const incognito = await browser.newContext();
    const incPage = await incognito.newPage();
    await incPage.goto(`${BASE}/games/snake`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await incPage.waitForTimeout(1500);
    const incognitoOk = await incPage.locator('[data-testid="comments-list"]').getByText(MARKER).isVisible();
    p0.incognito = mark("p0-incognito", incognitoOk);
    await incPage.screenshot({ path: join(SHOTS, "04-incognito.png") });
    await incognito.close();

    // 6 — Per-game isolation
    await page.goto(`${BASE}/games/bomber`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(1000);
    const bomberHasMarker = await page.locator('[data-testid="comments-list"]').getByText(MARKER).count();
    p0.isolation = mark("p0-per-game-isolation", bomberHasMarker === 0);
    await page.screenshot({ path: join(SHOTS, "05-bomber-no-snake-comment.png") });

    // 7 — Empty comment rejected
    const beforeEmpty = await getComments(request, "snake");
    const beforeJson = await beforeEmpty.json();
    const countBefore = (beforeJson.comments ?? []).length;
    const emptyRes = await postComment(request, "snake", AUTHOR, "   ");
    const emptyJson = await emptyRes.json();
    const afterEmpty = await getComments(request, "snake");
    const afterJson = await afterEmpty.json();
    const countAfter = (afterJson.comments ?? []).length;
    p0.emptyReject = mark(
      "p0-empty-comment-reject",
      emptyRes.status() === 400 && !emptyJson.ok && countAfter === countBefore
    );

    // 8 — Game play regression (snake redirects to flagship)
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
    await page.screenshot({ path: join(SHOTS, "06-snake-play.png") });
  } finally {
    await browser.close();
  }

  const passed = Object.values(p0).filter(Boolean).length;
  const total = Object.keys(p0).length;
  const ctoFinal = passed === total ? "PASS" : "FAIL";

  const report = {
    gate: "mp-cto-023",
    scope: "Comments MVP",
    commit: COMMIT,
    base: BASE,
    marker: MARKER,
    finishedAt: new Date().toISOString(),
    p0,
    passed,
    total,
    ctoFinal,
    checks,
  };

  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(report, null, 2));

  console.log(`\n=== MP-CTO-023 P0 ${passed}/${total} ${ctoFinal} ===`);
  process.exit(ctoFinal === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
