/**
 * Re:Front Complete final QA.
 * Two real browsers. EXPAND button only. No end-round helper, no __RF_QA_EXPAND__.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.QA_BASE_URL || "").replace(/\/$/, "");
const OUT = join(ROOT, "docs/qa/cpo/mp-cpo-2nd-product-qa/re-front-complete");
const ROOM = `RF-FIN-${Date.now().toString(36).toUpperCase()}`;
const PLAY_MS = Number(process.env.RF_COMPLETE_PLAY_MS || 8 * 60 * 1000);
mkdirSync(join(OUT, "evidence"), { recursive: true });

if (!BASE) {
  console.error("QA_BASE_URL required");
  process.exit(2);
}

const report = {
  gate: "re-front-complete-final",
  baseUrl: BASE,
  room: ROOM,
  expandHookUsed: false,
  endRoundHelperUsed: false,
  startedAt: new Date().toISOString(),
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

async function enterWorld(page, { detail, entry } = {}) {
  if (detail) {
    await page.goto(`${BASE}/games/re-front`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.screenshot({ path: join(OUT, "evidence/01-detail.png"), fullPage: true });
    const detailText = await page.evaluate(() => document.body.innerText);
    report.detailEnterWorld = /ENTER WORLD/i.test(detailText) && /MULTIPLAYER/i.test(detailText);
    const cta = page.getByRole("link", { name: /ENTER WORLD/i });
    if (await cta.isVisible({ timeout: 8_000 }).catch(() => false)) await cta.click();
  }
  if (!page.url().includes("/play") || !page.url().includes("room=")) {
    await page.goto(`${BASE}/games/re-front/play?room=${encodeURIComponent(ROOM)}`, {
      waitUntil: "load",
      timeout: 90_000,
    });
  }
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 60_000 });
  if (entry) {
    await page.screenshot({ path: join(OUT, "evidence/02-entry.png") });
    report.entryLobby = true;
  }
  const enter = page.getByTestId("mp-enter-world");
  if (await enter.isVisible().catch(() => false)) await enter.click();
  else await page.getByRole("button", { name: /^ENTER$/i }).click();
  await page.getByTestId("rf-game-shell").waitFor({ state: "visible", timeout: 25_000 });
}

async function snapshot(page) {
  return page.evaluate(() => {
    const qa = window.__RF_QA__?.();
    const text = document.body.innerText;
    return {
      pct: qa?.me?.territoryPct ?? null,
      troops: qa?.me?.troops ?? null,
      role: qa?.mpRole ?? null,
      nick: qa?.me?.nickname ?? null,
      humans: (qa?.hudHumans || []).map((h) => ({ nick: h.nickname, pct: h.territoryPct })),
      youWin: /YOU WIN/i.test(text),
      defeat: /\bDEFEAT\b/.test(text),
      resultVisible: !!document.querySelector('[data-testid="rf-rematch-btn"]'),
      practice: /연습모드|PRACTICE|fallback=1/i.test(text),
      bodyHasHost: /RFHost/i.test(text),
      bodyHasGuest: /RFGuest/i.test(text),
      botsVisible: /Red Kingdom|Eastwood|Ironvale/i.test(text),
    };
  });
}

async function pressExpand(page) {
  const btn = page.getByTestId("rf-expand-btn");
  if (!(await btn.isVisible().catch(() => false))) return false;
  if (!(await btn.isEnabled().catch(() => false))) return false;
  await btn.click({ timeout: 2_000 }).catch(() => {});
  return true;
}

async function holdExpandToEnd(page) {
  const started = Date.now();
  let lastPct = -1;
  let stallAt = Date.now();
  await pressExpand(page);
  await page.evaluate(() => window.focus());
  await page.keyboard.down("Space");
  try {
    while (Date.now() - started < PLAY_MS) {
      const snap = await snapshot(page);
      if (snap.youWin || snap.defeat || snap.resultVisible) {
        return { ...snap, playMs: Date.now() - started };
      }
      if (typeof snap.pct === "number" && snap.pct > lastPct + 0.01) {
        lastPct = snap.pct;
        stallAt = Date.now();
      }
      if (Date.now() - stallAt > 6_000) {
        await page.keyboard.up("Space");
        await pressExpand(page);
        await page.keyboard.down("Space");
        stallAt = Date.now();
      }
      await page.waitForTimeout(280);
    }
  } finally {
    await page.keyboard.up("Space").catch(() => {});
  }
  return { ...(await snapshot(page)), playMs: Date.now() - started };
}

const browser = await chromium.launch({ headless: true });
try {
  const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const guestCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seed(hostCtx, "rf-fin-host", "RFHostFIN");
  await seed(guestCtx, "rf-fin-guest", "RFGuestFIN");
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  await enterWorld(host, { detail: true, entry: true });
  await enterWorld(guest, {});
  await host.waitForTimeout(1500);
  await guest.waitForTimeout(800);

  await host.screenshot({ path: join(OUT, "evidence/03-host-world.png") });
  await guest.screenshot({ path: join(OUT, "evidence/04-guest-world.png") });
  const hostStart = await snapshot(host);
  const guestStart = await snapshot(guest);
  report.mp = {
    hostRole: hostStart.role,
    guestRole: guestStart.role,
    hostSeesGuest: hostStart.bodyHasGuest || hostStart.humans.some((h) => /Guest/i.test(h.nick || "")),
    guestSeesHost: guestStart.bodyHasHost || guestStart.humans.some((h) => /Host/i.test(h.nick || "")),
    hostBots: hostStart.botsVisible,
    guestBots: guestStart.botsVisible,
    practice: hostStart.practice || guestStart.practice,
    hostHumans: hostStart.humans,
    guestHumans: guestStart.humans,
  };

  const hostPct0 = hostStart.pct;
  await pressExpand(host);
  await host.waitForTimeout(900);
  const afterHostExpand = { host: await snapshot(host), guest: await snapshot(guest) };
  report.hostToGuest = {
    hostPctBefore: hostPct0,
    hostPctAfter: afterHostExpand.host.pct,
    guestSeesHostPct: afterHostExpand.guest.humans.find((h) => /Host/i.test(h.nick || ""))?.pct ?? null,
  };

  const guestPct0 = (await snapshot(guest)).pct;
  for (let i = 0; i < 4; i++) {
    await pressExpand(guest);
    await guest.waitForTimeout(350);
  }
  const afterGuestExpand = { host: await snapshot(host), guest: await snapshot(guest) };
  report.guestToHost = {
    guestPctBefore: guestPct0,
    guestPctAfter: afterGuestExpand.guest.pct,
    hostSeesGuestPct: afterGuestExpand.host.humans.find((h) => /Guest/i.test(h.nick || ""))?.pct ?? null,
  };

  await host.screenshot({ path: join(OUT, "evidence/05-gameplay.png") });
  report.gameplay = await snapshot(host);

  const win = await holdExpandToEnd(host);
  report.victory = win;
  await host.screenshot({ path: join(OUT, "evidence/06-real-victory.png") });
  await host.screenshot({ path: join(OUT, "evidence/07-result.png") });
  const realWin = !!win.youWin && !!win.resultVisible && (win.pct ?? 0) >= 70 && !report.endRoundHelperUsed;
  if (!realWin) {
    report.pass = false;
    report.verdict = "HOLD";
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ verdict: "HOLD", report }, null, 2));
    process.exit(1);
  }

  await host.getByTestId("rf-rematch-btn").click();
  await host.getByTestId("rf-game-shell").waitFor({ state: "visible", timeout: 15_000 });
  await host.waitForTimeout(800);
  await host.screenshot({ path: join(OUT, "evidence/08-rematch.png") });
  report.rematch = {
    backInWorld: await host.getByTestId("rf-game-shell").isVisible(),
    noResult: !(await host.getByTestId("rf-rematch-btn").isVisible().catch(() => false)),
  };

  const win2 = await holdExpandToEnd(host);
  report.victory2 = win2;
  if (!win2.youWin || !win2.resultVisible) throw new Error("second_real_win_failed");
  await host.getByTestId("mp-death-play-another").click();
  await host.waitForURL(/\/games\/?$/, { timeout: 15_000 });
  await host.waitForTimeout(400);
  await host.screenshot({ path: join(OUT, "evidence/09-another-game.png") });
  report.anotherGame = { url: host.url(), ok: /\/games\/?$/.test(new URL(host.url()).pathname) };

  await enterWorld(host, {});
  const win3 = await holdExpandToEnd(host);
  report.victory3 = win3;
  if (!win3.youWin || !win3.resultVisible) throw new Error("third_real_win_failed");
  await host.getByRole("button", { name: "EXIT", exact: true }).click();
  await host.waitForTimeout(800);
  await host.screenshot({ path: join(OUT, "evidence/10-exit.png") });
  report.exit = { url: host.url(), ok: /\/games\/re-front/.test(host.url()) };

  report.pass =
    !!report.detailEnterWorld &&
    !!report.entryLobby &&
    !!report.mp.hostSeesGuest &&
    !!report.mp.guestSeesHost &&
    !report.mp.practice &&
    (afterHostExpand.host.pct ?? 0) > (hostPct0 ?? 0) &&
    (afterGuestExpand.guest.pct ?? 0) > (guestPct0 ?? 0) &&
    realWin &&
    !!report.rematch.backInWorld &&
    !!report.anotherGame.ok &&
    !!report.exit.ok &&
    !report.expandHookUsed &&
    !report.endRoundHelperUsed;
  report.verdict = report.pass ? "PASS" : "HOLD";
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, report }, null, 2));
  process.exit(report.pass ? 0 : 1);
} finally {
  await browser.close();
}
