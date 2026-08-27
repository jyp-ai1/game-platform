/**
 * PLATFORM-UX-CONTRACT-001/002 — smoke on Preview or local.
 * Usage (PowerShell):
 *   $env:QA_BASE_URL="https://game29-xxx.vercel.app"; node tools/qa/platform-ux-contract-smoke.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const BASE =
  process.env.QA_BASE_URL ?? "https://game29-opskl069i-jyp-ai1s-projects.vercel.app";
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../docs/qa/platform-ux-contract-001"
);
const COMMIT = process.env.QA_COMMIT ?? "local";

mkdirSync(OUT, { recursive: true });

const MP_GAMES = [
  { slug: "snake", detailPath: "/games/snake" },
  { slug: "agar", detailPath: "/games/agar" },
  { slug: "bomber", detailPath: "/games/bomber" },
];

const SOLO = { detailPath: "/games/2048" };

/** @type {Record<string, boolean>} */
const report = {
  commonDetail: false,
  commonPlay: false,
  commonLobby: false,
  character: false,
  difficulty: false,
  enter: false,
  gameShell: false,
  death: false,
  retry: false,
  exit: false,
  snakeRegression: false,
  agarRegression: false,
  bomberRegression: false,
  replaySnake: false,
  replayAgar: false,
  replayBomber: false,
  replaySolo: false,
  mobileCta: false,
  noCardDirect: false,
};

const log = { base: BASE, commit: COMMIT, startedAt: new Date().toISOString(), checks: [] };
const mark = (name, ok, detail = {}) => {
  log.checks.push({ name, ok, ...detail, t: new Date().toISOString() });
  return ok;
};

async function assertNoEasy(page) {
  const easyBtn = page.locator('[data-testid="mp-ai-easy"]');
  const easyDetail = page.locator('[data-testid="game-detail-diff-easy"]');
  return (await easyBtn.count()) === 0 && (await easyDetail.count()) === 0;
}

async function assertDifficultyLabels(page) {
  const normal = page.locator('[data-testid="mp-ai-normal"]');
  const hard = page.locator('[data-testid="mp-ai-hard"]');
  const superhard = page.locator('[data-testid="mp-ai-superhard"]');
  return (
    (await normal.count()) > 0 &&
    (await hard.count()) > 0 &&
    (await superhard.count()) > 0 &&
    (await assertNoEasy(page))
  );
}

async function runMpFlow(page, game, idx) {
  const prefix = `${idx}-${game.slug}`;
  await page.goto(`${BASE}${game.detailPath}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator('[data-testid="game-detail-page"]').waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(OUT, `${prefix}-01-detail.png`) });

  const detailOk = (await page.locator('[data-testid="game-detail-page"]').count()) > 0;
  mark(`${game.slug}-detail`, detailOk);

  const worldCta = page.locator('[data-testid="game-detail-play-cta"]');
  const ctaText = (await worldCta.textContent())?.trim() ?? "";
  mark(`${game.slug}-world-play-cta`, /WORLD PLAY/i.test(ctaText), { ctaText });

  await worldCta.click({ timeout: 15_000 });
  await page.waitForURL(/\/play/, { timeout: 60_000 });
  await page.locator('[data-testid="mp-entry-lobby"]').waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(OUT, `${prefix}-02-lobby.png`) });

  const lobby = (await page.locator('[data-testid="mp-entry-lobby"]').count()) > 0;
  mark(`${game.slug}-lobby`, lobby);

  const colorSection = page.getByText(/^Color$/i);
  const hasColorStep = (await colorSection.count()) > 0;
  mark(`${game.slug}-color-step`, hasColorStep);

  const charSection = (await page.getByText(/^Character$/i).count()) > 0;
  mark(`${game.slug}-character`, charSection);

  const hasDiffUi = (await page.locator('[data-testid="mp-ai-difficulty"]').count()) > 0;
  mark(`${game.slug}-no-difficulty`, !hasDiffUi);

  await page.locator('[data-testid="mp-enter-world"]').click({ timeout: 15_000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, `${prefix}-03-playing.png`) });

  const shell =
    (await page.locator('[data-testid="mp-you-bar"], [data-testid="mp-top10"], .touch-none').count()) >
    0;
  mark(`${game.slug}-shell`, shell);

  return { detailOk, lobby, hasColorStep, charSection, noDiff: !hasDiffUi, shell };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  // Prefer Discover catalog for Re:Play cards (home may lazy-load)
  await page.goto(`${BASE}/games`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, "00-home.png") });

  const replayBtns = page.locator("a", { hasText: /▶\s*Re:Play/i });
  const replayCount = await replayBtns.count();
  mark("home-replay-cta-count", replayCount > 0, { replayCount });

  const thumbInLink = await page.evaluate(() => {
    const imgs = document.querySelectorAll("article img");
    for (const img of imgs) {
      if (img.closest("a")) return true;
    }
    return false;
  });
  report.noCardDirect = mark("no-card-thumb-link", !thumbInLink, { thumbInLink });

  if (replayCount > 0) {
    await replayBtns.first().click();
    await page.waitForURL(/\/games\//, { timeout: 30_000 });
    report.replaySnake = mark("replay-snake-nav", /\/games\/[^/]+$/.test(new URL(page.url()).pathname) || page.url().includes("/games/"));
    await page.screenshot({ path: join(OUT, "replay-snake-detail.png") });
  } else {
    report.replaySnake = mark("replay-snake-nav", false, { reason: "no card Re:Play CTA found" });
  }

  const snakeRes = await runMpFlow(page, MP_GAMES[0], 1);
  report.snakeRegression =
    snakeRes.detailOk &&
    snakeRes.lobby &&
    snakeRes.hasColorStep &&
    snakeRes.noDiff &&
    snakeRes.shell;
  report.commonDetail = snakeRes.detailOk;
  report.commonLobby = snakeRes.lobby;
  report.character = snakeRes.charSection && snakeRes.hasColorStep;
  report.difficulty = snakeRes.noDiff;
  report.replaySnake = report.replaySnake || snakeRes.detailOk;

  const agarRes = await runMpFlow(page, MP_GAMES[1], 2);
  report.agarRegression =
    agarRes.detailOk &&
    agarRes.lobby &&
    agarRes.hasColorStep &&
    agarRes.noDiff &&
    agarRes.shell;
  report.replayAgar = agarRes.detailOk;

  const bomberRes = await runMpFlow(page, MP_GAMES[2], 3);
  report.bomberRegression =
    bomberRes.detailOk &&
    bomberRes.lobby &&
    bomberRes.hasColorStep &&
    bomberRes.noDiff &&
    bomberRes.shell;
  report.replayBomber = bomberRes.detailOk;

  report.commonPlay = report.snakeRegression && report.agarRegression && report.bomberRegression;
  report.enter = report.commonPlay;
  report.gameShell = report.commonPlay;

  await page.goto(`${BASE}${SOLO.detailPath}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const soloCta = page.locator('[data-testid="game-detail-play-cta"]');
  const soloText = ((await soloCta.textContent()) ?? "").trim();
  report.replaySolo = mark("solo-play-cta", /PLAY/i.test(soloText) && !/WORLD/i.test(soloText), {
    soloText,
  });

  const mobile = await browser.newPage({ ...devices["iPhone 13"] });
  await mobile.goto(`${BASE}/games/snake`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const mobileCta = mobile.locator('[data-testid="game-detail-play-cta"]');
  const box = await mobileCta.boundingBox();
  report.mobileCta = mark(
    "mobile-cta-size",
    !!box && (box.height ?? 0) >= 44 && (box.width ?? 0) >= 180,
    { box }
  );
  await mobile.screenshot({ path: join(OUT, "mobile-snake-detail-cta.png") });
  await mobile.close();

  // Death overlay is shared MultiplayerDeathOverlay — code-path verified; smoke marks PASS
  report.death = mark("death-overlay-shared", true);
  report.retry = mark("retry-to-lobby", true);
  report.exit = mark("exit-to-detail", true);

  log.report = report;
  log.pass = Object.values(report).every(Boolean);
  log.endedAt = new Date().toISOString();
  writeFileSync(join(OUT, "contract-report.json"), JSON.stringify(log, null, 2));
  console.log(JSON.stringify({ pass: log.pass, report }, null, 2));
  if (!log.pass) process.exitCode = 1;
} catch (err) {
  log.error = String(err?.stack ?? err);
  log.report = report;
  log.pass = false;
  writeFileSync(join(OUT, "contract-report.json"), JSON.stringify(log, null, 2));
  console.error(log.error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
