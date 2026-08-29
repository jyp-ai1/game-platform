/**
 * MP-CTO-CPO-QA-010 — Bomber host seat race + dual context (player bomb only).
 * Usage (PowerShell):
 *   $env:QA_BASE_URL="https://game29-xxx.vercel.app"
 *   $env:QA_COMMIT="<sha>"
 *   node tools/qa/mp-cto-cpo-qa-010.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "https://game29.vercel.app";
const COMMIT = process.env.QA_COMMIT ?? "local";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "docs/qa/cpo/mp-cto-cpo-qa-010");
const SHOTS = join(OUT, "screenshots");

mkdirSync(SHOTS, { recursive: true });

const checks = [];
const dualContext = {
  roomId: null,
  playerA: null,
  playerB: null,
  spawnA: null,
  spawnB: null,
  positionA_before: null,
  positionA_after: null,
  positionB_before: null,
  positionB_after: null,
  bombId: null,
  bombPosition: null,
  bombOwnerId: null,
  playerBombOnly: false,
  explosion: false,
  death: false,
  aiPosition_before: null,
  aiPosition_after: null,
};

const verifyReport = {
  base: BASE,
  commit: COMMIT,
  startedAt: new Date().toISOString(),
  gates: {},
  checks: [],
};

function mark(name, ok, detail = {}) {
  const row = { name, ok, ...detail, t: new Date().toISOString() };
  checks.push(row);
  verifyReport.checks.push(row);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`, detail.detail ?? detail.note ?? "");
  return ok;
}

function invitePath(slug, room, extra = "") {
  const q = extra ? `&${extra.replace(/^&/, "")}` : "";
  return `/games/${slug}/play?room=${encodeURIComponent(room)}${q}`;
}

async function enterGame(page, slug, opts = { strictReady: false }) {
  const enter = page.locator('[data-testid="mp-enter-world"]');
  await enter.or(page.getByRole("button", { name: /^ENTER$/i })).first().waitFor({
    state: "visible",
    timeout: 45_000,
  });
  if ((await enter.count()) > 0) {
    await enter.click({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: /^ENTER$/i }).first().click({ timeout: 15_000 });
  }

  if (slug === "bomber") {
    await page.waitForTimeout(800);
    const connecting = page.locator('[data-testid="bomber-connecting"]');
    if ((await connecting.count()) > 0) {
      await connecting.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});
    }
    const hud = page.locator('[data-testid="bomber-match-hud"]');
    if ((await hud.count()) === 0) {
      const url = page.url();
      const m = url.match(/room=BOMBER-([A-D])/i);
      const letter = m?.[1]?.toUpperCase();
      const onMapSelect = (await page.locator('[data-testid="bomber-map-select"]').count()) > 0;
      if (letter && onMapSelect) {
        const mapBtn = page.locator(`[data-testid="bomber-map-${letter}"]`);
        if ((await mapBtn.count()) > 0) {
          await mapBtn.click({ timeout: 8_000, force: true }).catch(() => {});
        }
      }
    }
    await hud.waitFor({ timeout: 45_000 }).catch(() => {});
    const readyWait = page
      .locator('[data-testid="bomber-input-ready"][data-ready="1"]')
      .waitFor({ timeout: opts.strictReady ? 45_000 : 30_000 });
    if (opts.strictReady) {
      await readyWait;
    } else {
      await readyWait.catch(() => {});
    }
  }

  if (slug === "snake") {
    const right = page.locator('[data-testid="mp-pad-right"]');
    await right.waitFor({ state: "visible", timeout: 25_000 }).catch(() => {});
    if ((await right.count()) > 0) {
      await right.click({ timeout: 5_000 }).catch(() => {});
    }
  }

  if (slug === "agar") {
    await page.waitForTimeout(1500);
    const death = page.locator('[data-testid="mp-death-overlay"]');
    if ((await death.count()) > 0 && (await death.isVisible())) {
      await page.locator('[data-testid="mp-death-retry"]').click({ timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }
  }

  await page.waitForTimeout(1200);
}

function probeCode() {
  const pad = readFileSync(join(ROOT, "packages/game-sdk/src/floating-mobile-pad.tsx"), "utf8");
  const bomber = readFileSync(join(ROOT, "games/bomber/src/Bomber.tsx"), "utf8");
  const engine = readFileSync(join(ROOT, "games/bomber/src/bomber-engine.ts"), "utf8");
  const agar = readFileSync(join(ROOT, "games/agar/src/Agar.tsx"), "utf8");

  mark("bomber-host-seat-pin", engine.includes("hostId") && engine.includes("seat 0"));
  mark("bomber-reconcile-hostId", bomber.includes("reconcileHumans") && bomber.includes("hostId"));
  mark("bomber-state-ack-gate", bomber.includes("stateAckRef") && bomber.includes("waitForHostStateAck"));
  mark("bomber-qa-hook", bomber.includes("__BOMBER_QA__") && bomber.includes("__BOMBER_QA_PLANT__"));
  mark("floating-pad-left-half-joystick", pad.includes("clientX < half"));
  mark("agar-qa-split-hook", agar.includes("mp_qa_split") && agar.includes("__AGAR_QA__"));
}

function probeUnitTests() {
  try {
    execSync(
      "node --import tsx --test games/bomber/src/__tests__/bomber-online-003.test.ts games/bomber/src/__tests__/bomber-online-004.test.ts",
      { cwd: ROOT, encoding: "utf8", timeout: 90_000, stdio: ["pipe", "pipe", "pipe"] }
    );
    mark("bomber-host-seat-unit", true);
  } catch (e) {
    mark("bomber-host-seat-unit", false, {
      note: String(e?.stderr ?? e?.message ?? e).slice(0, 200),
    });
  }
  try {
    execSync("node --import tsx --test games/bomber/src/__tests__/bomber-online-003.test.ts", {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 60_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    mark("bomber-bomb-authority-unit", true);
  } catch (e) {
    mark("bomber-bomb-authority-unit", false, {
      note: String(e?.stderr ?? e?.message ?? e).slice(0, 200),
    });
  }
  try {
    execSync("node --import tsx --test games/snake/src/__tests__/snake-phase2-2.test.ts", {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 60_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    mark("snake-ai-movement-unit", true);
  } catch {
    mark("snake-ai-movement-unit", false);
  }
}

async function newContextWithDevice(browser, deviceId) {
  const ctx = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    hasTouch: true,
  });
  await ctx.addInitScript((id) => {
    window.localStorage.setItem("play29:device-id", id);
  }, deviceId);
  return ctx;
}

async function readBomberGrid(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="bomber-local-player"]');
    if (!el) return null;
    return {
      x: Number(el.getAttribute("data-grid-x")),
      y: Number(el.getAttribute("data-grid-y")),
    };
  });
}

async function readBomberPlayer(page, playerId) {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-player-id="${id}"]`);
    if (!el) return null;
    return {
      x: Number(el.getAttribute("data-grid-x")),
      y: Number(el.getAttribute("data-grid-y")),
    };
  }, playerId);
}

async function moveBomber(page, dir = "right", steps = 5) {
  const delta = {
    right: [1, 0],
    left: [-1, 0],
    down: [0, 1],
    up: [0, -1],
  }[dir] ?? [1, 0];
  for (let i = 0; i < steps; i++) {
    const qaMoved = await page
      .evaluate(
        ([dx, dy]) => {
          if (typeof window.__BOMBER_QA_MOVE__ !== "function") return false;
          window.__BOMBER_QA_MOVE__(dx, dy);
          return true;
        },
        delta
      )
      .catch(() => false);
    if (!qaMoved) {
      await dragFloatingPad(page, dir);
      const key =
        dir === "right" ? "ArrowRight" : dir === "left" ? "ArrowLeft" : dir === "down" ? "ArrowDown" : "ArrowUp";
      await page.keyboard.press(key).catch(() => {});
    }
    await page.waitForTimeout(350);
  }
}

async function dragFloatingPad(page, dir = "right") {
  const overlay = page.locator('[data-testid="mp-mobile-control-pad"]');
  if ((await overlay.count()) === 0) return false;
  const vp = page.viewportSize() ?? { width: 390, height: 844 };
  const cx = Math.floor(vp.width * 0.25);
  const cy = Math.floor(vp.height * 0.55);
  const dx = dir === "right" ? 55 : dir === "left" ? -55 : 0;
  const dy = dir === "down" ? 55 : dir === "up" ? -55 : 0;
  await overlay.dispatchEvent("pointerdown", {
    pointerId: 7,
    clientX: cx,
    clientY: cy,
    pointerType: "touch",
    bubbles: true,
  });
  await overlay.dispatchEvent("pointermove", {
    pointerId: 7,
    clientX: cx + dx,
    clientY: cy + dy,
    pointerType: "touch",
    bubbles: true,
  });
  await page.waitForTimeout(900);
  await overlay.dispatchEvent("pointerup", {
    pointerId: 7,
    clientX: cx + dx,
    clientY: cy + dy,
    pointerType: "touch",
    bubbles: true,
  });
  return true;
}

async function probeFloatingMobile(page, slug) {
  const iphone = devices["iPhone 13"];
  await page.setViewportSize(iphone.viewport);
  const room = slug === "bomber" ? "BOMBER-A" : "WORLD-QA010";
  const extra = slug === "agar" ? "mp_qa_pad=1" : slug === "bomber" ? "mp_qa_local=1" : "";
  await page.goto(`${BASE}${invitePath(slug, room, extra)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  if (slug === "snake") {
    await page.waitForURL(/snake-io\/play/, { timeout: 45_000 }).catch(() => {});
  }
  await enterGame(page, slug);

  const overlay = page.locator('[data-testid="mp-mobile-control-pad"]');
  mark(`${slug}-mobile-overlay`, (await overlay.count()) > 0);

  const joyBefore = await page.locator('[data-testid="mp-floating-joystick"]').count();
  mark(`${slug}-floating-joystick-hidden-initial`, joyBefore === 0);

  const vp = page.viewportSize() ?? { width: 390, height: 844 };
  const cx = Math.floor(vp.width * 0.25);
  const cy = Math.floor(vp.height * 0.55);
  await overlay.dispatchEvent("pointerdown", {
    pointerId: 3,
    clientX: cx,
    clientY: cy,
    pointerType: "touch",
    bubbles: true,
  });
  await overlay.dispatchEvent("pointermove", {
    pointerId: 3,
    clientX: cx + 55,
    clientY: cy,
    pointerType: "touch",
    bubbles: true,
  });
  await page.waitForTimeout(250);
  mark(`${slug}-floating-joystick-on-touch`, (await page.locator('[data-testid="mp-floating-joystick"]').count()) > 0);

  const actionIds =
    slug === "snake" ? ["boost"] : slug === "agar" ? ["split", "eject"] : ["bomb"];
  for (const id of actionIds) {
    const btn = page.locator(`[data-testid="mp-pad-action-${id}"]`);
    mark(`${slug}-mobile-action-zone-${id}`, (await overlay.count()) > 0 && (await btn.count()) > 0);
  }

  await page.screenshot({ path: join(SHOTS, `${slug}-mobile-pad.png`), fullPage: true });
}

async function probeAgarSplit(page) {
  await page.setViewportSize(devices["iPhone 13"].viewport);
  await page.goto(`${BASE}${invitePath("agar", "WORLD-AGAR010", "mp_qa_split=1&mp_qa_pad=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "agar");

  const qaReady = await page
    .waitForFunction(() => typeof window.__AGAR_QA__ === "function" && window.__AGAR_QA__().ready, {
      timeout: 15_000,
    })
    .then(() => true)
    .catch(() => false);
  mark("agar-split-setup-ready", qaReady);

  const setup = await page.evaluate(() => window.__AGAR_QA__?.() ?? null);
  if (!qaReady) {
    mark("agar-split-cells-change", false, { note: "setup fail" });
    return;
  }

  const cellsBefore = setup?.cells ?? 0;
  await page.keyboard.press("Space");
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => window.__AGAR_QA__?.() ?? null);
  mark("agar-split-cells-change", (after?.cells ?? 0) > cellsBefore || (after?.cells ?? 0) >= 2, {
    cellsBefore,
    cellsAfter: after?.cells,
  });
}

async function probeBomberAiMovement(page) {
  await page.goto(`${BASE}${invitePath("bomber", "BOMBER-D", "mp_qa_local=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "bomber");
  await page
    .waitForFunction(() => typeof window.__BOMBER_QA__ === "function" && window.__BOMBER_QA__()?.local, {
      timeout: 30_000,
    })
    .catch(() => {});
  const before = await page.evaluate(() => {
    const qa = window.__BOMBER_QA__?.();
    if (!qa) return null;
    const bots = qa.players.filter((p) => p.isBot);
    return { bots, tick: qa.tick ?? 0 };
  });
  dualContext.aiPosition_before = before?.bots[0] ?? null;
  await page.waitForTimeout(12_000);
  const after = await page.evaluate(() => {
    const qa = window.__BOMBER_QA__?.();
    if (!qa) return null;
    const bots = qa.players.filter((p) => p.isBot);
    return { bots, tick: qa.tick ?? 0 };
  });
  dualContext.aiPosition_after = after?.bots[0] ?? null;
  const moved =
    before &&
    after &&
    (after.tick ?? 0) > (before.tick ?? 0) &&
    after.bots.some((b, i) => {
      const s = before.bots[i];
      return s && (b.x !== s.x || b.y !== s.y);
    });
  mark("bomber-ai-movement-10s", moved, { before, after });
}

async function probeDualContextBomber(browser) {
  const room = "BOMBER-D";
  const url = `${BASE}${invitePath("bomber", room)}`;
  const deviceA = `qa010-host-${Date.now()}`;
  const deviceB = `qa010-guest-${Date.now() + 1}`;

  const ctxA = await newContextWithDevice(browser, deviceA);
  const ctxB = await newContextWithDevice(browser, deviceB);
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await pageA.setViewportSize(devices["iPhone 13"].viewport);
    await pageB.setViewportSize(devices["iPhone 13"].viewport);

    await pageA.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await enterGame(pageA, "bomber", { strictReady: true });
    await pageA
      .waitForFunction(
        () => {
          const qa = window.__BOMBER_QA__?.();
          return qa?.local && qa?.isHost === true && qa?.stateAck === true;
        },
        { timeout: 45_000 }
      )
      .catch(() => {});
    await pageA.waitForTimeout(8000);

    await pageB.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await enterGame(pageB, "bomber");
    await pageB
      .waitForFunction(() => window.__BOMBER_QA__?.().stateAck === true, { timeout: 40_000 })
      .catch(() => {});
    await pageB
      .waitForFunction(() => window.__BOMBER_QA__?.().local?.alive === true, { timeout: 20_000 })
      .catch(() => {});
    await pageA.waitForTimeout(5000);
    await pageB.waitForTimeout(5000);

    const qaA = await pageA.evaluate(() => window.__BOMBER_QA__?.() ?? null);
    const qaB = await pageB.evaluate(() => window.__BOMBER_QA__?.() ?? null);

    dualContext.roomId = qaA?.roomId ?? room;
    dualContext.playerA = qaA?.deviceId ?? null;
    dualContext.playerB = qaB?.deviceId ?? null;
    dualContext.spawnA = qaA?.local ? { ...qaA.local } : null;
    dualContext.spawnB = qaB?.local ? { ...qaB.local } : null;
    dualContext.positionA_before = dualContext.spawnA ? { ...dualContext.spawnA } : null;
    dualContext.positionB_before = dualContext.spawnB ? { ...dualContext.spawnB } : null;

    mark(
      "gate-host-seat",
      !!(qaA?.local && qaA?.isHost === true && qaA?.stateAck && qaA.local.alive !== false),
      { spawnA: qaA?.local, isHost: qaA?.isHost, stateAck: qaA?.stateAck }
    );
    mark("gate-guest-seat", !!(qaB?.local && qaB?.stateAck), { spawnB: qaB?.local });
    mark("gate-distinct-spawn", !!(qaA?.local && qaB?.local && (qaA.local.x !== qaB.local.x || qaA.local.y !== qaB.local.y)), {
      spawnA: qaA?.local,
      spawnB: qaB?.local,
    });

    const idA = qaA?.deviceId;
    const idB = qaB?.deviceId;

    for (let i = 0; i < 6; i++) {
      await moveBomber(pageA, "right", 1);
    }
    if (!(await readBomberGrid(pageA))) {
      for (let i = 0; i < 6; i++) {
        await moveBomber(pageA, "down", 1);
      }
    }
    await pageA.waitForTimeout(1500);
    await pageB.waitForTimeout(1500);

    const posA1 = await readBomberGrid(pageA);
    const posAOnB = idA ? await readBomberPlayer(pageB, idA) : null;
    dualContext.positionA_after = posA1;

    const aMoved =
      dualContext.positionA_before && posA1
        ? posA1.x !== dualContext.positionA_before.x || posA1.y !== dualContext.positionA_before.y
        : false;
    const aVisibleOnB = !!(
      posA1 &&
      posAOnB &&
      Math.abs(posAOnB.x - posA1.x) <= 1 &&
      Math.abs(posAOnB.y - posA1.y) <= 1
    );
    mark("gate-a-move-sync", aMoved && aVisibleOnB, { posA0: dualContext.positionA_before, posA1, posAOnB });

    for (let i = 0; i < 6; i++) {
      await moveBomber(pageB, "down", 1);
    }
    if ((await readBomberGrid(pageB))?.y === dualContext.positionB_before?.y) {
      for (let i = 0; i < 6; i++) {
        await moveBomber(pageB, "right", 1);
      }
    }
    await pageA.waitForTimeout(1500);
    await pageB.waitForTimeout(1500);

    const posB2 = await readBomberGrid(pageB);
    const posBOnA = idB ? await readBomberPlayer(pageA, idB) : null;
    dualContext.positionB_after = posB2;

    const bMoved =
      dualContext.positionB_before && posB2
        ? posB2.x !== dualContext.positionB_before.x || posB2.y !== dualContext.positionB_before.y
        : false;
    const bVisibleOnA = !!(
      posB2 &&
      posBOnA &&
      Math.abs(posBOnA.x - posB2.x) <= 1 &&
      Math.abs(posBOnA.y - posB2.y) <= 1
    );
    mark("gate-b-move-sync", bMoved && bVisibleOnA, { posB0: dualContext.positionB_before, posB2, posBOnA });

    const bombPlanted = await pageA.evaluate(() => {
      if (typeof window.__BOMBER_QA_PLANT__ !== "function") return null;
      window.__BOMBER_QA_PLANT__();
      const qa = window.__BOMBER_QA__?.();
      const mine = qa?.bombs.find((b) => b.ownerId === qa.deviceId);
      return mine ?? null;
    });
    await pageA.waitForTimeout(800);
    await pageB.waitForTimeout(800);

    const bombsA = await pageA.evaluate(() => window.__BOMBER_QA__?.().bombs ?? []);
    const bombsB = await pageB.evaluate(() => window.__BOMBER_QA__?.().bombs ?? []);
    const playerBomb = bombsA.find((b) => b.ownerId === idA) ?? bombPlanted;
    dualContext.bombId = playerBomb?.id ?? null;
    dualContext.bombPosition = playerBomb ? { x: playerBomb.x, y: playerBomb.y } : null;
    dualContext.bombOwnerId = playerBomb?.ownerId ?? null;

    const isPlayerBomb =
      !!playerBomb &&
      playerBomb.ownerId === idA &&
      !String(playerBomb.ownerId).startsWith("bot");
    dualContext.playerBombOnly = isPlayerBomb;

    const bombSync =
      isPlayerBomb && bombsB.some((b) => b.ownerId === idA && b.x === playerBomb.x && b.y === playerBomb.y);
    mark("gate-player-bomb-sync", bombSync, {
      playerBomb,
      bombsA,
      bombsB,
      ownerId: playerBomb?.ownerId,
    });

    let explosionSync = false;
    for (let i = 0; i < 30; i++) {
      await pageA.waitForTimeout(150);
      const snapA = await pageA.evaluate(() => window.__BOMBER_QA__?.() ?? null);
      const snapB = await pageB.evaluate(() => window.__BOMBER_QA__?.() ?? null);
      const blastMatch = (snapA?.blasts ?? 0) > 0 && (snapB?.blasts ?? 0) > 0;
      const bombsCleared =
        playerBomb &&
        !(snapA?.bombs ?? []).some((b) => b.id === playerBomb.id) &&
        !(snapB?.bombs ?? []).some((b) => b.id === playerBomb.id);
      if (blastMatch || bombsCleared) {
        explosionSync = true;
        dualContext.explosion = true;
        break;
      }
    }
    mark("gate-explosion-sync", explosionSync, { dualContextExplosion: dualContext.explosion });

    const deathOnA = await pageA.evaluate(
      (id) => window.__BOMBER_QA__?.().players.find((p) => p.id === id)?.alive === false,
      idA
    );
    const deathOnB = await pageB.evaluate(
      (id) => window.__BOMBER_QA__?.().players.find((p) => p.id === id)?.alive === false,
      idA
    );
    dualContext.death = deathOnA && deathOnB;
    mark("gate-death-sync", dualContext.death, { deathOnA, deathOnB, victim: idA });

    await pageA.screenshot({ path: join(SHOTS, "dual-context-a.png"), fullPage: true });
    await pageB.screenshot({ path: join(SHOTS, "dual-context-b.png"), fullPage: true });
  } finally {
    await pageA.close();
    await pageB.close();
    await ctxA.close();
    await ctxB.close();
  }
}

function gateSummary() {
  const ok = (n) => checks.find((c) => c.name === n)?.ok;
  const mobileChecks = checks.filter(
    (c) =>
      c.name.includes("mobile") ||
      c.name.includes("floating") ||
      c.name.startsWith("snake-mobile") ||
      c.name.startsWith("agar-mobile") ||
      c.name.startsWith("bomber-mobile")
  );
  const gates = {
    hostSeat: ok("gate-host-seat"),
    guestSeat: ok("gate-guest-seat"),
    distinctSpawn: ok("gate-distinct-spawn"),
    aMoveSync: ok("gate-a-move-sync"),
    bMoveSync: ok("gate-b-move-sync"),
    playerBombSync: ok("gate-player-bomb-sync"),
    explosionSync: ok("gate-explosion-sync"),
    deathSync: ok("gate-death-sync"),
    bomberAi: ok("bomber-ai-movement-10s"),
    mobilePad: mobileChecks.length > 0 && mobileChecks.every((c) => c.ok),
    agarSplit: ok("agar-split-setup-ready") && ok("agar-split-cells-change"),
    regression:
      ok("bomber-host-seat-unit") &&
      ok("bomber-bomb-authority-unit") &&
      ok("snake-ai-movement-unit"),
  };
  const ctoPass = Object.values(gates).every(Boolean);
  return { ...gates, ctoPass, ctoTotal: 12, ctoPassed: Object.values(gates).filter(Boolean).length };
}

function writeReports(pass) {
  const gates = gateSummary();
  verifyReport.gates = gates;
  verifyReport.finishedAt = new Date().toISOString();
  verifyReport.pass = pass;
  verifyReport.summary = {
    passed: checks.filter((c) => c.ok).length,
    total: checks.length,
    failed: checks.filter((c) => !c.ok).map((c) => c.name),
    cto: `${gates.ctoPassed}/${gates.ctoTotal}`,
  };

  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(verifyReport, null, 2));
  writeFileSync(join(OUT, "dual-context-report.json"), JSON.stringify(dualContext, null, 2));

  const cto = `# MP-CTO-CPO-QA-010 — CTO Report

Commit: ${COMMIT}
Preview: ${BASE}
Finished: ${verifyReport.finishedAt}

## 12/12 CTO Gates
| # | Gate | Result |
| --- | --- | --- |
| 1 | Host seat (spawnA != null) | ${gates.hostSeat ? "PASS" : "FAIL"} |
| 2 | Guest seat | ${gates.guestSeat ? "PASS" : "FAIL"} |
| 3 | Distinct spawn | ${gates.distinctSpawn ? "PASS" : "FAIL"} |
| 4 | A move sync | ${gates.aMoveSync ? "PASS" : "FAIL"} |
| 5 | B move sync | ${gates.bMoveSync ? "PASS" : "FAIL"} |
| 6 | Player bomb sync (NOT bot) | ${gates.playerBombSync ? "PASS" : "FAIL"} |
| 7 | Explosion sync | ${gates.explosionSync ? "PASS" : "FAIL"} |
| 8 | Death sync | ${gates.deathSync ? "PASS" : "FAIL"} |
| 9 | Bomber AI 10s | ${gates.bomberAi ? "PASS" : "FAIL"} |
| 10 | Mobile regression | ${gates.mobilePad ? "PASS" : "FAIL"} |
| 11 | Agar split regression | ${gates.agarSplit ? "PASS" : "FAIL"} |
| 12 | Unit regression | ${gates.regression ? "PASS" : "FAIL"} |

## Auto checks
${verifyReport.summary.passed}/${verifyReport.summary.total}

## Failed
${verifyReport.summary.failed.map((n) => `- ${n}`).join("\n") || "none"}

**CTO FINAL:** ${gates.ctoPass ? "PASS" : "FAIL"} (${gates.ctoPassed}/12)
**CPO Review Ready:** ${gates.ctoPass ? "YES" : "NO"}
**CEO Test:** HOLD
**Production:** HOLD
`;
  writeFileSync(join(OUT, "CTO-REPORT.md"), cto);
}

async function main() {
  probeCode();
  probeUnitTests();

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ hasTouch: true });
  const page = await ctx.newPage();

  try {
    for (const slug of ["snake", "agar", "bomber"]) {
      const p = await ctx.newPage();
      try {
        await probeFloatingMobile(p, slug);
      } finally {
        await p.close();
      }
    }

    await probeAgarSplit(page);

    const aiPage = await ctx.newPage();
    try {
      await probeBomberAiMovement(aiPage);
    } finally {
      await aiPage.close();
    }

    await probeDualContextBomber(browser);

    const gates = gateSummary();
    const pass = gates.ctoPass;

    writeReports(pass);

    console.log("\n=== MP-CTO-CPO-QA-010 SUMMARY ===");
    console.log(JSON.stringify(verifyReport.summary, null, 2));
    console.log(JSON.stringify(gates, null, 2));
    process.exit(pass ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
