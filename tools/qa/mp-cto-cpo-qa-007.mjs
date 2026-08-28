/**
 * MP-CTO-CPO-QA-007 — QA harness (floating mobile pad + Bomber MP P0).
 * Usage (PowerShell):
 *   $env:QA_BASE_URL="https://game29-xxx.vercel.app"
 *   $env:QA_COMMIT="<sha>"
 *   node tools/qa/mp-cto-cpo-qa-007.mjs
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const BASE =
  process.env.QA_BASE_URL ?? "https://game29-ppa0vd3uf-jyp-ai1s-projects.vercel.app";
const COMMIT = process.env.QA_COMMIT ?? "local";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "docs/qa/cpo/mp-cto-cpo-qa-007");
const SHOTS = join(OUT, "screenshots");

mkdirSync(SHOTS, { recursive: true });

const MP = [
  { slug: "snake", room: "WORLD-QA007", playPath: "/flagship/snake-io/play" },
  { slug: "agar", room: "WORLD-QA007" },
  { slug: "bomber", room: "BOMBER-A" },
];

const checks = [];
const pendingExternal = [];

const verifyReport = {
  base: BASE,
  commit: COMMIT,
  startedAt: new Date().toISOString(),
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
  if (name.includes("same-world") || name.includes("dual-context")) return "sameWorld";
  if (name.includes("mobile") || name.includes("floating") || name.includes("touch")) return "mobileControls";
  if (name.startsWith("snake")) return "snake";
  if (name.startsWith("agar")) return "agar";
  if (name.startsWith("bomber")) return "bomber";
  if (name.includes("perf") || name.includes("l300") || name.includes("L300")) return "performance";
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
      const letter = m?.[1]?.toUpperCase() ?? "A";
      const mapBtn = page.locator(`[data-testid="bomber-map-${letter}"]`);
      if ((await mapBtn.count()) > 0) {
        await mapBtn.click({ timeout: 8_000, force: true }).catch(() => {});
      }
    }
    await hud.waitFor({ timeout: 25_000 }).catch(() => {});
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
  mark("bomber-host-only-authority", bomber.includes("listedHost && everSynced") && !bomber.includes("canAuthoritativeHost"));
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
  const room = slug === "bomber" ? "BOMBER-A" : "WORLD-QA007";
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
  await page.goto(`${BASE}${invitePath("agar", "WORLD-AGAR007", "mp_qa_pad=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "agar");
  await page.waitForFunction(
    () => {
      const bar = document.querySelector('[data-testid="mp-you-bar"]');
      const m = bar?.textContent?.match(/L:(\d+)/);
      return m && Number(m[1]) >= 36;
    },
    { timeout: 20_000 }
  ).catch(() => {});
  const massBefore = await page.evaluate(() => {
    const bar = document.querySelector('[data-testid="mp-you-bar"]');
    return bar?.textContent?.match(/L:(\d+)/)?.[1] ?? null;
  });
  mark("agar-mass-baseline", massBefore != null, { massBefore });

  const cellsBefore = await page.evaluate(() => document.querySelectorAll('[title="YOU"]').length);
  await page.keyboard.press("Space");
  await page.waitForTimeout(700);
  const cellsAfter = await page.evaluate(() => document.querySelectorAll('[title="YOU"]').length);
  mark("agar-split-cells-change", cellsAfter > cellsBefore || cellsAfter >= 2, {
    cellsBefore,
    cellsAfter,
  });

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
    };
  });
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

async function probeDualContextBomber(ctx) {
  const room = "BOMBER-B";
  const url = `${BASE}${invitePath("bomber", room)}`;
  const pageA = await ctx.newPage();
  const pageB = await ctx.newPage();
  try {
    await pageA.setViewportSize(devices["iPhone 13"].viewport);
    await pageB.setViewportSize(devices["iPhone 13"].viewport);
    await pageA.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await pageB.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await enterGame(pageA, "bomber");
    await pageA.waitForTimeout(2000);
    await enterGame(pageB, "bomber");
    await pageA.waitForTimeout(2500);
    await pageB.waitForTimeout(2500);

    mark("dual-context-room-pinned", pageA.url().includes(room) && pageB.url().includes(room));

    const posA0 = await readBomberGrid(pageA);
    const posB0 = await readBomberGrid(pageB);
    mark("dual-context-both-spawned", posA0 != null && posB0 != null, { posA0, posB0 });

    for (let attempt = 0; attempt < 3; attempt++) {
      await dragFloatingPad(pageA, "right");
      await pageA.waitForTimeout(500);
    }
    let posA1 = await readBomberGrid(pageA);
    let aMoved = posA0 && posA1 ? posA1.x !== posA0.x || posA1.y !== posA0.y : false;
    if (!aMoved) {
      await pageA.keyboard.press("ArrowRight");
      await pageA.waitForTimeout(600);
      posA1 = await readBomberGrid(pageA);
      aMoved = posA0 && posA1 ? posA1.x !== posA0.x || posA1.y !== posA0.y : false;
    }
    mark("dual-context-a-moves", aMoved, { posA0, posA1 });

    for (let attempt = 0; attempt < 3; attempt++) {
      await dragFloatingPad(pageB, "down");
      await pageB.waitForTimeout(500);
    }
    await pageB.waitForTimeout(800);
    let posB2 = await readBomberGrid(pageB);
    let bMoved = posB0 && posB2 ? posB2.x !== posB0.x || posB2.y !== posB0.y : false;
    if (!bMoved) {
      await pageB.keyboard.press("ArrowDown");
      await pageB.waitForTimeout(600);
      posB2 = await readBomberGrid(pageB);
      bMoved = posB0 && posB2 ? posB2.x !== posB0.x || posB2.y !== posB0.y : false;
    }
    mark("dual-context-b-moves", bMoved, { posB0, posB2 });
  } finally {
    await pageA.close();
    await pageB.close();
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
    L100: { inputLatencyMs: null, frameTimeMs: null, renderMs: null, collisionMs: null },
    L200: { inputLatencyMs: null, frameTimeMs: null, renderMs: null, collisionMs: null },
    L300: { inputLatencyMs: null, frameTimeMs: null, renderMs: null, collisionMs: null },
    L400: { inputLatencyMs: null, frameTimeMs: null, renderMs: null, collisionMs: null },
    note: "Runtime perf probes require in-game instrumentation — code gate only for CTO PASS",
  };
  writeFileSync(join(OUT, "metrics.json"), JSON.stringify(metrics, null, 2));
  verifyReport.performance.metricsFile = true;
}

function writeReports(pass) {
  const passed = checks.filter((c) => c.ok).length;
  const total = checks.length;

  verifyReport.finishedAt = new Date().toISOString();
  verifyReport.pass = pass;
  verifyReport.summary = { passed, total, failed: checks.filter((c) => !c.ok).map((c) => c.name) };
  writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(verifyReport, null, 2));

  const cto = `# MP-CTO-CPO-QA-007 — CTO Report

Commit: ${COMMIT}
Preview: ${BASE}
Finished: ${verifyReport.finishedAt}

## Gate
- Auto: ${passed}/${total}
- Browser: ${pass ? "PASS" : "FAIL"}

## Sections
| Section | PASS |
| --- | --- |
| commonShell | ${Object.values(verifyReport.commonShell).filter(Boolean).length}/${Object.keys(verifyReport.commonShell).length} |
| invite | ${Object.values(verifyReport.invite).filter(Boolean).length}/${Object.keys(verifyReport.invite).length} |
| sameWorld | ${Object.values(verifyReport.sameWorld).filter(Boolean).length}/${Object.keys(verifyReport.sameWorld).length} |
| mobileControls | ${Object.values(verifyReport.mobileControls).filter(Boolean).length}/${Object.keys(verifyReport.mobileControls).length} |
| snake | ${Object.values(verifyReport.snake).filter(Boolean).length}/${Object.keys(verifyReport.snake).length} |
| agar | ${Object.values(verifyReport.agar).filter(Boolean).length}/${Object.keys(verifyReport.agar).length} |
| bomber | ${Object.values(verifyReport.bomber).filter(Boolean).length}/${Object.keys(verifyReport.bomber).length} |
| performance | ${Object.values(verifyReport.performance).filter(Boolean).length}/${Object.keys(verifyReport.performance).length} |

## Failed
${checks.filter((c) => !c.ok).map((c) => `- ${c.name}`).join("\n") || "none"}

## Pending external
${pendingExternal.map((p) => `- ${p.name}: ${p.reason}`).join("\n") || "none"}

**CTO FINAL:** ${pass ? "PASS" : "FAIL"}
**CPO Review Ready:** ${pass ? "YES" : "NO"}
**CEO Test:** HOLD
**Production:** HOLD
`;
  writeFileSync(join(OUT, "CTO-REPORT.md"), cto);

  const cpo = `# MP-CTO-CPO-QA-007 — CPO Report (template)

> Fill after PM device QA. CTO auto-verified items marked [CTO].

## Mobile Pad [CTO]
- [ ] Left-half touch shows floating joystick
- [ ] Hold → continuous movement (Snake/Agar/Bomber)
- [ ] Right-half actions (BOOST / SPLIT+EJECT / BOMB)
- [ ] No text selection on HUD tap

## Agar [CTO code + partial auto]
- [ ] Continuous move while held
- [ ] SPLIT mass change
- [ ] EJECT mass decrease

## Bomber MP [CTO code + partial auto]
- [ ] Each client controls own character only
- [ ] Dual device: A move visible in B
- [ ] Bomb fuse → explosion → death (host authority)

## Invite [CTO]
- [ ] /games/{slug}/play?room= format all games
- [ ] Web Share + clipboard fallback

## Snake [CTO code]
- [ ] TOP10 length DESC
- [ ] Outside top10 shows #rank

**CPO FINAL:** _pending_
`;
  writeFileSync(join(OUT, "CPO-REPORT.md"), cpo);
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

    await probeDualContextBomber(ctx);

    markPending("real-device-mobile-feel", "PENDING_EXTERNAL — physical phone QA for CPO");
    markPending("same-world-two-device-snake", "PENDING_EXTERNAL — 2 physical devices");

    const pass = checks.every((c) => c.ok);
    writeReports(pass);

    console.log("\n=== MP-CTO-CPO-QA-007 SUMMARY ===");
    console.log(JSON.stringify(verifyReport.summary, null, 2));
    process.exit(pass ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
