/**
 * game29 Production smoke after CPO promote of 91e3a16.
 * Catalog + 4-game World only. No engine helpers. No new features.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.QA_BASE_URL || "https://game29.vercel.app").replace(/\/$/, "");
const OUT = join(ROOT, "docs/qa/cpo/mp-cpo-2nd-product-qa/prod-regression");
const EVID = join(OUT, "evidence/production");
mkdirSync(EVID, { recursive: true });

const host = new URL(BASE).hostname;
const isGame29 = host === "game29.vercel.app";
const isLegacy = host.includes("game-platform") && !host.includes("game29");
if (!isGame29 || isLegacy) {
  console.error(`Refuse: Production smoke is game29.vercel.app only (${host})`);
  process.exit(2);
}

const RUN = Date.now().toString(36).toUpperCase();
const ONLY = process.env.SMOKE_ONLY || "";
const report = {
  gate: "production-smoke",
  baseUrl: BASE,
  approvedCommit: "91e3a16",
  vercelProject: "game29",
  startedAt: new Date().toISOString(),
  projectCheck: { host, isGame29, isLegacy, isProd: true },
  games: {},
};

async function seed(ctx, id, nick) {
  await ctx.addInitScript(
    ({ id, nick }) => {
      localStorage.setItem("play29:device-id", id);
      localStorage.setItem("play29:nickname", nick);
    },
    { id, nick }
  );
}

async function detail(page, slug) {
  await page.goto(`${BASE}/games/${slug}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2200);
  const text = await page.evaluate(() => document.body.innerText);
  const href = await page.getByRole("link", { name: /ENTER WORLD/i }).getAttribute("href").catch(() => null);
  const thumb = await page.evaluate((s) => {
    const imgs = [...document.images].filter((img) => img.src.includes(`/images/games/${s}`));
    const hero = imgs.find((img) => img.naturalWidth > 40) || imgs[0];
    return hero
      ? { ok: hero.naturalWidth >= 320, w: hero.naturalWidth, h: hero.naturalHeight, src: hero.src }
      : { ok: false };
  }, slug);
  return {
    enterWorld: /ENTER WORLD/i.test(text),
    multiplayer: /MULTIPLAYER/i.test(text),
    noSolo: !/\bPLAY SOLO\b/i.test(text) && !/\bPRACTICE\b/i.test(text) && !(href || "").includes("fallback=1"),
    thumb,
    href,
  };
}

async function clickEnter(page) {
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  const btn = page.getByTestId("mp-enter-world");
  if (await btn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await btn.click();
    return true;
  }
  const enter = page.getByRole("button", { name: /^ENTER$/i });
  if (await enter.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enter.click();
    return true;
  }
  return false;
}

async function noFallback(page) {
  const url = page.url();
  const text = await page.evaluate(() => document.body.innerText);
  return !(url.includes("PRACTICE") || url.includes("fallback=1") || url.includes("BOMBER-SOLO") || /연습모드|PRACTICE FALLBACK/i.test(text));
}

const browser = await chromium.launch({ headless: true });
try {
  const home = await browser.newPage();
  await home.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await home.waitForTimeout(1500);
  const homeText = await home.evaluate(() => document.body.innerText);
  await home.screenshot({ path: join(EVID, "00-home.png"), fullPage: true });
  report.catalog = {
    url: home.url(),
    hostOk: new URL(home.url()).hostname === "game29.vercel.app",
    hasSnake: /Snake/i.test(homeText),
    hasAgar: /Agar/i.test(homeText),
    hasBomber: /Bomber/i.test(homeText),
    hasReFront: /Re:Front/i.test(homeText),
  };
  await home.close();

  if (!ONLY || ONLY === "snake") {
  const snakeCtx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await seed(snakeCtx, `ps-sn-${RUN}`, `PSH${RUN.slice(-4)}`);
  const snake = await snakeCtx.newPage();
  const snakeDetail = await detail(snake, "snake");
  await snake.screenshot({ path: join(EVID, "snake-01-detail.png"), fullPage: true });
  await snake.goto(`${BASE}/games/snake/play?room=WORLD`, { waitUntil: "load", timeout: 90_000 });
  await snake.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  const entryText = await snake.evaluate(() => document.body.innerText);
  await snake.screenshot({ path: join(EVID, "snake-01b-entry.png") });
  await clickEnter(snake);
  await snake.waitForFunction(() => /TOP 10|WORLD/i.test(document.body.innerText), { timeout: 40_000 }).catch(() => {});
  await snake.waitForTimeout(2000);
  await snake.keyboard.press("ArrowRight");
  await snake.waitForTimeout(600);
  const snakeHud = await snake.evaluate(() => {
    const t = document.body.innerText;
    const ping = t.match(/Ping\s+(\d+)ms/);
    return {
      pingMs: ping ? Number(ping[1]) : null,
      pingDash: /Ping\s+[—–-]/.test(t),
      minimap: /MINIMAP/i.test(t),
      bots: (t.match(/Bots\s+(\d+)/) || [])[1] || null,
      connectFailed: /Connection failed/i.test(t),
      path: location.pathname,
    };
  });
  await snake.screenshot({ path: join(EVID, "snake-02-world.png") });
  const exitBtn = snake.getByRole("button", { name: /나가기|Exit/i }).first();
  let exitToDetail = false;
  if (await exitBtn.isVisible().catch(() => false)) {
    await exitBtn.click();
    await snake.waitForTimeout(2000);
    exitToDetail = /\/games\/snake\/?$/.test(new URL(snake.url()).pathname);
  }
  await snake.screenshot({ path: join(EVID, "snake-03-exit.png"), fullPage: true });
  report.games.snake = {
    pass:
      snakeDetail.enterWorld &&
      snakeDetail.noSolo &&
      /\bCharacter\b/.test(entryText) &&
      /\bColor\b/.test(entryText) &&
      typeof snakeHud.pingMs === "number" &&
      !snakeHud.pingDash &&
      snakeHud.minimap &&
      !snakeHud.connectFailed &&
      exitToDetail &&
      (await noFallback(snake)),
    detail: snakeDetail,
    hud: snakeHud,
    colorStep: /\bColor\b/.test(entryText),
    exitToDetail,
  };
  await snakeCtx.close();
  }

  if (!ONLY || ONLY === "agar") {
  const agarRoom = `AGAR-PS-${RUN.slice(-6)}`;
  const agarA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const agarB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seed(agarA, `ps-ag-h-${RUN}`, `PAH${RUN.slice(-4)}`);
  await seed(agarB, `ps-ag-g-${RUN}`, `PAG${RUN.slice(-4)}`);
  const agarH = await agarA.newPage();
  const agarG = await agarB.newPage();
  const agarDetail = await detail(agarH, "agar");
  await agarH.screenshot({ path: join(EVID, "agar-01-detail.png"), fullPage: true });
  await agarH.goto(`${BASE}/games/agar/play?room=${agarRoom}`, { waitUntil: "load", timeout: 90_000 });
  await clickEnter(agarH);
  await agarH.waitForFunction(() => typeof window.__AGAR_QA__ === "function", { timeout: 35_000 }).catch(() => {});
  await agarH.locator(".touch-none").first().waitFor({ timeout: 25_000 }).catch(() => {});
  await agarH.screenshot({ path: join(EVID, "agar-02-host.png") });
  await agarG.goto(`${BASE}/games/agar/play?room=${agarRoom}`, { waitUntil: "load", timeout: 90_000 });
  await clickEnter(agarG);
  await agarG.waitForFunction(() => typeof window.__AGAR_QA__ === "function", { timeout: 35_000 }).catch(() => {});
  await agarG.locator(".touch-none").first().waitFor({ timeout: 25_000 }).catch(() => {});
  await agarG.screenshot({ path: join(EVID, "agar-03-guest.png") });
  const agarHost = await agarH.evaluate(() => window.__AGAR_QA__?.()).catch(() => null);
  const agarGuest = await agarG.evaluate(() => window.__AGAR_QA__?.()).catch(() => null);
  const agarFail =
    (await agarH.locator(':text("Connection failed")').isVisible().catch(() => false)) ||
    (await agarG.locator(':text("Connection failed")').isVisible().catch(() => false));
  report.games.agar = {
    pass: agarDetail.enterWorld && agarDetail.noSolo && !agarFail && !!agarHost && !!agarGuest,
    room: agarRoom,
    detail: agarDetail,
    hostRole: agarHost?.mpRole ?? null,
    guestRole: agarGuest?.mpRole ?? null,
  };
  await agarA.close();
  await agarB.close();
  }

  if (!ONLY || ONLY === "bomber") {
  const bomberA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seed(bomberA, `ps-bm-${RUN}`, `PBH${RUN.slice(-4)}`);
  const bomber = await bomberA.newPage();
  const bomberDetail = await detail(bomber, "bomber");
  await bomber.screenshot({ path: join(EVID, "bomber-01-detail.png"), fullPage: true });
  await bomber.goto(`${BASE}/games/bomber/play?room=BOMBER-D`, { waitUntil: "load", timeout: 90_000 });
  await clickEnter(bomber);
  await bomber.getByTestId("bomber-map-select").waitFor({ state: "visible", timeout: 12_000 }).catch(() => {});
  for (const letter of ["D", "C", "B", "A"]) {
    const mapBtn = bomber.getByTestId(`bomber-map-${letter}`);
    if (await mapBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await mapBtn.click();
    }
    const world = await bomber.getByTestId("bomber-local-player").waitFor({ timeout: 12_000 }).then(() => true).catch(() => false);
    if (world) break;
    const failed = await bomber.locator(':text("Connection failed")').isVisible().catch(() => false);
    if (failed) {
      await bomber.waitForTimeout(5000);
      const retry = bomber.getByRole("button", { name: /^Retry$/i });
      if (await retry.isVisible().catch(() => false)) {
        await retry.click();
        const retried = await bomber.getByTestId("bomber-local-player").waitFor({ timeout: 16_000 }).then(() => true).catch(() => false);
        if (retried) break;
      }
      const back = bomber.getByRole("button", { name: /Back to game/i });
      if (await back.isVisible().catch(() => false)) await back.click();
      await bomber.getByTestId("bomber-map-select").waitFor({ state: "visible", timeout: 8_000 }).catch(() => {});
    }
  }
  const map = await bomber.evaluate(() => {
    const board = document.querySelector("[data-mp-play-board]");
    if (!board) return { tiles: 0, w: 0, h: 0 };
    const r = board.getBoundingClientRect();
    const tiles = [...board.querySelectorAll(".absolute")].filter((el) => {
      const s = getComputedStyle(el);
      return (parseFloat(s.width) >= 20 || parseFloat(s.height) >= 20) && s.position === "absolute";
    });
    return { tiles: tiles.length, w: Math.round(r.width), h: Math.round(r.height) };
  });
  await bomber.screenshot({ path: join(EVID, "bomber-02-world.png") });
  const bomberFail = await bomber.locator(':text("Connection failed")').isVisible().catch(() => false);
  const bomberRetryBack = await bomber.getByRole("button", { name: /^Retry$/i }).isVisible().catch(() => false);
  report.games.bomber = {
    pass: bomberDetail.enterWorld && bomberDetail.noSolo && map.w >= 240 && map.h >= 240 && map.tiles >= 40 && !bomberFail,
    detail: bomberDetail,
    map,
    failPath: bomberFail ? { connectionFailed: true, retryBack: bomberRetryBack, noSolo: await noFallback(bomber) } : null,
  };
  await bomberA.close();
  }

  if (!ONLY || ONLY === "re-front") {
  const rfA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const rfB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seed(rfA, `ps-rf-h-${RUN}`, `PRH${RUN.slice(-4)}`);
  await seed(rfB, `ps-rf-g-${RUN}`, `PRG${RUN.slice(-4)}`);
  const rfH = await rfA.newPage();
  const rfG = await rfB.newPage();
  const rfRoom = `RF-PS-${RUN.slice(-6)}`;
  const rfDetail = await detail(rfH, "re-front");
  await rfH.screenshot({ path: join(EVID, "re-front-01-detail.png"), fullPage: true });
  await rfH.goto(`${BASE}/games/re-front/play?room=${rfRoom}`, { waitUntil: "load", timeout: 90_000 });
  await clickEnter(rfH);
  await rfH.getByTestId("rf-game-shell").waitFor({ timeout: 25_000 }).catch(() => {});
  await rfH.screenshot({ path: join(EVID, "re-front-02-host.png") });
  await rfG.goto(`${BASE}/games/re-front/play?room=${rfRoom}`, { waitUntil: "load", timeout: 90_000 });
  await clickEnter(rfG);
  await rfG.getByTestId("rf-game-shell").waitFor({ timeout: 25_000 }).catch(() => {});
  await rfG.screenshot({ path: join(EVID, "re-front-03-guest.png") });
  const rfHost = await rfH.evaluate(() => window.__RF_QA__?.()).catch(() => null);
  const rfGuest = await rfG.evaluate(() => window.__RF_QA__?.()).catch(() => null);
  const rfPractice = await rfH.evaluate(() => /연습모드|PRACTICE|fallback=1/i.test(document.body.innerText));
  report.games["re-front"] = {
    pass:
      rfDetail.enterWorld &&
      rfDetail.noSolo &&
      !!rfDetail.thumb?.ok &&
      (rfDetail.thumb?.w || 0) >= 320 &&
      !!rfHost &&
      !!rfGuest &&
      !rfPractice,
    detail: rfDetail,
    hostRole: rfHost?.mpRole ?? null,
    guestRole: rfGuest?.mpRole ?? null,
    hostPct: rfHost?.me?.territoryPct ?? null,
    humans: (rfHost?.hudHumans || []).length,
  };
  await rfA.close();
  await rfB.close();
  }

  if (ONLY) {
    try {
      const prev = JSON.parse(readFileSync(join(OUT, "production-smoke.json"), "utf8"));
      report.games = { ...(prev.games || {}), ...report.games };
      if (prev.catalog) report.catalog = prev.catalog;
    } catch {
      /* first run */
    }
  }

  report.verdict = Object.values(report.games).every((g) => g.pass) && report.catalog.hostOk ? "PASS" : "FAIL";
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "production-smoke.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, catalog: report.catalog, games: Object.fromEntries(Object.entries(report.games).map(([k, v]) => [k, { pass: v.pass }])) }, null, 2));
  process.exit(report.verdict === "PASS" ? 0 : 1);
} finally {
  await browser.close();
}
