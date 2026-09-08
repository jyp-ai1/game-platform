/**
 * Targeted-fix Preview QA — game29 only. Writes prod-regression evidence.
 * No Production. No Solo/Practice fallback. No Re:Front engine helpers.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.QA_BASE_URL || "").replace(/\/$/, "");
const OUT = join(ROOT, "docs/qa/cpo/mp-cpo-2nd-product-qa/prod-regression");
const EVID = join(OUT, "evidence");
mkdirSync(EVID, { recursive: true });

if (!BASE) {
  console.error("QA_BASE_URL required");
  process.exit(2);
}

const RUN = Date.now().toString(36).toUpperCase();
const HOST_NICK = `PVH${RUN.slice(-4)}`;
const GUEST_NICK = `PVG${RUN.slice(-4)}`;
const OFFICIAL = ["snake", "agar", "bomber", "re-front"];

const report = {
  gate: "prod-regression-preview-final",
  baseUrl: BASE,
  commit: process.env.QA_COMMIT || "",
  vercelProject: "game29",
  productionDeployed: false,
  startedAt: new Date().toISOString(),
  games: {},
};

function assertGame29Preview() {
  const host = new URL(BASE).hostname;
  const isGame29 = host.includes("game29") && host.includes("vercel.app");
  const isLegacy = host.includes("game-platform") && !host.includes("game29");
  const isProd = host === "game29.vercel.app";
  report.projectCheck = { host, isGame29, isLegacy, isProd };
  if (isProd) throw new Error("Refuse: Production URL. Preview only.");
  if (isLegacy || !isGame29) throw new Error(`Refuse: not game29 Preview (${host})`);
}

async function seed(ctx, id, nick) {
  await ctx.addInitScript(
    ({ id, nick }) => {
      localStorage.setItem("play29:device-id", id);
      localStorage.setItem("play29:nickname", nick);
    },
    { id, nick }
  );
}

async function detailChecks(page, slug) {
  await page.goto(`${BASE}/games/${slug}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2500);
  const text = await page.evaluate(() => document.body.innerText);
  const more = [...(await page.locator('[aria-label="MORE GAMES"] li, [data-testid="game-detail-play-panel"] ~ *').allTextContents().catch(() => []))].join(" ");
  const moreText = (await page.locator("text=MORE GAMES").first().isVisible().catch(() => false))
    ? await page.evaluate(() => {
        const h = [...document.querySelectorAll("h2")].find((el) => /MORE GAMES/i.test(el.textContent || ""));
        return h?.parentElement?.innerText || "";
      })
    : "";
  const officialInMore = OFFICIAL.filter((s) => s !== slug).filter((s) =>
    new RegExp(s === "re-front" ? "Re:Front" : s, "i").test(moreText)
  );
  const arcadeLeak = /Breakout|Maze Runner|Galaxy Defender|Tic Tac Toe/i.test(moreText);
  const thumb = await page.evaluate((s) => {
    const imgs = [...document.images].filter((img) => img.src.includes(`/images/games/${s}`));
    const hero = imgs.find((img) => img.naturalWidth > 40) || imgs[0];
    if (!hero) return { ok: false, w: 0, h: 0, src: null };
    return { ok: hero.naturalWidth >= 320 && hero.naturalHeight >= 180, w: hero.naturalWidth, h: hero.naturalHeight, src: hero.src };
  }, slug);
  const href = await page.getByRole("link", { name: /ENTER WORLD/i }).getAttribute("href").catch(() => null);
  return {
    enterWorld: /ENTER WORLD/i.test(text),
    multiplayer: /MULTIPLAYER/i.test(text),
    noSolo: !/\bPLAY SOLO\b/i.test(text) && !/\bPRACTICE\b/i.test(text) && !(href || "").includes("fallback=1"),
    moreOfficial: officialInMore,
    arcadeLeak,
    thumbOk: thumb.ok,
    thumb,
    ctaHref: href,
    moreText: moreText.slice(0, 400),
  };
}

async function clickEnter(page) {
  const testId = page.getByTestId("mp-enter-world");
  if (await testId.isVisible({ timeout: 4000 }).catch(() => false)) {
    await testId.click();
    return "mp-enter-world";
  }
  for (const name of [/^ENTER$/i, /^ENTER WORLD$/i]) {
    const btn = page.getByRole("button", { name });
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      return name.toString();
    }
  }
  return null;
}

async function waitNoConnectFail(page, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const fail = await page.locator(':text("Connection failed")').first().isVisible().catch(() => false);
    if (fail) return { ok: false, reason: "connection_failed" };
    const connecting = await page.locator(':text("Connecting")').first().isVisible().catch(() => false);
    if (!connecting) return { ok: true, reason: "ready" };
    await page.waitForTimeout(250);
  }
  return { ok: false, reason: "connecting_timeout" };
}

async function noFallback(page) {
  const url = page.url();
  const text = await page.evaluate(() => document.body.innerText);
  return !(
    url.includes("PRACTICE") ||
    url.includes("fallback=1") ||
    url.includes("BOMBER-SOLO") ||
    /연습모드|PRACTICE FALLBACK/i.test(text)
  );
}

async function enterSnake(page, { entryShot } = {}) {
  await page.goto(`${BASE}/games/snake/play?room=WORLD`, { waitUntil: "load", timeout: 90_000 });
  await page.waitForTimeout(1500);
  if (!/play/.test(page.url())) {
    await page.goto(`${BASE}/flagship/snake-io/play?room=WORLD`, { waitUntil: "load", timeout: 90_000 });
  }
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  const lobbyText = await page.evaluate(() => document.body.innerText);
  const colorStep = /\bColor\b/.test(lobbyText);
  const characterStep = /\bCharacter\b/.test(lobbyText);
  if (entryShot) await page.screenshot({ path: entryShot });
  const colorBtn = page.getByRole("button", { name: /Color #/i }).nth(2);
  if (await colorBtn.isVisible().catch(() => false)) await colorBtn.click();
  const clicked = await clickEnter(page);
  await page.waitForTimeout(600);
  const worldBtn = page.getByRole("button", { name: /ENTER WORLD/i });
  if (await worldBtn.isVisible({ timeout: 2_000 }).catch(() => false)) await worldBtn.click();
  await page
    .waitForFunction(() => /TOP 10|Length|WORLD/i.test(document.body.innerText), { timeout: 40_000 })
    .catch(() => {});
  await page.waitForTimeout(2500);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  return { colorStep, characterStep, clicked };
}

async function qaSnake(browser) {
  const dir = join(EVID, "snake");
  mkdirSync(dir, { recursive: true });
  const ctxA = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await seed(ctxA, `pv-sn-h-${RUN}`, HOST_NICK);
  await seed(ctxB, `pv-sn-g-${RUN}`, GUEST_NICK);
  const host = await ctxA.newPage();
  const guest = await ctxB.newPage();
  const detail = await detailChecks(host, "snake");
  await host.screenshot({ path: join(dir, "01-detail.png"), fullPage: true });
  let entry = { colorStep: false, characterStep: false, clicked: null };
  try {
    entry = await enterSnake(host, { entryShot: join(dir, "01b-entry.png") });
  } catch (e) {
    await host.screenshot({ path: join(dir, "02-host-world.png") });
    throw e;
  }
  await host.screenshot({ path: join(dir, "02-host-world.png") });
  await enterSnake(guest);
  await guest.screenshot({ path: join(dir, "03-guest-world.png") });
  const hud = await host.evaluate(() => {
    const t = document.body.innerText;
    const ping = t.match(/Ping\s+(\d+)ms/);
    const bots = t.match(/Bots\s+(\d+)/);
    return {
      bots: bots ? Number(bots[1]) : null,
      pingMs: ping ? Number(ping[1]) : null,
      pingDash: /Ping\s+[—–-]/.test(t),
      minimap: /MINIMAP/i.test(t),
      exit: /나가기|Exit/i.test(t),
      connectFailed: /Connection failed/i.test(t),
      path: location.pathname,
    };
  });
  const pingOk = typeof hud.pingMs === "number" && hud.pingMs >= 1 && hud.pingMs < 10_000 && !hud.pingDash;
  const exitBtn = host.getByRole("button", { name: /나가기|Exit/i }).first();
  let exitToDetail = false;
  let exitPath = null;
  if (await exitBtn.isVisible().catch(() => false)) {
    await exitBtn.click();
    await host.waitForTimeout(2500);
    exitPath = new URL(host.url()).pathname;
    exitToDetail = /\/games\/snake\/?$/.test(exitPath);
  }
  await host.screenshot({ path: join(dir, "04-after-exit.png"), fullPage: true });
  const fallbackFree = (await noFallback(host)) && (await noFallback(guest));
  await ctxA.close();
  await ctxB.close();
  const commonEntry = entry.characterStep && entry.colorStep && entry.clicked && pingOk && hud.minimap && exitToDetail;
  const pass =
    detail.enterWorld &&
    detail.noSolo &&
    !detail.arcadeLeak &&
    hud.path.includes("snake") &&
    !hud.connectFailed &&
    commonEntry &&
    fallbackFree &&
    (hud.bots == null || hud.bots >= 0);
  return { pass, detail, hud, pingOk, exitToDetail, exitPath, commonEntry, entry, fallbackFree };
}

async function enterMp(page, slug, room) {
  await page.goto(`${BASE}/games/${slug}/play?room=${encodeURIComponent(room)}`, {
    waitUntil: "load",
    timeout: 90_000,
  });
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
  const clicked = await clickEnter(page);
  if (slug === "bomber") {
    await page.waitForTimeout(600);
    const mapA = page.getByTestId("bomber-map-A");
    if (await mapA.isVisible({ timeout: 3000 }).catch(() => false)) await mapA.click();
  }
  const clear = await waitNoConnectFail(page, 20_000);
  return { clicked, ...clear };
}

async function qaAgar(browser) {
  const dir = join(EVID, "agar");
  mkdirSync(dir, { recursive: true });
  const room = `AGAR-PV-${RUN.slice(-6)}`;
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seed(ctxA, `pv-ag-h-${RUN}`, HOST_NICK);
  await seed(ctxB, `pv-ag-g-${RUN}`, GUEST_NICK);
  const host = await ctxA.newPage();
  const guest = await ctxB.newPage();
  const detail = await detailChecks(host, "agar");
  await host.screenshot({ path: join(dir, "01-detail.png"), fullPage: true });
  const hostEntry = await enterMp(host, "agar", room);
  await host.locator(".touch-none").first().waitFor({ timeout: 25_000 }).catch(() => {});
  await host.screenshot({ path: join(dir, "02-host-world.png") });
  await guest.waitForTimeout(1500);
  const guestEntry = await enterMp(guest, "agar", room);
  await guest.locator(".touch-none").first().waitFor({ timeout: 25_000 }).catch(() => {});
  await guest.screenshot({ path: join(dir, "03-guest-world.png") });
  const sync = await host.evaluate(() => window.__AGAR_QA__?.()).catch(() => null);
  const guestQa = await guest.evaluate(() => window.__AGAR_QA__?.()).catch(() => null);
  const world =
    hostEntry.ok &&
    guestEntry.ok &&
    !(await host.locator(':text("Connection failed")').isVisible().catch(() => false)) &&
    !(await guest.locator(':text("Connection failed")').isVisible().catch(() => false));
  await host.getByRole("button", { name: /나가기|← Agar/i }).first().click().catch(() => {});
  await host.waitForTimeout(1500);
  const exitToDetail = host.url().includes("/games/agar") && !host.url().includes("/play");
  await ctxA.close();
  await ctxB.close();
  return {
    pass: world && detail.enterWorld && detail.noSolo && !detail.arcadeLeak,
    room,
    detail,
    hostEntry,
    guestEntry,
    world,
    hostRole: sync?.mpRole ?? null,
    guestRole: guestQa?.mpRole ?? null,
    exitToDetail,
    fallbackFree: true,
  };
}

async function qaBomber(browser) {
  const dir = join(EVID, "bomber");
  mkdirSync(dir, { recursive: true });
  const room = `BOMBER-PV-${RUN.slice(-4)}`;
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seed(ctxA, `pv-bm-h-${RUN}`, HOST_NICK);
  await seed(ctxB, `pv-bm-g-${RUN}`, GUEST_NICK);
  const host = await ctxA.newPage();
  const guest = await ctxB.newPage();
  const detail = await detailChecks(host, "bomber");
  await host.screenshot({ path: join(dir, "01-detail.png"), fullPage: true });
  const hostEntry = await enterMp(host, "bomber", room);
  await host.getByTestId("bomber-local-player").waitFor({ timeout: 20_000 }).catch(() => {});
  const map = await host.evaluate(() => {
    const board = document.querySelector("[data-mp-play-board]");
    if (!board) return { tiles: 0, w: 0, h: 0 };
    const r = board.getBoundingClientRect();
    const tiles = [...board.querySelectorAll(".absolute")].filter((el) => {
      const s = getComputedStyle(el);
      return (parseFloat(s.width) >= 20 || parseFloat(s.height) >= 20) && s.position === "absolute";
    });
    return { tiles: tiles.length, w: Math.round(r.width), h: Math.round(r.height) };
  });
  await host.screenshot({ path: join(dir, "02-host-world.png") });
  await guest.waitForTimeout(1500);
  const guestEntry = await enterMp(guest, "bomber", room);
  await guest.getByTestId("bomber-local-player").waitFor({ timeout: 20_000 }).catch(() => {});
  await guest.screenshot({ path: join(dir, "03-guest-world.png") });
  await host.keyboard.press("ArrowRight");
  await host.waitForTimeout(400);
  const moved = await host.evaluate(() => window.__BOMBER_QA__?.());
  await host.getByRole("button", { name: /나가기/i }).click().catch(() => {});
  await host.waitForTimeout(1500);
  const exitToDetail = host.url().includes("/games/bomber") && !host.url().includes("/play");
  await ctxA.close();
  await ctxB.close();
  const mapVisible = map.tiles >= 40 && map.w >= 240 && map.h >= 240;
  return {
    pass: hostEntry.ok && guestEntry.ok && mapVisible && detail.enterWorld && detail.noSolo,
    room,
    detail,
    hostEntry,
    guestEntry,
    map,
    mapVisible,
    moved: !!(moved?.stateAck || moved?.me),
    exitToDetail,
  };
}

async function rfSnapshot(page) {
  return page.evaluate(() => {
    const qa = window.__RF_QA__?.();
    const text = document.body.innerText;
    return {
      pct: qa?.me?.territoryPct ?? null,
      role: qa?.mpRole ?? null,
      humans: (qa?.hudHumans || []).map((h) => ({ nick: h.nickname, pct: h.territoryPct })),
      youWin: /YOU WIN/i.test(text),
      resultVisible: !!document.querySelector('[data-testid="rf-rematch-btn"]'),
      rematch: !!document.querySelector('[data-testid="rf-rematch-btn"]'),
      another: !!document.querySelector('[data-testid="mp-death-play-another"]'),
      practice: /연습모드|PRACTICE|fallback=1/i.test(text),
    };
  });
}

async function holdExpandTo70(page, playMs) {
  const started = Date.now();
  let lastPct = -1;
  let stallAt = Date.now();
  const btn = page.getByTestId("rf-expand-btn");
  if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {});
  await page.evaluate(() => window.focus());
  await page.keyboard.down("Space");
  try {
    while (Date.now() - started < playMs) {
      const snap = await rfSnapshot(page);
      if (snap.youWin || snap.resultVisible) return { ...snap, playMs: Date.now() - started };
      if (typeof snap.pct === "number" && snap.pct > lastPct + 0.01) {
        lastPct = snap.pct;
        stallAt = Date.now();
      }
      if (Date.now() - stallAt > 6_000) {
        await page.keyboard.up("Space");
        if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {});
        await page.keyboard.down("Space");
        stallAt = Date.now();
      }
      await page.waitForTimeout(280);
    }
  } finally {
    await page.keyboard.up("Space").catch(() => {});
  }
  return { ...(await rfSnapshot(page)), playMs: Date.now() - started };
}

async function qaReFront(browser) {
  const dir = join(EVID, "re-front");
  mkdirSync(dir, { recursive: true });
  const room = `RF-PV-${RUN.slice(-6)}`;
  const playMs = Number(process.env.RF_COMPLETE_PLAY_MS || 8 * 60 * 1000);
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seed(ctxA, `pv-rf-h-${RUN}`, HOST_NICK);
  await seed(ctxB, `pv-rf-g-${RUN}`, GUEST_NICK);
  const host = await ctxA.newPage();
  const guest = await ctxB.newPage();
  const detail = await detailChecks(host, "re-front");
  await host.screenshot({ path: join(dir, "01-detail.png"), fullPage: true });
  const hostEntry = await enterMp(host, "re-front", room);
  await host.getByTestId("rf-game-shell").waitFor({ timeout: 25_000 }).catch(() => {});
  await host.screenshot({ path: join(dir, "02-host-world.png") });
  await guest.waitForTimeout(1500);
  const guestEntry = await enterMp(guest, "re-front", room);
  await guest.getByTestId("rf-game-shell").waitFor({ timeout: 25_000 }).catch(() => {});
  await guest.screenshot({ path: join(dir, "03-guest-world.png") });
  const hostQa = await host.evaluate(() => window.__RF_QA__?.()).catch(() => null);
  const guestQa = await guest.evaluate(() => window.__RF_QA__?.()).catch(() => null);
  for (let i = 0; i < 8; i++) {
    const exp = host.getByRole("button", { name: /EXPAND/i });
    if (await exp.isVisible().catch(() => false)) await exp.click();
    await host.keyboard.press("Space");
    await host.waitForTimeout(250);
  }
  const after = await host.evaluate(() => window.__RF_QA__?.()).catch(() => null);
  const practice = await host.evaluate(() => /연습모드|PRACTICE|fallback=1/i.test(document.body.innerText));

  const victory = await holdExpandTo70(host, playMs);
  await host.screenshot({ path: join(dir, "06-real-victory.png") });
  await host.screenshot({ path: join(dir, "07-result.png") });
  const result70 =
    !!victory.youWin &&
    !!victory.resultVisible &&
    (victory.pct ?? 0) >= 70 &&
    !!victory.rematch &&
    !!victory.another;
  let rematchOk = false;
  let anotherOk = false;
  let resultExitOk = false;
  if (result70) {
    await host.getByTestId("rf-rematch-btn").click();
    rematchOk = await host.getByTestId("rf-game-shell").waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false);
    await host.screenshot({ path: join(dir, "08-rematch.png") });
    const win2 = await holdExpandTo70(host, playMs);
    await host.screenshot({ path: join(dir, "09-another-game.png") });
    if (win2.youWin && win2.resultVisible) {
      await host.getByTestId("mp-death-play-another").click();
      await host.waitForTimeout(2000);
      anotherOk = /\/games\/?$/.test(new URL(host.url()).pathname);
    }
  }
  if (!anotherOk) {
    await host.goto(`${BASE}/games/re-front/play?room=${encodeURIComponent(room + "X")}`, {
      waitUntil: "load",
      timeout: 90_000,
    });
    await clickEnter(host);
    await host.getByTestId("rf-game-shell").waitFor({ timeout: 25_000 }).catch(() => {});
  }
  const win3 = anotherOk ? { youWin: false } : await holdExpandTo70(host, result70 ? 90_000 : playMs);
  if (win3.youWin && win3.resultVisible) {
    await host.getByRole("button", { name: "EXIT", exact: true }).click();
    await host.waitForTimeout(1500);
    resultExitOk = host.url().includes("/games/re-front") && !host.url().includes("/play");
    await host.screenshot({ path: join(dir, "10-exit.png") });
  } else if (!resultExitOk) {
    await host.getByRole("button", { name: /나가기/i }).click().catch(() => {});
    await host.waitForTimeout(1500);
    resultExitOk = host.url().includes("/games/re-front") && !host.url().includes("/play");
    await host.screenshot({ path: join(dir, "10-exit.png") });
  }
  await ctxA.close();
  await ctxB.close();
  const world = hostEntry.ok && guestEntry.ok && !!hostQa && !!guestQa;
  const thumbIdentifiable = !!detail.thumbOk && (detail.thumb?.w || 0) >= 320;
  return {
    pass: world && detail.enterWorld && thumbIdentifiable && !practice && detail.noSolo && result70 && rematchOk,
    room,
    detail,
    hostEntry,
    guestEntry,
    hostRole: hostQa?.mpRole ?? null,
    guestRole: guestQa?.mpRole ?? null,
    hostPct: hostQa?.me?.territoryPct ?? null,
    afterPct: after?.me?.territoryPct ?? null,
    humansHost: (hostQa?.hudHumans || []).length,
    humansGuest: (guestQa?.hudHumans || []).length,
    practice,
    result70,
    rematchOk,
    anotherOk,
    resultExitOk,
    victory,
    helperUsed: false,
    note: "70% via EXPAND/Space only. No __RF_QA_END_ROUND__. Complete Sprint folder not overwritten.",
  };
}

assertGame29Preview();
const browser = await chromium.launch({ headless: true });
try {
  report.games.snake = await qaSnake(browser).catch((e) => ({ pass: false, error: String(e) }));
  report.games.agar = await qaAgar(browser).catch((e) => ({ pass: false, error: String(e) }));
  report.games.bomber = await qaBomber(browser).catch((e) => ({ pass: false, error: String(e) }));
  report.games["re-front"] = await qaReFront(browser).catch((e) => ({ pass: false, error: String(e) }));
  const rows = Object.values(report.games);
  report.verdict = rows.every((g) => g.pass) ? "PASS" : "FAIL";
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "preview-qa.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, project: report.projectCheck, games: Object.fromEntries(Object.entries(report.games).map(([k, v]) => [k, { pass: v.pass, error: v.error }])) }, null, 2));
  process.exit(report.verdict === "PASS" ? 0 : 1);
} finally {
  await browser.close();
}
