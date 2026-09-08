/**
 * Multiplayer Productization E2E — official 4-game contract.
 * Localhost or game29 Preview only. Never Production.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.QA_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT = join(ROOT, "docs/qa/cpo/mp-cpo-2nd-product-qa/multiplayer-productization");
const EVID = join(OUT, "evidence");
mkdirSync(EVID, { recursive: true });

const OFFICIAL = ["snake", "agar", "bomber", "re-front"];
const PLAY_ROOMS = {
  snake: "/games/snake/play?room=WORLD",
  agar: "/games/agar/play?room=GL-AGAR",
  bomber: "/games/bomber/play?room=BOMBER-A",
  "re-front": "/games/re-front/play?room=RF-LOBBY",
};

const host = new URL(BASE).hostname;
const isLocal = host === "localhost" || host === "127.0.0.1";
const isProd = host === "game29.vercel.app";
const isLegacy = host.includes("game-platform") && !host.includes("game29");
const isGame29Preview = host.includes("game29") && host.includes("vercel.app") && !isProd;

if (isProd) {
  console.error("Refuse: Production URL. Preview or localhost only.");
  process.exit(2);
}
if (isLegacy || (!isLocal && !isGame29Preview)) {
  console.error(`Refuse: not localhost or game29 Preview (${host})`);
  process.exit(2);
}

const report = {
  gate: "multiplayer-productization-e2e",
  baseUrl: BASE,
  vercelProject: "game29",
  productionDeployed: false,
  productionShaHeld: "43f6270",
  startedAt: new Date().toISOString(),
  projectCheck: { host, isLocal, isGame29Preview, isProd, isLegacy },
  checks: {},
};

function fail(id, detail) {
  report.checks[id] = { pass: false, detail };
  throw new Error(`${id}: ${detail}`);
}

function pass(id, detail) {
  report.checks[id] = { pass: true, detail };
}

async function clickEnter(page) {
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 20_000 });
  const btn = page.getByTestId("mp-enter-world");
  if (await btn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await btn.click();
    return true;
  }
  return false;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${BASE}/play`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByTestId("flagship-catalog").waitFor({ state: "visible", timeout: 20_000 });
  const catalogText = await page.locator("[data-testid=flagship-catalog]").innerText();
  const missing = OFFICIAL.filter((s) => {
    const label = s === "re-front" ? "Re:Front" : s;
    return !new RegExp(label, "i").test(catalogText);
  });
  const leak = /2048|Breakout|Tetris|Discover|인기 · 최신/i.test(catalogText);
  if (missing.length || leak) fail("flagship-catalog", JSON.stringify({ missing, leak, catalogText: catalogText.slice(0, 400) }));
  pass("flagship-catalog", "4 official games only on /play");
  await page.screenshot({ path: join(EVID, "01-flagship-catalog.png"), fullPage: true });

  await page.goto(`${BASE}/games`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const discover = await page.evaluate(() => document.body.innerText);
  if (!/Discover|전체 게임|Puzzle|Sports/i.test(discover)) {
    fail("discover-separate", " /games is not Discover");
  }
  pass("discover-separate", "/games remains Discover, not ANOTHER GAME landing");

  for (const slug of OFFICIAL) {
    await page.goto(`${BASE}/games/${slug}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(1800);
    const text = await page.evaluate(() => document.body.innerText);
    const href = await page.getByRole("link", { name: /ENTER WORLD/i }).getAttribute("href").catch(() => null);
    const practice = /PRACTICE|fallback=1|BOMBER-SOLO/i.test(`${href || ""}${text}`);
    if (!/ENTER WORLD/i.test(text) || !/MULTIPLAYER/i.test(text) || practice) {
      fail(`detail-${slug}`, JSON.stringify({ href, practice, enter: /ENTER WORLD/i.test(text) }));
    }
    pass(`detail-${slug}`, href || "ENTER WORLD");
    await page.screenshot({ path: join(EVID, `02-detail-${slug}.png`) });

    await page.goto(`${BASE}${PLAY_ROOMS[slug]}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const entered = await clickEnter(page);
    if (!entered) fail(`entry-${slug}`, "mp-enter-world missing");
    const afterUrl = page.url();
    if (/PRACTICE|fallback=1|BOMBER-SOLO/i.test(afterUrl)) fail(`entry-${slug}`, afterUrl);
    pass(`entry-${slug}`, afterUrl);

    if (slug === "bomber") {
      await page.waitForTimeout(800);
      const map = await page.getByTestId("bomber-map-select").isVisible().catch(() => false);
      const joinUi = await page.getByTestId("bomber-join").isVisible().catch(() => false);
      const connecting = await page.getByTestId("bomber-connecting").isVisible().catch(() => false);
      const hud = await page.getByTestId("bomber-score-hud").isVisible().catch(() => false);
      const err = await page.getByTestId("bomber-connect-error").isVisible().catch(() => false);
      if (map) fail("bomber-no-map", "Map Select visible after ENTER");
      if (!(joinUi || connecting || hud || err)) fail("bomber-no-map", "no join/connecting/world");
      pass("bomber-no-map", { joinUi, connecting, hud, err });
      if (err) {
        const retry = await page.getByTestId("bomber-connect-retry").isVisible().catch(() => false);
        const back = await page.getByTestId("bomber-connect-back").isVisible().catch(() => false);
        if (!retry || !back) fail("bomber-fail-ui", "Connection failed missing Retry/Back");
        pass("bomber-fail-ui", "Retry/Back present");
      } else {
        await page.getByTestId("bomber-score-hud").waitFor({ state: "visible", timeout: 25_000 }).catch(() => {});
        const world = await page.getByTestId("bomber-score-hud").isVisible().catch(() => false);
        if (!world && !err) fail("bomber-world", "WORLD HUD missing");
        else pass("bomber-world", world ? "HUD" : "connecting/error");
      }
      await page.screenshot({ path: join(EVID, "03-bomber-after-enter.png") });
    }
  }

  report.endedAt = new Date().toISOString();
  report.verdict = Object.values(report.checks).every((c) => c.pass) ? "PASS" : "FAIL";
} catch (error) {
  report.endedAt = new Date().toISOString();
  report.verdict = "FAIL";
  report.error = String(error?.message || error);
} finally {
  await browser.close();
  writeFileSync(join(OUT, "e2e-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, checks: Object.keys(report.checks).length, error: report.error }, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}
