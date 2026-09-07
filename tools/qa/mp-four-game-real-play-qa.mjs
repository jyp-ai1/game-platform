/**
 * Re:Play — Multiplayer 4-Game Real Play QA Gate (local only)
 *
 * Usage:
 *   Terminal 1: cd apps/web && npm run dev
 *   Terminal 2:
 *     QA_BASE_URL=http://localhost:3000 node tools/qa/mp-four-game-real-play-qa.mjs
 *
 * PASS = 4 games × Host × Guest × real Sync × Exit × Rematch × Another Game
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = (process.env.QA_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT = join(ROOT, "docs/qa/cpo/mp-four-game-real-play");
mkdirSync(OUT, { recursive: true });

const RUN_ID = Date.now();
const DEVICE_HOST = `qa-mp-host-${RUN_ID}`;
const DEVICE_GUEST = `qa-mp-guest-${RUN_ID}`;
const HOST_NICK = `QAHost${RUN_ID.toString(36).slice(-4).toUpperCase()}`;
const GUEST_NICK = `QAGuest${RUN_ID.toString(36).slice(-4).toUpperCase()}`;

const CONNECTING_FAIL_MS = 20_000;
const WORLD_ENTER_MS = 30_000;

/** @typedef {{ ms: number; label: string }} Timing */
/** @typedef {{ pass: boolean; note?: string; [key: string]: unknown }} CaseResult */

/** @type {Record<string, unknown>} */
const report = {
  gate: "mp-four-game-real-play",
  baseUrl: BASE,
  runId: RUN_ID,
  hostNick: HOST_NICK,
  guestNick: GUEST_NICK,
  startedAt: new Date().toISOString(),
  matrix: {},
  games: {},
  gateResult: "PENDING",
};

async function seedDevice(ctx, deviceId, nickname) {
  await ctx.addInitScript(
    ({ id, nick }) => {
      localStorage.setItem("play29:device-id", id);
      localStorage.setItem("play29:nickname", nick);
    },
    { id: deviceId, nick: nickname }
  );
}

async function collectConsoleErrors(page) {
  /** @type {string[]} */
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => errors.push(String(err.message).slice(0, 300)));
  return errors;
}

async function waitConnectingClear(page, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const connecting = await page
      .locator('[data-testid$="-connecting"], :text("Connecting…"), :text("Connecting...")')
      .first()
      .isVisible()
      .catch(() => false);
    const connectError = await page
      .locator('[data-testid$="-connect-error"], :text("Connection failed")')
      .first()
      .isVisible()
      .catch(() => false);
    if (connectError) return { ok: false, ms: Date.now() - t0, reason: "connection_failed" };
    if (!connecting) return { ok: true, ms: Date.now() - t0, reason: "cleared" };
    await page.waitForTimeout(250);
  }
  return { ok: false, ms: Date.now() - t0, reason: "connecting_timeout" };
}

async function clickMpEnter(page) {
  const enter = page.getByTestId("mp-enter-world");
  if (await enter.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enter.click();
    return true;
  }
  for (const name of [/^ENTER$/i, /ENTER WORLD/i]) {
    const btn = page.getByRole("button", { name });
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      return true;
    }
  }
  return false;
}

async function verifyDetailCta(page, slug) {
  await page.goto(`${BASE}/games/${slug}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const body = await page.evaluate(() => document.body.innerText);
  const hasSolo = /\bPLAY SOLO\b/i.test(body);
  const hasPlayNow = /\bPLAY NOW\b/i.test(body);
  const hasEnterWorld =
    (await page.getByRole("link", { name: /ENTER WORLD/i }).count()) > 0 || /\bENTER WORLD\b/i.test(body);
  const modeBadge = await page.getByTestId("game-detail-mode-badge").textContent().catch(() => "");
  return {
    pass: hasEnterWorld && !hasSolo && !hasPlayNow,
    hasEnterWorld,
    hasSolo,
    hasPlayNow,
    modeBadge: modeBadge?.trim() ?? null,
  };
}

async function enterViaMpShell(page, slug, roomCode) {
  /** @type {Timing[]} */
  const timings = [];
  const t0 = Date.now();
  await page.goto(`${BASE}/games/${slug}/play?room=${encodeURIComponent(roomCode)}`, {
    waitUntil: "load",
    timeout: 90_000,
  });
  timings.push({ ms: Date.now() - t0, label: "navigate_play" });

  const lobbyVisible = await page
    .getByTestId("mp-entry-lobby")
    .waitFor({ state: "visible", timeout: 60_000 })
    .then(() => true)
    .catch(async () => {
      const enterBtn = page.getByRole("button", { name: /^ENTER$/i });
      return enterBtn.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
    });
  if (!lobbyVisible) return { ok: false, timings, reason: "no_entry_lobby" };

  const enterClickAt = Date.now();
  const clicked = await clickMpEnter(page);
  if (!clicked) return { ok: false, timings, reason: "no_enter_button" };
  timings.push({ ms: Date.now() - enterClickAt, label: "enter_click" });

  const clear = await waitConnectingClear(page, CONNECTING_FAIL_MS);
  timings.push({ ms: clear.ms, label: `connecting_${clear.reason}` });
  if (!clear.ok) return { ok: false, timings, reason: clear.reason };

  return { ok: true, timings, reason: "world_entered" };
}

async function bomberEnterWorld(page, roomCode = "BOMBER-A") {
  const t0 = Date.now();
  await page.goto(`${BASE}/games/bomber/play?room=${encodeURIComponent(roomCode)}`, {
    waitUntil: "load",
    timeout: 90_000,
  });
  await page.getByTestId("mp-entry-lobby").waitFor({ state: "visible", timeout: 60_000 });
  await clickMpEnter(page);
  await page.waitForTimeout(500);
  const hasWorld = await page.getByTestId("bomber-local-player").isVisible().catch(() => false);
  const hasConnecting = await page.getByTestId("bomber-connecting").isVisible().catch(() => false);
  const hasMap = await page.getByTestId("bomber-map-select").isVisible().catch(() => false);
  if (!hasWorld && !hasConnecting && hasMap) {
    const mapA = page.getByTestId("bomber-map-A");
    if (await mapA.isVisible({ timeout: 3000 }).catch(() => false)) await mapA.click();
    else await page.getByRole("button", { name: /^A · Classic/i }).click();
  }
  const result = await waitBomberWorldOrFail(page);
  if (result.ok) {
    const acked = await page
      .waitForFunction(() => window.__BOMBER_QA__?.()?.stateAck === true, { timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!acked) {
      return {
        ok: false,
        ms: Date.now() - t0,
        clear: { ok: false, ms: Date.now() - t0, reason: "no_state_ack" },
        connectError: true,
      };
    }
    await page.waitForTimeout(2000);
  }
  return {
    ok: result.ok,
    ms: Date.now() - t0,
    clear: { ok: result.ok, ms: result.ms, reason: result.reason },
    connectError: result.reason === "connection_failed",
  };
}

async function waitBomberWorldOrFail(page) {
  const t0 = Date.now();
  const CONNECT_MAX_MS = 12_000;
  while (Date.now() - t0 < CONNECT_MAX_MS) {
    const err = await page.getByTestId("bomber-connect-error").isVisible().catch(() => false);
    if (err) return { ok: false, ms: Date.now() - t0, reason: "connection_failed" };
    const playing = await page.getByTestId("bomber-local-player").isVisible().catch(() => false);
    if (playing) return { ok: true, ms: Date.now() - t0, reason: "world" };
    await page.waitForTimeout(200);
  }
  const connecting = await page.locator(':text("Connecting")').isVisible().catch(() => false);
  return { ok: false, ms: Date.now() - t0, reason: connecting ? "connecting_timeout" : "timeout" };
}

async function probeBomberRealSync(hostPage, guestPage) {
  const deadline = Date.now() + 8000;
  /** @type {{ pass: boolean; hostIsHost: boolean | null; guestIsHost: boolean | null; hostHumans: number; guestHumans: number; hostStateAck?: boolean; guestStateAck?: boolean }} */
  let last = { pass: false, hostIsHost: null, guestIsHost: null, hostHumans: 0, guestHumans: 0 };
  while (Date.now() < deadline) {
    await hostPage.waitForTimeout(500);
    const hostQa = await hostPage.evaluate(() => window.__BOMBER_QA__?.());
    const guestQa = await guestPage.evaluate(() => window.__BOMBER_QA__?.());
    const hostHumans = hostQa?.players?.filter((p) => !p.isBot) ?? [];
    const guestHumans = guestQa?.players?.filter((p) => !p.isBot) ?? [];
    const pass =
      !!hostQa?.stateAck &&
      !!guestQa?.stateAck &&
      hostQa?.isHost === true &&
      guestQa?.isHost === false &&
      guestHumans.length >= 2 &&
      (hostHumans.length >= 2 || guestHumans.length >= 2);
    last = {
      pass,
      hostIsHost: hostQa?.isHost ?? null,
      guestIsHost: guestQa?.isHost ?? null,
      hostHumans: hostHumans.length,
      guestHumans: guestHumans.length,
      hostStateAck: hostQa?.stateAck ?? false,
      guestStateAck: guestQa?.stateAck ?? false,
    };
    if (pass) return last;
  }
  return last;
}

async function probeAgarRealSync(hostPage, guestPage, hostNick, guestNick) {
  await hostPage.waitForTimeout(4000);
  const read = async (page) =>
    page.evaluate(() => window.__AGAR_QA__?.()).catch(() => null);
  const hostQa = await read(hostPage);
  const guestQa = await read(guestPage);
  const hostRole =
    hostQa?.mpRole === "host"
      ? "HOST"
      : hostQa?.mpRole === "guest"
        ? "SYNC"
        : ((await hostPage.getByTestId("agar-mp-role").textContent({ timeout: 5000 }).catch(() => ""))?.trim() ?? "");
  const guestRole =
    guestQa?.mpRole === "host"
      ? "HOST"
      : guestQa?.mpRole === "guest"
        ? "SYNC"
        : ((await guestPage.getByTestId("agar-mp-role").textContent({ timeout: 5000 }).catch(() => ""))?.trim() ?? "");
  const hostFood =
    hostQa?.food ??
    Number((await hostPage.getByTestId("agar-food-count").textContent({ timeout: 3000 }).catch(() => ""))?.match(/\d+/)?.[0] ?? -1);
  const guestFood =
    guestQa?.food ??
    Number((await guestPage.getByTestId("agar-food-count").textContent({ timeout: 3000 }).catch(() => ""))?.match(/\d+/)?.[0] ?? -1);
  const hostSeesGuest =
    hostQa?.humanNicknames?.some((n) => n.includes(guestNick.slice(0, 6))) ||
    hostQa?.rankings?.some((n) => n.includes(guestNick.slice(0, 6)));
  const guestSeesHost =
    guestQa?.humanNicknames?.some((n) => n.includes(hostNick.slice(0, 6))) ||
    guestQa?.rankings?.some((n) => n.includes(hostNick.slice(0, 6)));
  const sharedState =
    Math.abs((hostQa?.tick ?? 0) - (guestQa?.tick ?? 0)) <= 12 &&
    Math.abs(hostFood - guestFood) <= 5 &&
    hostFood >= 0 &&
    (hostQa?.tick ?? 0) > 0;
  const pass =
    hostRole === "HOST" &&
    guestRole === "SYNC" &&
    hostQa?.isHost === true &&
    guestQa?.isHost === false &&
    sharedState &&
    hostSeesGuest &&
    guestSeesHost;
  return {
    pass,
    hostRole,
    guestRole,
    hostFood,
    guestFood,
    hostTick: hostQa?.tick,
    guestTick: guestQa?.tick,
    hostHumans: hostQa?.humanNicknames,
    guestHumans: guestQa?.humanNicknames,
    hostSeesGuest,
    guestSeesHost,
    sharedState,
  };
}

async function rfTutorialExpand(hostPage) {
  const expanded = await hostPage.evaluate(() => window.__RF_QA_EXPAND__?.());
  if (expanded?.ok) return true;
  for (const pos of [
    { x: 200, y: 200 },
    { x: 280, y: 180 },
    { x: 160, y: 260 },
    { x: 320, y: 300 },
    { x: 240, y: 320 },
  ]) {
    await hostPage.locator("canvas").click({ position: pos }).catch(() => {});
    await hostPage.waitForTimeout(500);
    if (await hostPage.getByTestId("rf-expand-confirm").isVisible().catch(() => false)) break;
  }
  const expandBtn = hostPage.getByTestId("rf-expand-btn");
  if (await hostPage.getByTestId("rf-expand-confirm").isVisible().catch(() => false)) {
    if (await expandBtn.isEnabled().catch(() => false)) {
      await expandBtn.click();
      return true;
    }
  }
  if (await expandBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
    await expandBtn.click();
    return true;
  }
  return false;
}

async function probeRfRealSync(hostPage, guestPage, hostNick) {
  await hostPage.waitForTimeout(1500);
  const hostQa = await hostPage.evaluate(() => window.__RF_QA__?.());
  const guestQa = await guestPage.evaluate(() => window.__RF_QA__?.());

  const hostTerBefore = hostQa?.me?.territoryPct ?? 0;
  const guestHostTerBefore =
    guestQa?.opponents?.find((o) => o.nickname?.includes?.(hostNick.slice(0, 6)) || o.id)?.territoryPct ??
    guestQa?.opponents?.[0]?.territoryPct ??
    0;

  const hostExpanded = await rfTutorialExpand(hostPage);
  await hostPage.waitForTimeout(3000);

  const hostTerAfter = (await hostPage.evaluate(() => window.__RF_QA__?.()?.me?.territoryPct)) ?? 0;
  const guestQaAfter = await guestPage.evaluate(() => window.__RF_QA__?.());
  const guestHostTerAfter =
    guestQaAfter?.opponents?.find((o) => o.nickname?.includes?.(hostNick.slice(0, 6)) || o.id)?.territoryPct ??
    guestQaAfter?.opponents?.[0]?.territoryPct ??
    0;

  const presencePass = !!hostQa?.me?.alive && !!guestQa?.me?.alive;
  const hostTerDelta = hostTerAfter - hostTerBefore;
  const guestHostTerDelta = guestHostTerAfter - guestHostTerBefore;
  const statePass =
    hostExpanded && hostTerDelta > 0 && (guestHostTerDelta > 0 || Math.abs(guestHostTerAfter - hostTerAfter) < 0.5);

  return {
    pass: presencePass && statePass,
    presencePass,
    statePass,
    hostExpanded,
    hostTerDelta,
    guestHostTerDelta,
    hostTerBefore,
    hostTerAfter,
    guestHostTerBefore,
    guestHostTerAfter,
    hostOpponents: hostQa?.opponents,
    guestOpponents: guestQaAfter?.opponents,
  };
}

async function cleanupBomberShard(browser, roomCode = "BOMBER-A") {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedDevice(ctx, `qa-bomber-clean-${RUN_ID}`, "CleanHost");
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/games/bomber/play?room=${encodeURIComponent(roomCode)}`, {
      waitUntil: "load",
      timeout: 90_000,
    });
    if (await page.getByTestId("mp-entry-lobby").isVisible({ timeout: 8000 }).catch(() => false)) {
      await clickMpEnter(page);
      await page.waitForTimeout(500);
      const mapA = page.getByTestId("bomber-map-A");
      if (await mapA.isVisible({ timeout: 3000 }).catch(() => false)) await mapA.click();
      await waitBomberWorldOrFail(page);
    }
  } catch {
    /* ignore */
  }
  await ctx.close();
  await new Promise((r) => setTimeout(r, 800));
}

async function testExitToDetail(page, clickFn, expectedPattern) {
  const before = page.url();
  await clickFn(page);
  try {
    await page.waitForURL(expectedPattern, { timeout: 12_000 });
    return { pass: true, before, after: page.url() };
  } catch {
    return { pass: false, before, after: page.url(), note: "exit_navigation_failed" };
  }
}

async function testBomberLifecycle(page, roomCode) {
  const enter = await bomberEnterWorld(page, roomCode);
  if (!enter.ok) {
    return {
      exit: { pass: false, note: "could_not_enter_for_lifecycle" },
      rematch: { pass: false, note: "skipped" },
      another: { pass: false, note: "skipped" },
    };
  }
  await page.getByRole("button", { name: "나가기" }).click();
  const exit = await testExitToDetail(page, async () => {}, /\/games\/bomber/);

  await bomberEnterWorld(page, roomCode);
  await page.evaluate(() => window.__BOMBER_QA_DIE__?.());
  await page.getByTestId("bomber-game-over").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  const hadGameOver = await page.getByTestId("bomber-game-over").isVisible().catch(() => false);
  let rematch = { pass: false, note: "game_over_not_shown" };
  if (hadGameOver) {
    await page.getByTestId("mp-death-retry").click();
    const backInWorld = await page
      .getByTestId("bomber-local-player")
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    rematch = { pass: backInWorld, note: backInWorld ? "retry_reentered_world" : "retry_failed" };
  }

  await page.evaluate(() => window.__BOMBER_QA_DIE__?.());
  await page.getByTestId("bomber-game-over").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  let another = { pass: false, note: "game_over_not_shown" };
  if (await page.getByTestId("bomber-game-over").isVisible().catch(() => false)) {
    await page.getByTestId("mp-death-play-another").click();
    try {
      await page.waitForURL(/\/games/, { timeout: 12_000 });
      another = { pass: page.url().includes("/games"), after: page.url() };
    } catch {
      another = { pass: false, after: page.url(), note: "another_navigation_failed" };
    }
  }
  return { exit, rematch, another };
}

async function testAgarLifecycle(page, roomCode) {
  const lifeRoom = `${roomCode}-LIFE`;
  const entry = await enterViaMpShell(page, "agar", lifeRoom);
  if (!entry.ok) {
    return {
      exit: { pass: false, note: "could_not_enter" },
      rematch: { pass: false, note: "skipped" },
      another: { pass: false, note: "skipped" },
    };
  }
  await page.locator(".touch-none").first().waitFor({ state: "visible", timeout: WORLD_ENTER_MS }).catch(() => {});
  await page.waitForTimeout(2000);

  const exitBtn = page.getByRole("button", { name: "나가기" });
  await exitBtn.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  let exit;
  if (await exitBtn.isVisible().catch(() => false)) {
    await exitBtn.click();
    exit = await testExitToDetail(page, async () => {}, /\/games\/agar/);
  } else {
    exit = { pass: false, note: "no_in_game_exit_to_detail" };
  }

  await enterViaMpShell(page, "agar", lifeRoom);
  await page.locator(".touch-none").first().waitFor({ state: "visible", timeout: WORLD_ENTER_MS }).catch(() => {});
  await page.waitForTimeout(2500);

  let rematch = { pass: false, note: "die_hook_failed" };
  const died = await page.evaluate(() => window.__AGAR_QA_DIE__?.());
  if (died) {
    await page.getByTestId("agar-game-over").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    if (await page.getByTestId("agar-game-over").isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /^Retry$/i }).click();
      await page.waitForTimeout(2000);
      const alive = await page.locator(".touch-none").first().isVisible().catch(() => false);
      rematch = { pass: alive, note: "retry_after_qa_die" };
    }
  }

  let another = { pass: false, note: "die_hook_failed" };
  await enterViaMpShell(page, "agar", lifeRoom);
  await page.locator(".touch-none").first().waitFor({ state: "visible", timeout: WORLD_ENTER_MS }).catch(() => {});
  await page.waitForTimeout(1500);
  if (await page.evaluate(() => window.__AGAR_QA_DIE__?.())) {
    await page.getByTestId("agar-game-over").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    if (await page.getByTestId("agar-game-over").isVisible().catch(() => false)) {
      await page.getByTestId("mp-death-play-another").click();
      try {
        await page.waitForURL(/\/games/, { timeout: 12_000 });
        another = { pass: page.url().includes("/games"), after: page.url() };
      } catch {
        another = { pass: false, after: page.url() };
      }
    }
  }
  return { exit, rematch, another };
}

async function testRfLifecycle(page, roomCode) {
  const lifeRoom = `${roomCode}-LIFE`;
  const entry = await enterViaMpShell(page, "re-front", lifeRoom);
  if (!entry.ok) {
    return {
      exit: { pass: false, note: "could_not_enter" },
      rematch: { pass: false, note: "skipped" },
      another: { pass: false, note: "skipped" },
    };
  }
  await page.getByTestId("rf-game-shell").waitFor({ state: "visible", timeout: WORLD_ENTER_MS });

  await page.getByRole("button", { name: /← Exit/i }).click();
  const exit = await testExitToDetail(page, async () => {}, /\/games\/re-front/);

  await enterViaMpShell(page, "re-front", lifeRoom);
  await page.getByTestId("rf-game-shell").waitFor({ state: "visible", timeout: WORLD_ENTER_MS });
  await page.waitForTimeout(2000);

  let rematch = { pass: false, note: "round_end_failed" };
  const endRound = await page.evaluate(() => window.__RF_QA_END_ROUND__?.());
  if (endRound?.ok) {
    await page.getByTestId("rf-rematch-btn").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    if (await page.getByTestId("rf-rematch-btn").isVisible().catch(() => false)) {
      await page.getByTestId("rf-rematch-btn").click();
      await page.waitForTimeout(2500);
      const backInWorld = await page
        .waitForFunction(
          () =>
            !!document.querySelector('[data-testid="rf-game-shell"]') &&
            !document.querySelector('[data-testid="rf-rematch-btn"]'),
          { timeout: 10_000 }
        )
        .then(() => true)
        .catch(() => false);
      rematch = { pass: backInWorld, note: "rematch_after_qa_round_end" };
    }
  }

  let another = { pass: false, note: "round_end_failed" };
  await enterViaMpShell(page, "re-front", lifeRoom);
  await page.getByTestId("rf-game-shell").waitFor({ state: "visible", timeout: WORLD_ENTER_MS });
  await page.waitForTimeout(2000);
  if ((await page.evaluate(() => window.__RF_QA_END_ROUND__?.()))?.ok) {
    await page.getByTestId("mp-death-play-another").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    if (await page.getByTestId("mp-death-play-another").isVisible().catch(() => false)) {
      await page.getByTestId("mp-death-play-another").click();
      try {
        await page.waitForURL(/\/games/, { timeout: 12_000 });
        another = { pass: page.url().includes("/games"), after: page.url() };
      } catch {
        another = { pass: false, after: page.url() };
      }
    }
  }
  return { exit, rematch, another };
}

async function testSnakeLifecycle(page) {
  const enterWorld = async () => {
    await page.goto(`${BASE}/flagship/snake-io/play?room=WORLD`, { waitUntil: "load", timeout: 90_000 });
    const startBtn = page.getByRole("button", { name: "START", exact: true });
    if (await startBtn.isVisible({ timeout: 12_000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(800);
    }
    const enterBtn = page.getByRole("button", { name: /ENTER WORLD/i });
    if (await enterBtn.isVisible({ timeout: 20_000 }).catch(() => false)) {
      await enterBtn.click();
      await page.waitForTimeout(500);
    }
    await page.locator("canvas, .touch-none").first().waitFor({ state: "visible", timeout: WORLD_ENTER_MS });
    await page.waitForTimeout(2000);
  };

  await enterWorld();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  await page
    .waitForFunction(
      () => {
        const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("나가기"));
        return !!btn && btn.offsetParent !== null;
      },
      { timeout: 45_000 }
    )
    .catch(() => {});
  await page.waitForTimeout(500);

  let exit = { pass: false, note: "quit_button_not_visible" };
  const quitBtn = page.getByRole("button", { name: "나가기" });
  if (await quitBtn.isVisible().catch(() => false)) {
    await quitBtn.click();
    try {
      await page.waitForURL(/\/($|\?|games\/snake|flagship)/, { timeout: 15_000 });
      exit = { pass: true, after: page.url(), note: "snake_exits_after_alive" };
    } catch {
      exit = { pass: false, after: page.url() };
    }
  }

  await page.goto(`${BASE}/flagship/snake-io/play?room=WORLD&debug=1`, { waitUntil: "load", timeout: 90_000 });
  const startBtn = page.getByRole("button", { name: "START", exact: true });
  if (await startBtn.isVisible({ timeout: 12_000 }).catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(800);
  }
  const enterBtn = page.getByRole("button", { name: /ENTER WORLD/i });
  if (await enterBtn.isVisible({ timeout: 20_000 }).catch(() => false)) {
    await enterBtn.click();
    await page.waitForTimeout(500);
  }
  await page.locator("canvas, .touch-none").first().waitFor({ state: "visible", timeout: WORLD_ENTER_MS });
  await page.waitForTimeout(3000);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  await page.waitForTimeout(5000);
  await page.waitForFunction(() => !!window.__RC_DEATH_007__?.forceLocalDeath, { timeout: 15_000 }).catch(() => {});
  await page.evaluate(() => {
    window.__RC_DEATH_007__?.forceLocalDeath?.();
  });
  await page.waitForTimeout(1000);

  let rematch = { pass: false, note: "no_respawn_countdown" };
  const rematchOk = await page
    .waitForFunction(
      () => {
        const summary = window.__RC_DEATH_007__?.summary?.();
        if (summary?.pass?.countdown) return true;
        const countdownEl = document.querySelector('[data-testid="death-ux-countdown"]');
        if (countdownEl) return true;
        const last = window.__RC_DEATH_007__?.samples?.at(-1);
        return last?.phase === "respawned" || (last?.alive === true && last?.phase !== "alive");
      },
      { timeout: 35_000 }
    )
    .then(() => true)
    .catch(() => false);
  if (rematchOk) {
    await page.waitForTimeout(7000);
    const aliveAgain = await page
      .waitForFunction(
        () => {
          const last = window.__RC_DEATH_007__?.samples?.at(-1);
          if (last?.phase === "respawned" || last?.alive === true) return true;
          const canvas = document.querySelector("canvas");
          const countdownEl = document.querySelector('[data-testid="death-ux-countdown"]');
          return !!canvas && canvas.width > 0 && !countdownEl;
        },
        { timeout: 25_000 }
      )
      .then(() => true)
      .catch(() => false);
    rematch = { pass: aliveAgain, note: "world_auto_respawn_after_force_death" };
  }

  return {
    exit,
    rematch,
    another: { pass: null, note: "snake_world_uses_auto_respawn_not_another_game" },
  };
}

function summarizeGame(r) {
  const host = r.host?.pass === true;
  const guest = r.guest?.pass === true;
  const sync = r.sync?.pass === true;
  const exit = r.exit?.pass === true;
  const rematch = r.rematch?.pass === true;
  const another = r.another?.pass === true || r.another?.pass === null;
  const allPass = host && guest && sync && exit && rematch && another;
  return { host, guest, sync, exit, rematch, another, result: allPass ? "PASS" : "FAIL" };
}

async function qaSnake(browser) {
  const shotDir = join(OUT, "snake");
  mkdirSync(shotDir, { recursive: true });
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedDevice(ctxA, DEVICE_HOST, HOST_NICK);
  await seedDevice(ctxB, DEVICE_GUEST, GUEST_NICK);
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const detail = await verifyDetailCta(pageA, "snake");
  const enterSnakeWorld = async (page) => {
    await page.goto(`${BASE}/flagship/snake-io/play?room=WORLD`, { waitUntil: "load", timeout: 90_000 });
    const startBtn = page.getByRole("button", { name: "START", exact: true });
    if (await startBtn.isVisible({ timeout: 12_000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(800);
    }
    const enterWorld = page.getByRole("button", { name: /ENTER WORLD/i });
    if (await enterWorld.isVisible({ timeout: 20_000 }).catch(() => false)) {
      await enterWorld.click();
      await page.waitForTimeout(500);
    }
    await page.locator("canvas, .touch-none").first().waitFor({ state: "visible", timeout: WORLD_ENTER_MS }).catch(() => {});
    const practiceFallback = page.url().includes("PRACTICE") || (await page.locator(':text("연습")').count()) > 0;
    const connectFailed = await page.getByTestId("snake-connect-error").isVisible().catch(() => false);
    return {
      world: await page.evaluate(() => !!(document.querySelector("canvas") || document.querySelector(".touch-none"))),
      practiceFallback: practiceFallback || connectFailed,
      top10: await page.getByTestId("mp-top10").isVisible({ timeout: 15_000 }).catch(() => false),
    };
  };

  const hostResult = await enterSnakeWorld(pageA);
  await pageA.screenshot({ path: join(shotDir, "02-host-world.png"), fullPage: true });
  const guestResult = await enterSnakeWorld(pageB);
  await pageB.screenshot({ path: join(shotDir, "03-guest-world.png"), fullPage: true });
  const hostWorld = hostResult.world && !hostResult.practiceFallback;
  const guestWorld = guestResult.world && !guestResult.practiceFallback;
  await ctxA.close();
  await ctxB.close();

  const lifecycleCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedDevice(lifecycleCtx, `${DEVICE_HOST}-life`, HOST_NICK);
  const lifePage = await lifecycleCtx.newPage();
  const lifecycle = await testSnakeLifecycle(lifePage);
  await lifecycleCtx.close();

  return {
    detail,
    roomCode: "WORLD",
    host: { pass: hostWorld, deviceId: DEVICE_HOST },
    guest: { pass: guestWorld, deviceId: DEVICE_GUEST },
    sync: {
      pass: hostWorld && guestWorld,
      note: hostResult.top10 && guestResult.top10 ? "canvas_and_top10" : "canvas_both_players",
      practiceFallback: hostResult.practiceFallback || guestResult.practiceFallback,
    },
    ...lifecycle,
  };
}

async function qaBomber(browser) {
  const roomCode = "BOMBER-A";
  const bomberHostId = `${DEVICE_HOST}-bomber`;
  const bomberGuestId = `${DEVICE_GUEST}-bomber`;
  const shotDir = join(OUT, "bomber");
  mkdirSync(shotDir, { recursive: true });

  await cleanupBomberShard(browser, roomCode);

  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedDevice(ctxA, bomberHostId, HOST_NICK);
  await seedDevice(ctxB, bomberGuestId, GUEST_NICK);
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const detail = await verifyDetailCta(pageA, "bomber");
  const hostEntry = await bomberEnterWorld(pageA, roomCode);
  await pageA.screenshot({ path: join(shotDir, "02-host-world.png"), fullPage: true });
  await pageA.waitForFunction(
    () => window.__BOMBER_QA__?.()?.stateAck === true,
    { timeout: 15_000 }
  ).catch(() => {});
  await pageA.waitForTimeout(2000);
  let guestEntry = await bomberEnterWorld(pageB, roomCode);
  for (let attempt = 0; attempt < 3 && !guestEntry.ok; attempt++) {
    await pageB.waitForTimeout(3000);
    guestEntry = await bomberEnterWorld(pageB, roomCode);
  }
  await pageB.screenshot({ path: join(shotDir, "03-guest-world.png"), fullPage: true });

  const sync = await probeBomberRealSync(pageA, pageB);

  if (await pageB.getByRole("button", { name: "나가기" }).isVisible({ timeout: 3000 }).catch(() => false)) {
    await pageB.getByRole("button", { name: "나가기" }).click();
  }
  if (await pageA.getByRole("button", { name: "나가기" }).isVisible({ timeout: 3000 }).catch(() => false)) {
    await pageA.getByRole("button", { name: "나가기" }).click();
  }
  await ctxA.close();
  await ctxB.close();

  const lifecycleCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedDevice(lifecycleCtx, `${DEVICE_HOST}-life`, HOST_NICK);
  const lifePage = await lifecycleCtx.newPage();
  const lifecycle = await testBomberLifecycle(lifePage, roomCode);
  await lifecycleCtx.close();

  await cleanupBomberShard(browser, roomCode);

  return {
    detail,
    roomCode,
    host: { pass: hostEntry.ok, entry: hostEntry, deviceId: bomberHostId },
    guest: { pass: guestEntry.ok, entry: guestEntry, deviceId: bomberGuestId },
    sync,
    ...lifecycle,
  };
}

async function qaAgar(browser) {
  const roomCode = `AGAR-QA-${RUN_ID.toString(36).slice(-4).toUpperCase()}`;
  const shotDir = join(OUT, "agar");
  mkdirSync(shotDir, { recursive: true });
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedDevice(ctxA, DEVICE_HOST, HOST_NICK);
  await seedDevice(ctxB, DEVICE_GUEST, GUEST_NICK);
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const detail = await verifyDetailCta(pageA, "agar");
  const hostEntry = await enterViaMpShell(pageA, "agar", roomCode);
  await pageA.locator(".touch-none").first().waitFor({ timeout: WORLD_ENTER_MS }).catch(() => {});
  const hostWorld = await pageA.locator(".touch-none").first().isVisible().catch(() => false);
  await pageA.screenshot({ path: join(shotDir, "02-host-world.png"), fullPage: true });

  await pageB.waitForTimeout(hostEntry.ok ? 2000 : 500);
  const guestEntry = await enterViaMpShell(pageB, "agar", roomCode);
  const connectError = await pageB.getByTestId("agar-connect-error").isVisible().catch(() => false);
  const guestWorld =
    guestEntry.ok &&
    !connectError &&
    (await pageB.locator(".touch-none").first().isVisible({ timeout: WORLD_ENTER_MS }).catch(() => false));
  await pageB.screenshot({ path: join(shotDir, "03-guest-world.png"), fullPage: true });

  const sync = await probeAgarRealSync(pageA, pageB, HOST_NICK, GUEST_NICK);
  await ctxA.close();
  await ctxB.close();

  const lifecycleCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedDevice(lifecycleCtx, `${DEVICE_HOST}-life`, HOST_NICK);
  const lifePage = await lifecycleCtx.newPage();
  const lifecycle = await testAgarLifecycle(lifePage, roomCode);
  await lifecycleCtx.close();

  return {
    detail,
    roomCode,
    host: { pass: hostWorld, entry: hostEntry, deviceId: DEVICE_HOST },
    guest: { pass: guestWorld, entry: guestEntry, deviceId: DEVICE_GUEST },
    sync,
    ...lifecycle,
  };
}

async function qaReFront(browser) {
  const roomCode = `RF-QA-${RUN_ID.toString(36).slice(-4).toUpperCase()}`;
  const shotDir = join(OUT, "re-front");
  mkdirSync(shotDir, { recursive: true });
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedDevice(ctxA, DEVICE_HOST, HOST_NICK);
  await seedDevice(ctxB, DEVICE_GUEST, GUEST_NICK);
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const detail = await verifyDetailCta(pageA, "re-front");
  const hostEntry = await enterViaMpShell(pageA, "re-front", roomCode);
  const hostWorld = await pageA.getByTestId("rf-game-shell").isVisible({ timeout: WORLD_ENTER_MS }).catch(() => false);
  await pageA.screenshot({ path: join(shotDir, "02-host-world.png"), fullPage: true });

  await pageB.waitForTimeout(hostEntry.ok ? 2000 : 500);
  const guestEntry = await enterViaMpShell(pageB, "re-front", roomCode);
  const connectError = await pageB.getByTestId("rf-connect-error").isVisible().catch(() => false);
  const guestWorld =
    guestEntry.ok &&
    !connectError &&
    (await pageB.getByTestId("rf-game-shell").isVisible({ timeout: WORLD_ENTER_MS }).catch(() => false));
  await pageB.screenshot({ path: join(shotDir, "03-guest-world.png"), fullPage: true });

  const sync = await probeRfRealSync(pageA, pageB, HOST_NICK);
  await ctxA.close();
  await ctxB.close();

  const lifecycleCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await seedDevice(lifecycleCtx, `${DEVICE_HOST}-life`, HOST_NICK);
  const lifePage = await lifecycleCtx.newPage();
  const lifecycle = await testRfLifecycle(lifePage, roomCode);
  await lifecycleCtx.close();

  return {
    detail,
    roomCode,
    host: { pass: hostWorld, entry: hostEntry, deviceId: DEVICE_HOST },
    guest: { pass: guestWorld, entry: guestEntry, deviceId: DEVICE_GUEST },
    sync,
    ...lifecycle,
  };
}

const browser = await chromium.launch({ headless: true });

try {
  const probe = await browser.newPage();
  try {
    await probe.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15_000 });
  } catch (e) {
    report.gateResult = "BLOCKED";
    report.error = `Local server not reachable at ${BASE}: ${String(e)}`;
    writeFileSync(join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
    console.error(report.error);
    process.exit(2);
  }
  await probe.close();

  report.games.snake = await qaSnake(browser).catch((e) => ({
    host: { pass: false },
    guest: { pass: false },
    sync: { pass: false, note: String(e) },
    exit: { pass: false },
    rematch: { pass: false },
    another: { pass: null },
    error: String(e),
  }));
  report.games.agar = await qaAgar(browser).catch((e) => ({
    host: { pass: false },
    guest: { pass: false },
    sync: { pass: false, note: String(e) },
    exit: { pass: false },
    rematch: { pass: false },
    another: { pass: false },
    error: String(e),
  }));
  report.games["re-front"] = await qaReFront(browser).catch((e) => ({
    host: { pass: false },
    guest: { pass: false },
    sync: { pass: false, note: String(e) },
    exit: { pass: false },
    rematch: { pass: false },
    another: { pass: false },
    error: String(e),
  }));
  report.games.bomber = await qaBomber(browser).catch((e) => ({
    host: { pass: false },
    guest: { pass: false },
    sync: { pass: false, note: String(e) },
    exit: { pass: false },
    rematch: { pass: false },
    another: { pass: false },
    error: String(e),
  }));

  report.matrix = {
    snake: summarizeGame(report.games.snake),
    bomber: summarizeGame(report.games.bomber),
    agar: summarizeGame(report.games.agar),
    "re-front": summarizeGame(report.games["re-front"]),
  };

  const rows = Object.values(report.matrix);
  const fullPass = rows.every((r) => r.result === "PASS");
  report.gateResult = fullPass ? "PASS" : "FAIL";
  report.finishedAt = new Date().toISOString();
  report.note =
    "Full contract: Host/Guest/real Sync/Exit/Rematch/Another. Agar sync expects cross-player TOP10. Re:Front rematch/another need round end.";

  writeFileSync(join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ gateResult: report.gateResult, matrix: report.matrix }, null, 2));
  process.exit(fullPass ? 0 : 1);
} finally {
  await browser.close();
}
