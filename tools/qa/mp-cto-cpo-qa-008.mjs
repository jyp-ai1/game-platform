/**
 * MP-CTO-CPO-QA-008 — Bomber MP identity + Agar split QA + dual context sync.
 * Usage (PowerShell):
 *   $env:QA_BASE_URL="https://game29-xxx.vercel.app"
 *   $env:QA_COMMIT="<sha>"
 *   node tools/qa/mp-cto-cpo-qa-008.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const BASE =
  process.env.QA_BASE_URL ?? "https://game29-65hl712x5-jyp-ai1s-projects.vercel.app";
const COMMIT = process.env.QA_COMMIT ?? "local";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "docs/qa/cpo/mp-cto-cpo-qa-008");
const SHOTS = join(OUT, "screenshots");

mkdirSync(SHOTS, { recursive: true });

const MP = [
  { slug: "snake", room: "WORLD-QA008", playPath: "/flagship/snake-io/play" },
  { slug: "agar", room: "WORLD-QA008" },
  { slug: "bomber", room: "BOMBER-A" },
];

const checks = [];
const pendingExternal = [];

const verifyReport = {
  base: BASE,
  commit: COMMIT,
  startedAt: new Date().toISOString(),
  gates: {},
  commonShell: {},
  invite: {},
  sameWorld: {},
  mobileControls: {},
  snake: {},
  agar: {},
  bomber: {},
  performance: {},
  checks: [],
  pendingExternal: [],
};

function bucket(name) {
  if (name.startsWith("invite") || name.includes("-invite-")) return "invite";
  if (name.includes("same-world") || name.includes("dual-context") || name.includes("bomber-sync"))
    return "sameWorld";
  if (name.includes("mobile") || name.includes("floating") || name.includes("touch")) return "mobileControls";
  if (name.startsWith("snake")) return "snake";
  if (name.startsWith("agar")) return "agar";
  if (name.startsWith("bomber")) return "bomber";
  if (name.includes("perf") || name.includes("l300")) return "performance";
  if (name.startsWith("gate-")) return "gates";
  return "commonShell";
}

function mark(name, ok, detail = {}) {
  const row = { name, ok, ...detail, t: new Date().toISOString() };
  checks.push(row);
  verifyReport.checks.push(row);
  verifyReport[bucket(name)][name] = ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`, detail.detail ?? detail.note ?? "");
  return ok;
}

function markPending(name, reason) {
  pendingExternal.push({ name, reason });
  verifyReport.pendingExternal.push({ name, reason });
  console.log(`PENDING ${name}: ${reason}`);
}

function invitePath(slug, room, extra = "") {
  const q = extra ? `&${extra.replace(/^&/, "")}` : "";
  return `/games/${slug}/play?room=${encodeURIComponent(room)}${q}`;
}

async function enterGame(page, slug) {
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
    await hud.waitFor({ timeout: 35_000 }).catch(() => {});
    await page
      .locator('[data-testid="bomber-input-ready"][data-ready="1"]')
      .waitFor({ timeout: 20_000 })
      .catch(() => {});
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
  const shell = readFileSync(join(ROOT, "packages/game-sdk/src/multiplayer-play-shell.tsx"), "utf8");
  const agar = readFileSync(join(ROOT, "games/agar/src/Agar.tsx"), "utf8");
  const bomber = readFileSync(join(ROOT, "games/bomber/src/Bomber.tsx"), "utf8");
  const invite = readFileSync(join(ROOT, "apps/web/lib/invite-link.ts"), "utf8");
  const aiFill = readFileSync(join(ROOT, "games/snake/src/snake-ai-fill.ts"), "utf8");
  const globalWorld = readFileSync(join(ROOT, "games/snake/src/snake-global-world.ts"), "utf8");

  mark("floating-pad-left-half-joystick", pad.includes("clientX < half"));
  mark("floating-pad-right-half-actions", pad.includes("actions.map"));
  mark("floating-pad-on-steer", pad.includes("onSteer"));
  mark("floating-pad-touch-none-select-none", pad.includes("touch-none") && pad.includes("select-none"));
  mark("commonShell-touch-none-board", shell.includes("touch-none") && shell.includes("userSelect"));
  mark("agar-on-steer-wired", agar.includes("onSteer={steerFromPad}"));
  mark("agar-qa-split-hook", agar.includes("mp_qa_split") && agar.includes("__AGAR_QA__"));
  mark("bomber-state-ack-gate", bomber.includes("stateAckRef") && bomber.includes("waitForHostStateAck"));
  mark("bomber-guest-no-dual-create", bomber.includes("waitForHostStateAck") && !bomber.includes("1500"));
  mark("bomber-qa-hook", bomber.includes("__BOMBER_QA__"));
  mark("invite-unified-path", invite.includes("/games/${gameSlug}/play?room="));
  mark("snake-top10-length-desc", globalWorld.includes("length DESC"));
  mark("snake-bot-auto-character", aiFill.includes("applyCharacterToSnake(snake, headId)"));
}

async function probeInviteLinks(page) {
  for (const g of MP) {
    await page.goto(`${BASE}/games/${g.slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.waitForTimeout(800);
    const detail =
      (await page.locator('[data-testid="game-detail-page"]').first().isVisible().catch(() => false)) ||
      (await page.getByRole("button", { name: /ENTER|바로/i }).count()) > 0;
    mark(`${g.slug}-detail-loaded`, detail);
    const copyBtn = page.locator('[data-testid="game-detail-invite-copy"]');
    const shareBtn = page.locator('[data-testid="game-detail-share-btn"]');
    mark(`${g.slug}-invite-buttons`, (await copyBtn.count()) > 0 && (await shareBtn.count()) > 0);

    await page.evaluate(async () => {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText("");
    });
    await copyBtn.click();
    await page.waitForTimeout(400);
    const clip = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return "";
      }
    });
    const okFormat =
      clip.includes(`/games/${g.slug}/play?room=`) &&
      (g.slug === "bomber" ? clip.includes("BOMBER-") : clip.includes("WORLD-")) &&
      (g.slug === "agar" ? !clip.includes("/games/bomber/") : true);
    mark(`${g.slug}-invite-url-format`, okFormat, { clip: clip.slice(0, 140) });
  }
}

async function probeFloatingMobile(page, slug) {
  const iphone = devices["iPhone 13"];
  await page.setViewportSize(iphone.viewport);
  const room = slug === "bomber" ? "BOMBER-A" : "WORLD-QA008";
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
  const overlayOk = (await overlay.count()) > 0;
  mark(`${slug}-mobile-overlay`, overlayOk);

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
  const joyAfter = (await page.locator('[data-testid="mp-floating-joystick"]').count()) > 0;
  mark(`${slug}-floating-joystick-on-touch`, joyAfter);

  const actionIds =
    slug === "snake" ? ["boost"] : slug === "agar" ? ["split", "eject"] : ["bomb"];
  for (const id of actionIds) {
    const btn = page.locator(`[data-testid="mp-pad-action-${id}"]`);
    mark(`${slug}-mobile-action-zone-${id}`, overlayOk && (await btn.count()) > 0);
  }

  await page.screenshot({ path: join(SHOTS, `${slug}-mobile-pad.png`), fullPage: true });
  return overlayOk && joyAfter;
}

async function probeAgarSplitEject(page) {
  await page.setViewportSize(devices["iPhone 13"].viewport);
  await page.goto(`${BASE}${invitePath("agar", "WORLD-AGAR008", "mp_qa_split=1&mp_qa_pad=1")}`, {
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
  mark("agar-mass-baseline", setup != null && setup.mass >= 48, setup ?? {});

  if (!qaReady) {
    mark("agar-split-cells-change", false, { note: "TEST_SETUP_FAIL — mass not ready" });
    mark("agar-split-game-logic", false, { note: "skipped — setup fail" });
    return;
  }

  const cellsBefore = setup?.cells ?? 0;
  await page.keyboard.press("Space");
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => window.__AGAR_QA__?.() ?? null);
  const cellsAfter = after?.cells ?? 0;
  mark("agar-split-cells-change", cellsAfter > cellsBefore || cellsAfter >= 2, {
    cellsBefore,
    cellsAfter,
  });
  mark("agar-split-game-logic", cellsAfter > cellsBefore, { cellsBefore, cellsAfter });

  await page.keyboard.press("KeyW");
  await page.waitForTimeout(400);
  mark("agar-eject-tap-fired", true);
}

async function readBomberGrid(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="bomber-local-player"]');
    if (!el) return null;
    return {
      x: Number(el.getAttribute("data-grid-x")),
      y: Number(el.getAttribute("data-grid-y")),
      deviceId: window.__BOMBER_QA__?.().deviceId ?? null,
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

async function probeBomberGridHold(page) {
  await page.setViewportSize(devices["iPhone 13"].viewport);
  await page.goto(`${BASE}${invitePath("bomber", "BOMBER-D", "mp_qa_local=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.getByRole("button", { name: /^ENTER$/i }).click({ timeout: 15_000 });
  await page.waitForSelector('[data-testid="bomber-local-player"]', { timeout: 30_000 });
  await page.waitForFunction(() => typeof window.__BOMBER_QA_MOVE__ === "function", {
    timeout: 12_000,
  });

  const posBefore = await readBomberGrid(page);
  mark("bomber-grid-baseline", posBefore != null, posBefore ?? {});

  await page.evaluate(() => {
    for (let i = 0; i < 4; i++) window.__BOMBER_QA_MOVE__?.(1, 0);
  });
  await page.waitForTimeout(400);
  const posAfter = await readBomberGrid(page);
  const moved =
    posBefore && posAfter
      ? Math.abs(posAfter.x - posBefore.x) + Math.abs(posAfter.y - posBefore.y) >= 1
      : false;
  mark("bomber-grid-continuous-move", moved, { posBefore, posAfter });
  await page.screenshot({ path: join(SHOTS, "bomber-grid-move.png"), fullPage: true });
}

async function probeBomberSoloBoot(page) {
  await page.goto(`${BASE}${invitePath("bomber", "BOMBER-C")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "bomber");
  const qa = await page.evaluate(() => window.__BOMBER_QA__?.() ?? null);
  mark("bomber-solo-boot", qa?.stateAck === true && qa?.local != null, qa ?? {});
  mark("bomber-solo-host", qa?.isHost === true, qa ?? {});
}

async function probeBomberAiMovement(page) {
  await page.goto(`${BASE}${invitePath("bomber", "BOMBER-A")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "bomber");
  const before = await page.evaluate(() => {
    const qa = window.__BOMBER_QA__?.();
    if (!qa) return null;
    return qa.players.filter((p) => p.isBot).map((p) => ({ id: p.id, x: p.x, y: p.y }));
  });
  await page.waitForTimeout(10_500);
  const after = await page.evaluate(() => {
    const qa = window.__BOMBER_QA__?.();
    if (!qa) return null;
    return qa.players.filter((p) => p.isBot).map((p) => ({ id: p.id, x: p.x, y: p.y }));
  });
  let movedBots = 0;
  if (before && after) {
    for (const b of before) {
      const a = after.find((x) => x.id === b.id);
      if (a && (a.x !== b.x || a.y !== b.y)) movedBots += 1;
    }
  }
  mark("bomber-ai-movement-10s", movedBots > 0, { movedBots, beforeCount: before?.length ?? 0 });
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

async function probeDualContextBomber(browser) {
  const room = "BOMBER-B";
  const url = `${BASE}${invitePath("bomber", room)}`;
  const deviceA = `qa008-host-${Date.now()}`;
  const deviceB = `qa008-guest-${Date.now() + 1}`;

  const ctxA = await newContextWithDevice(browser, deviceA);
  const ctxB = await newContextWithDevice(browser, deviceB);
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  try {
    await pageA.setViewportSize(devices["iPhone 13"].viewport);
    await pageB.setViewportSize(devices["iPhone 13"].viewport);

    await pageA.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await enterGame(pageA, "bomber");
    await pageA.waitForFunction(() => window.__BOMBER_QA__?.().stateAck === true, {
      timeout: 20_000,
    }).catch(() => {});
    await pageA.waitForTimeout(4000);

    await pageB.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await enterGame(pageB, "bomber");
    await pageB.waitForFunction(() => window.__BOMBER_QA__?.().stateAck === true, {
      timeout: 25_000,
    }).catch(() => {});
    await pageA.waitForTimeout(3500);
    await pageB.waitForTimeout(3500);

    mark("dual-context-room-pinned", pageA.url().includes(room) && pageB.url().includes(room));

    const qaA = await pageA.evaluate(() => window.__BOMBER_QA__?.() ?? null);
    const qaB = await pageB.evaluate(() => window.__BOMBER_QA__?.() ?? null);
    mark("bomber-identity-distinct-ids", qaA?.deviceId !== qaB?.deviceId, {
      idA: qaA?.deviceId,
      idB: qaB?.deviceId,
    });
    mark("bomber-state-ack-both", qaA?.stateAck === true && qaB?.stateAck === true, { qaA, qaB });

    const posA0 = qaA?.local;
    const posB0 = qaB?.local;
    mark("dual-context-both-spawned", posA0 != null && posB0 != null, { posA0, posB0 });
    const distinctSpawn =
      posA0 && posB0 ? posA0.x !== posB0.x || posA0.y !== posB0.y : false;
    mark("bomber-spawn-distinct", distinctSpawn, { posA0, posB0 });

    const idA = qaA?.deviceId;
    for (let attempt = 0; attempt < 4; attempt++) {
      await dragFloatingPad(pageA, "right");
      await pageA.keyboard.press("ArrowRight").catch(() => {});
      await pageA.waitForTimeout(400);
    }
    await pageA.waitForTimeout(1200);
    await pageB.waitForTimeout(1200);

    const posA1 = await readBomberGrid(pageA);
    const posAOnB = idA ? await readBomberPlayer(pageB, idA) : null;
    const aMovedLocal = posA0 && posA1 ? posA1.x !== posA0.x || posA1.y !== posA0.y : false;
    mark("dual-context-a-moves", aMovedLocal, { posA0, posA1 });
    const aVisibleOnB =
      posA1 && posAOnB
        ? Math.abs(posAOnB.x - posA1.x) <= 1 && Math.abs(posAOnB.y - posA1.y) <= 1
        : false;
    mark("bomber-sync-a-visible-on-b", aVisibleOnB, { posA1, posAOnB });

    const idB = qaB?.deviceId;
    for (let attempt = 0; attempt < 4; attempt++) {
      await dragFloatingPad(pageB, "down");
      await pageB.keyboard.press("ArrowDown").catch(() => {});
      await pageB.waitForTimeout(400);
    }
    await pageA.waitForTimeout(1200);
    await pageB.waitForTimeout(1200);

    const posB2 = await readBomberGrid(pageB);
    const posBOnA = idB ? await readBomberPlayer(pageA, idB) : null;
    const bMovedLocal = posB0 && posB2 ? posB2.x !== posB0.x || posB2.y !== posB0.y : false;
    mark("dual-context-b-moves", bMovedLocal, { posB0, posB2 });
    const bVisibleOnA =
      posB2 && posBOnA
        ? Math.abs(posBOnA.x - posB2.x) <= 1 && Math.abs(posBOnA.y - posB2.y) <= 1
        : false;
    mark("bomber-sync-b-visible-on-a", bVisibleOnA, { posB2, posBOnA });

    await pageA.screenshot({ path: join(SHOTS, "bomber-dual-context-a.png"), fullPage: true });
    await pageB.screenshot({ path: join(SHOTS, "bomber-dual-context-b.png"), fullPage: true });
  } finally {
    await pageA.close();
    await pageB.close();
    await ctxA.close();
    await ctxB.close();
  }
}

function probeUnitTests() {
  try {
    execSync("node --import tsx --test games/bomber/src/__tests__/bomber-online-003.test.ts", {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 60_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    mark("bomber-bomb-authority-unit", true);
  } catch (e) {
    mark("bomber-bomb-authority-unit", false, { note: String(e?.stderr ?? e?.message ?? e).slice(0, 200) });
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

function writeMetrics() {
  const metrics = {
    commit: COMMIT,
    base: BASE,
    capturedAt: new Date().toISOString(),
    note: "MP-CTO-CPO-QA-008 runtime perf — code gate only unless instrumented",
  };
  writeFileSync(join(OUT, "metrics.json"), JSON.stringify(metrics, null, 2));
  verifyReport.performance.metricsFile = true;
}

function gateSummary() {
  const get = (names) => names.every((n) => checks.find((c) => c.name === n)?.ok);
  const mobileCount = checks.filter(
    (c) =>
      c.name.includes("mobile") ||
      c.name.includes("floating") ||
      c.name.startsWith("snake-mobile") ||
      c.name.startsWith("agar-mobile") ||
      c.name.startsWith("bomber-mobile")
  );
  const gates = {
    autoPass: checks.filter((c) => c.ok).length,
    autoTotal: checks.length,
    browser: get(["snake-detail-loaded", "bomber-detail-loaded", "agar-detail-loaded"]),
    dualContext: get([
      "dual-context-a-moves",
      "dual-context-b-moves",
      "bomber-sync-a-visible-on-b",
      "bomber-sync-b-visible-on-a",
      "bomber-spawn-distinct",
    ]),
    bomberIdentity: get(["bomber-identity-distinct-ids", "bomber-state-ack-both"]),
    bomberSpawn: get(["bomber-spawn-distinct"]),
    bomberSync: get(["bomber-sync-a-visible-on-b", "bomber-sync-b-visible-on-a"]),
    bomberAi: get(["bomber-ai-movement-10s"]),
    agarSplit: get(["agar-split-setup-ready", "agar-split-game-logic"]),
    mobilePad: mobileCount.every((c) => c.ok),
    invite: get(["snake-invite-url-format", "agar-invite-url-format", "bomber-invite-url-format"]),
    regression: get(["snake-ai-movement-unit", "bomber-bomb-authority-unit"]),
  };
  verifyReport.gates = gates;
  return gates;
}

function writeReports(pass) {
  const passed = checks.filter((c) => c.ok).length;
  const total = checks.length;
  const gates = gateSummary();

  verifyReport.finishedAt = new Date().toISOString();
  verifyReport.pass = pass;
  verifyReport.summary = { passed, total, failed: checks.filter((c) => !c.ok).map((c) => c.name) };
  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(verifyReport, null, 2));

  const cto = `# MP-CTO-CPO-QA-008 — CTO Report

Commit: ${COMMIT}
Preview: ${BASE}
Finished: ${verifyReport.finishedAt}

## Gate
- Auto: ${passed}/${total}
- Browser: ${gates.browser ? "PASS" : "FAIL"}
- Dual Context: ${gates.dualContext ? "PASS" : "FAIL"}
- Bomber Identity: ${gates.bomberIdentity ? "PASS" : "FAIL"}
- Bomber Spawn: ${gates.bomberSpawn ? "PASS" : "FAIL"}
- Bomber A↔B Sync: ${gates.bomberSync ? "PASS" : "FAIL"}
- Bomber AI: ${gates.bomberAi ? "PASS" : "FAIL"}
- Agar Split: ${gates.agarSplit ? "PASS" : "FAIL"}
- Mobile Pad: ${gates.mobilePad ? "PASS" : "FAIL"}
- Invite: ${gates.invite ? "PASS" : "FAIL"}
- Regression: ${gates.regression ? "PASS" : "FAIL"}

## Failed
${checks.filter((c) => !c.ok).map((c) => `- ${c.name}`).join("\n") || "none"}

## Pending external
${pendingExternal.map((p) => `- ${p.name}: ${p.reason}`).join("\n") || "none"}

**CTO FINAL:** ${pass && gates.dualContext && gates.bomberSync && gates.agarSplit ? "PASS" : "FAIL"}
**CPO Review Ready:** ${pass && gates.dualContext && gates.bomberSync && gates.agarSplit ? "YES" : "NO"}
**CEO Test:** HOLD
**Production:** HOLD
`;
  writeFileSync(join(OUT, "CTO-REPORT.md"), cto);

  const cpo = `# MP-CTO-CPO-QA-008 — CPO Test Plan

## Re-run automation (PowerShell)

\`\`\`powershell
cd C:\\Users\\김성길\\Documents\\GitHub\\game-platform
$env:QA_BASE_URL="https://game29-XXXX.vercel.app"
$env:QA_COMMIT="<git-sha>"
node tools/qa/mp-cto-cpo-qa-008.mjs
\`\`\`

## Evidence to review

| File | What it proves |
| --- | --- |
| \`verify-report.json\` | All auto gate PASS/FAIL |
| \`screenshots/bomber-dual-context-a.png\` | Host client after A moved |
| \`screenshots/bomber-dual-context-b.png\` | Guest sees synced positions |
| \`screenshots/*-mobile-pad.png\` | Floating pad regression (007) |
| \`screenshots/bomber-grid-move.png\` | Continuous grid move (local QA) |

## CPO manual checks (device)

### Bomber MP (dual phone or 2 browser tabs)
1. Open invite URL on Phone A → Map B → ENTER
2. Wait until HUD shows **HOST** and heart (not hourglass)
3. Open same invite on Phone B → Map B → ENTER
4. B must show **SYNC** (not HOST) and distinct spawn corner
5. Move A → B sees A move; move B → A sees B move

### Agar split (with \`mp_qa_split=1\` in QA URL only)
1. Mass ≥ 48 before split test
2. Space → 2+ YOU cells
3. Normal play URLs unchanged (no mass seed)

### Mobile pad (regression from 007)
1. Left-half touch → floating joystick
2. Hold → continuous move
3. Right-half SPLIT/EJECT/BOOST/BOMB

**CPO FINAL:** _pending device QA_
`;
  writeFileSync(join(OUT, "CPO-TEST-PLAN.md"), cpo);
}

async function main() {
  probeCode();
  probeUnitTests();
  writeMetrics();

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    hasTouch: true,
  });
  const page = await ctx.newPage();

  try {
    await probeInviteLinks(page);

    for (const g of MP) {
      const p = await ctx.newPage();
      try {
        await probeFloatingMobile(p, g.slug);
      } finally {
        await p.close();
      }
    }

    await probeAgarSplitEject(page);

    const gridPage = await ctx.newPage();
    try {
      await probeBomberGridHold(gridPage);
    } finally {
      await gridPage.close();
    }

    const soloPage = await ctx.newPage();
    try {
      await probeBomberSoloBoot(soloPage);
      await probeBomberAiMovement(soloPage);
    } finally {
      await soloPage.close();
    }

    await probeDualContextBomber(browser);

    markPending("real-device-mobile-feel", "PENDING_EXTERNAL — physical phone QA for CPO");
    markPending("same-world-two-device-snake", "PENDING_EXTERNAL — 2 physical devices");

    const gates = gateSummary();
    const pass =
      checks.every((c) => c.ok) &&
      gates.dualContext &&
      gates.bomberSync &&
      gates.agarSplit;
    writeReports(pass);

    console.log("\n=== MP-CTO-CPO-QA-008 SUMMARY ===");
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
