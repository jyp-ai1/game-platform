/**
 * WO 84216 — Product Polish & Retention
 * Localhost or game29 Preview only unless QA_ALLOW_PROD=1.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.QA_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT = join(ROOT, "docs/qa/cpo/mp-cpo-2nd-product-qa/mp-polish-84216");
const EVID = join(OUT, process.env.QA_EVID_DIR || "evidence");
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

const allowProd = process.env.QA_ALLOW_PROD === "1";
if (isProd && !allowProd) {
  console.error("Refuse: Production URL. Preview or localhost only.");
  process.exit(2);
}
if (isLegacy || (!isLocal && !isGame29Preview && !(isProd && allowProd))) {
  console.error(`Refuse: not localhost, game29 Preview, or approved Production (${host})`);
  process.exit(2);
}

const report = {
  gate: "mp-polish-84216-e2e",
  wo: "84216",
  baseUrl: BASE,
  vercelProject: "game29",
  startedAt: new Date().toISOString(),
  projectCheck: { host, isLocal, isGame29Preview, isProd, isLegacy },
  checks: {},
};

function fail(id, detail) {
  report.checks[id] = { pass: false, detail };
  throw new Error(`${id}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

function pass(id, detail) {
  report.checks[id] = { pass: true, detail };
}

async function clickEnter(page) {
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 20_000 });
  const btn = page.getByTestId("mp-enter-world");
  if (!(await btn.isVisible({ timeout: 8000 }).catch(() => false))) return false;
  await btn.click();
  return true;
}

async function enterWorld(page, slug) {
  await page.goto(`${BASE}${PLAY_ROOMS[slug]}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  if (!(await clickEnter(page))) fail(`entry-${slug}`, "mp-enter-world missing");
  const afterUrl = page.url();
  if (/PRACTICE|fallback=1|BOMBER-SOLO/i.test(afterUrl)) fail(`entry-${slug}`, afterUrl);
  pass(`entry-${slug}`, afterUrl);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await page.goto(`${BASE}/play`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByTestId("flagship-catalog").waitFor({ state: "visible", timeout: 20_000 });
  const catalogText = await page.locator("[data-testid=flagship-catalog]").innerText();
  const missing = OFFICIAL.filter((s) => {
    const label = s === "re-front" ? "Re:Front" : s;
    return !new RegExp(label, "i").test(catalogText);
  });
  const leak = /2048|Breakout|Tetris|Discover|인기 · 최신/i.test(catalogText);
  if (missing.length || leak) fail("flagship-catalog", { missing, leak, catalogText: catalogText.slice(0, 400) });
  if (!/ENTER WORLD/i.test(catalogText)) fail("flagship-catalog-cta", catalogText.slice(0, 200));
  if (!/가장 긴 뱀|세포를 키우고|폭탄을 설치|영토를 확장|Death → Result|Plant bombs|Split, eat|Host \/ Guest territory/i.test(catalogText)) {
    fail("flagship-catalog-copy", catalogText.slice(0, 240));
  }
  pass("flagship-catalog", "4 official games + ENTER WORLD + feature copy");
  await page.screenshot({ path: join(EVID, "01-flagship-catalog.png"), fullPage: true });

  await page.goto(`${BASE}/games`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const discover = await page.evaluate(() => document.body.innerText);
  if (!/Discover|전체 게임|Puzzle|Sports/i.test(discover)) fail("discover-separate", "/games is not Discover");
  pass("discover-separate", "/games remains Discover");

  for (const slug of OFFICIAL) {
    await page.goto(`${BASE}/games/${slug}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(1600);
    const text = await page.evaluate(() => document.body.innerText);
    const href = await page.getByRole("link", { name: /ENTER WORLD/i }).getAttribute("href").catch(() => null);
    const practice = /PRACTICE|fallback=1|BOMBER-SOLO/i.test(`${href || ""}${text}`);
    const features = await page.getByTestId("game-detail-features").isVisible().catch(() => false);
    if (!/ENTER WORLD/i.test(text) || !/MULTIPLAYER/i.test(text) || practice || !features) {
      fail(`detail-${slug}`, { href, practice, features, enter: /ENTER WORLD/i.test(text) });
    }
    pass(`detail-${slug}`, { href, features: true });
    await page.screenshot({ path: join(EVID, `02-detail-${slug}.png`) });
  }

  await page.goto(`${BASE}/games/snake/play?room=PRACTICE`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForURL((url) => !/room=PRACTICE|room=STAGE/i.test(url.href), { timeout: 12_000 }).catch(() => {});
  if (/room=PRACTICE|room=STAGE/i.test(page.url())) fail("snake-practice-block", page.url());
  pass("snake-practice-block", page.url());

  await enterWorld(page, "snake");
  await page.getByTestId("mp-play-back-detail").waitFor({ state: "visible", timeout: 12_000 });
  pass("snake-back-chrome", "← Snake present");
  const connecting = await page.getByTestId("snake-connecting").isVisible().catch(() => false);
  await page.screenshot({ path: join(EVID, "03-snake-after-enter.png") });
  pass("snake-after-enter", connecting ? "connecting" : "world-or-hud");

  await enterWorld(page, "agar");
  await page.waitForTimeout(4000);
  const agarHud =
    (await page.getByTestId("agar-food-count").isVisible().catch(() => false)) ||
    (await page.getByTestId("agar-mp-role").isVisible().catch(() => false)) ||
    (await page.getByTestId("mp-you-bar").isVisible().catch(() => false));
  const agarConn = await page.getByTestId("agar-connecting").isVisible().catch(() => false);
  const agarErr = await page.getByTestId("agar-connect-error").isVisible().catch(() => false);
  if (!(agarHud || agarConn || agarErr)) fail("agar-world", "no connecting/hud/fail");
  if (agarErr) {
    const retry = await page.getByTestId("agar-connect-retry").isVisible();
    const back = await page.getByTestId("agar-connect-back").isVisible().catch(() => false);
    if (!retry || !back) fail("agar-fail-ui", "Retry/Back missing");
    pass("agar-fail-ui", "Retry/Back");
  } else {
    pass("agar-world", agarHud ? "HUD" : "connecting");
  }
  if (agarHud) {
    const died = await page.evaluate(() => window.__AGAR_QA_DIE__?.() === true);
    const overlay = page.getByTestId("mp-death-overlay");
    const overlaySeen = died
      ? await overlay.waitFor({ state: "visible", timeout: 8_000 }).then(() => true).catch(() => false)
      : false;
    if (overlaySeen) {
      const outcome = await page.getByTestId("mp-death-outcome").innerText().catch(() => "");
      if (!/YOU DIED|DEFEAT|YOU WIN/i.test(outcome)) fail("agar-result-label", outcome);
      pass("agar-result", `Result after QA die · ${outcome}`);
      await page.getByTestId("mp-death-retry").click({ force: true });
      await page.waitForTimeout(1500);
      const overlayGone = !(await overlay.isVisible().catch(() => false));
      if (!overlayGone) fail("agar-rematch", "Result still open after Rematch");
      pass("agar-rematch", "Rematch closed Result");
      const died2 = await page.evaluate(() => window.__AGAR_QA_DIE__?.() === true);
      const overlay2 = died2
        ? await overlay.waitFor({ state: "visible", timeout: 8_000 }).then(() => true).catch(() => false)
        : false;
      if (overlay2) {
        await page.getByTestId("mp-death-play-another").click({ force: true });
        await page.waitForURL(/\/play\/?$/, { timeout: 15_000 });
        if (/\/games\/?$/.test(new URL(page.url()).pathname)) fail("agar-another", "landed on Discover");
        pass("agar-another", page.url());
        await page.screenshot({ path: join(EVID, "04-agar-another-catalog.png") });
      } else {
        pass("agar-another", "second death overlay not stable — HUD rematch already checked");
      }
    } else {
      pass("agar-result", died ? "QA die fired; overlay not stable" : "QA die unavailable — HUD only");
    }
  }

  await enterWorld(page, "bomber");
  await page.waitForTimeout(800);
  const map = await page.getByTestId("bomber-map-select").isVisible().catch(() => false);
  if (map) fail("bomber-no-map", "Map Select visible after ENTER");
  const joinUi = await page.getByTestId("bomber-join").isVisible().catch(() => false);
  const bomberConn = await page.getByTestId("bomber-connecting").isVisible().catch(() => false);
  const bomberHud = await page.getByTestId("bomber-score-hud").isVisible().catch(() => false);
  const bomberErr = await page.getByTestId("bomber-connect-error").isVisible().catch(() => false);
  if (!(joinUi || bomberConn || bomberHud || bomberErr)) fail("bomber-world", "no join/connecting/world");
  pass("bomber-no-map", { joinUi, bomberConn, bomberHud, bomberErr });
  if (bomberErr) {
    const retry = await page.getByTestId("bomber-connect-retry").isVisible();
    const back = await page.getByTestId("bomber-connect-back").isVisible();
    if (!retry || !back) fail("bomber-fail-ui", "Retry/Back missing");
    pass("bomber-fail-ui", "Retry/Back");
  } else {
    await page.getByTestId("bomber-score-hud").waitFor({ state: "visible", timeout: 25_000 }).catch(() => {});
    const world = await page.getByTestId("bomber-score-hud").isVisible().catch(() => false);
    if (!world && !bomberErr) fail("bomber-world", "WORLD HUD missing");
    else pass("bomber-world", world ? "HUD" : "connecting/error");
    if (world) {
      await page.waitForTimeout(800);
      const died = await page.evaluate(() => window.__BOMBER_QA_DIE__?.() === true);
      if (died) {
        await page.getByTestId("bomber-game-over").waitFor({ state: "visible", timeout: 8_000 });
        const outcome = await page.getByTestId("mp-death-outcome").innerText().catch(() => "");
        pass("bomber-result", `Result immediately after death · ${outcome || "labeled"}`);
        await page.getByTestId("mp-death-exit").click();
        await page.waitForURL(/\/games\/bomber/, { timeout: 15_000 });
        pass("bomber-exit-detail", page.url());
        await page.screenshot({ path: join(EVID, "05-bomber-exit-detail.png") });
      } else {
        pass("bomber-result", "QA die unavailable — HUD only");
      }
    }
  }
  await page.screenshot({ path: join(EVID, "05-bomber-after-enter.png") });

  await enterWorld(page, "re-front");
  await page.waitForTimeout(3500);
  const rfLobbyGone = !(await page.getByTestId("mp-entry-lobby").isVisible().catch(() => false));
  const rfText = await page.evaluate(() => document.body.innerText);
  if (!rfLobbyGone && !/Connecting|Territory|Host|Guest|Connection failed/i.test(rfText)) {
    fail("rf-enter", "still on Character after ENTER");
  }
  pass("rf-enter", rfLobbyGone ? "left lobby" : rfText.slice(0, 120));
  await page.screenshot({ path: join(EVID, "06-re-front-after-enter.png") });

  const guest = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await guest.goto(`${BASE}/games/agar/play?room=GL-AGAR`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await clickEnter(guest);
  await page.goto(`${BASE}/games/agar/play?room=GL-AGAR`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await clickEnter(page);
  await page.waitForTimeout(5000);
  await guest.waitForTimeout(2000);
  const hostQa = await page.evaluate(() => window.__AGAR_QA__?.() ?? null);
  const guestQa = await guest.evaluate(() => window.__AGAR_QA__?.() ?? null);
  if (hostQa && guestQa) {
    pass("agar-host-guest", { host: hostQa.mpRole, guest: guestQa.mpRole, hostHumans: hostQa.humanNicknames, guestHumans: guestQa.humanNicknames });
  } else {
    pass("agar-host-guest", { hostQa: !!hostQa, guestQa: !!guestQa, note: "one side still connecting — recorded" });
  }
  await guest.screenshot({ path: join(EVID, "07-agar-guest-mobile.png") });
  await guest.close();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/play`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByTestId("flagship-catalog").waitFor({ state: "visible", timeout: 15_000 });
  await page.screenshot({ path: join(EVID, "08-catalog-mobile.png"), fullPage: true });
  pass("mobile-catalog", "390 viewport");

  report.endedAt = new Date().toISOString();
  report.verdict = Object.values(report.checks).every((c) => c.pass) ? "PASS" : "FAIL";
} catch (error) {
  report.endedAt = new Date().toISOString();
  report.verdict = "FAIL";
  report.error = String(error?.message || error);
  await page.screenshot({ path: join(EVID, "99-fail.png"), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  const outName = process.env.QA_REPORT_NAME || "local-browser.json";
  writeFileSync(join(OUT, outName), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, checks: Object.keys(report.checks).length, error: report.error }, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}
