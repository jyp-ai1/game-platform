/**
 * MP-CTO-VERIFY-004 — Platform LIVE stabilization re-verify.
 * Usage (PowerShell):
 *   $env:QA_BASE_URL="https://game29-xxx.vercel.app"
 *   $env:QA_COMMIT="<sha>"
 *   node tools/qa/mp-cto-verify-004.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";

const BASE =
  process.env.QA_BASE_URL ?? "https://game29-czb26czv3-jyp-ai1s-projects.vercel.app";
const COMMIT = process.env.QA_COMMIT ?? "local";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "docs/qa/mp-cto-verify-004");

mkdirSync(OUT, { recursive: true });

const MP = [
  { slug: "snake", room: "WORLD-CTO", playPath: "/flagship/snake-io/play" },
  { slug: "agar", room: "WORLD-CTO" },
  { slug: "bomber", room: "BOMBER-A" },
];

const report = {
  base: BASE,
  commit: COMMIT,
  startedAt: new Date().toISOString(),
  checks: [],
};

function mark(name, ok, detail = {}) {
  report.checks.push({ name, ok, ...detail, t: new Date().toISOString() });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`, detail.detail ?? "");
  return ok;
}

function invitePath(slug, room) {
  return `/games/${slug}/play?room=${encodeURIComponent(room)}`;
}

async function enterGame(page, slug) {
  const enter = page.locator('[data-testid="mp-enter-world"]');
  if ((await enter.count()) > 0) {
    await enter.waitFor({ state: "visible", timeout: 45_000 });
    await enter.click({ timeout: 15_000 });
  }

  if (slug === "bomber") {
    await page.waitForTimeout(800);
    const pad = page.locator('[data-testid="mp-mobile-control-pad"]');
    if ((await pad.count()) === 0) {
      const mapBtn = page.locator('[data-testid="bomber-map-A"]');
      if ((await mapBtn.count()) > 0) {
        await mapBtn.click({ timeout: 8_000, force: true }).catch(() => {});
      }
    }
  }

  if (slug === "snake") {
    const right = page.locator('[data-testid="mp-pad-right"]');
    await right.waitFor({ state: "visible", timeout: 25_000 }).catch(() => {});
    if ((await right.count()) > 0) {
      await right.click({ timeout: 5_000 }).catch(() => {});
    }
  }

  await page.waitForTimeout(1500);
}

async function probeInviteLinks(page) {
  for (const g of MP) {
    await page.goto(`${BASE}/games/${g.slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.locator('[data-testid="game-detail-page"]').waitFor({ timeout: 30_000 });
    const copyBtn = page.locator('[data-testid="game-detail-invite-copy"]');
    const shareBtn = page.locator('[data-testid="game-detail-share-btn"]');
    const hasCopy = (await copyBtn.count()) > 0;
    const hasShare = (await shareBtn.count()) > 0;
    mark(`${g.slug}-invite-buttons`, hasCopy && hasShare, { hasCopy, hasShare });

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

async function probeMobilePad(page, slug) {
  const iphone = devices["iPhone 13"];
  await page.setViewportSize(iphone.viewport);
  const path = invitePath(slug, slug === "bomber" ? "BOMBER-A" : "WORLD-VERIFY");
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (slug === "snake") {
    await page.waitForURL(/snake-io\/play/, { timeout: 45_000 }).catch(() => {});
  }
  await enterGame(page, slug);

  const pad = page.locator('[data-testid="mp-mobile-control-pad"]');
  const visible = (await pad.count()) > 0 && (await pad.isVisible());
  mark(`${slug}-mobile-pad-visible`, visible);

  const actionIds =
    slug === "snake" ? ["boost"] : slug === "agar" ? ["split", "eject"] : ["bomb"];
  for (const id of actionIds) {
    const btn = pad.locator(`[data-testid="mp-pad-action-${id}"]`);
    const has = visible && (await btn.count()) > 0;
    mark(`${slug}-mobile-action-${id}`, has);
  }

  for (const dir of ["up", "down", "left", "right"]) {
    const d = pad.locator(`[data-testid="mp-pad-${dir}"]`);
    mark(`${slug}-mobile-dpad-${dir}`, visible && (await d.count()) > 0);
  }

  await page.screenshot({ path: join(OUT, `${slug}-mobile-pad.png`), fullPage: true });
  return visible;
}

async function probeSameWorld(page) {
  const room = "WORLD-SAME004";
  const results = [];
  for (const slug of ["snake", "agar"]) {
    const url = `${BASE}${invitePath(slug, room)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    if (slug === "snake") await page.waitForURL(/snake-io\/play/, { timeout: 30_000 }).catch(() => {});
    const finalUrl = page.url();
    const hasRoom = finalUrl.includes(`room=${room}`) || finalUrl.includes(`room=WORLD-SAME004`);
    results.push({ slug, finalUrl, hasRoom });
    mark(`${slug}-same-world-room-pinned`, hasRoom, { finalUrl });
  }

  const bomberUrl = `${BASE}${invitePath("bomber", "BOMBER-B")}`;
  await page.goto(bomberUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const bomberHas = page.url().includes("BOMBER-B");
  mark("bomber-same-world-room-pinned", bomberHas, { finalUrl: page.url() });
  results.push({ slug: "bomber", finalUrl: page.url(), hasRoom: bomberHas });
  return results;
}

async function probeBomberGridMove(page) {
  const iphone = devices["iPhone 13"];
  await page.setViewportSize(iphone.viewport);
  await page.goto(`${BASE}${invitePath("bomber", "BOMBER-A")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "bomber");
  await page.waitForSelector('[data-testid="mp-mobile-control-pad"]', { timeout: 20_000 });
  await page.waitForTimeout(800);

  const CELL = 26;
  const readPos = () =>
    page.evaluate((cell) => {
      const nodes = [...document.querySelectorAll("div.absolute.z-20")];
      for (const el of nodes) {
        const sh = getComputedStyle(el).boxShadow;
        if (!sh || sh === "none") continue;
        const left = parseFloat(el.style.left || "0");
        const top = parseFloat(el.style.top || "0");
        if (Number.isFinite(left) && Number.isFinite(top)) {
          return { x: Math.round(left / cell), y: Math.round(top / cell), left, top };
        }
      }
      return null;
    }, CELL);

  let posBefore = await readPos();
  if (!posBefore) {
    await page.waitForTimeout(1200);
    posBefore = await readPos();
  }
  if (!posBefore) {
    mark("bomber-grid-move-baseline", false, { detail: "player not found" });
    return false;
  }

  const right = page.locator('[data-testid="mp-pad-right"]');
  await right.click({ timeout: 5_000 });
  await page.waitForTimeout(700);

  const posAfter = await readPos();
  const dx = posAfter ? posAfter.x - posBefore.x : null;
  const dy = posAfter ? posAfter.y - posBefore.y : null;
  const oneCell = dx === 1 && dy === 0;
  mark("bomber-grid-one-cell-right", oneCell, { posBefore, posAfter, dx, dy });
  await page.screenshot({ path: join(OUT, "bomber-grid-move.png"), fullPage: true });
  return oneCell;
}

function probeAuthCode() {
  const authPath = join(ROOT, "apps/web/lib/auth/player-auth.ts");
  const callbackPath = join(ROOT, "apps/web/app/auth/callback/page.tsx");
  const authSrc = readFileSync(authPath, "utf8");
  const cbSrc = readFileSync(callbackPath, "utf8");
  const checks = {
    sessionStorage: authSrc.includes("sessionStorage.setItem(AUTH_RETURN_KEY"),
    originRedirect: authSrc.includes("window.location.origin"),
    consumeReturn: cbSrc.includes("consumeAuthReturnPath()"),
  };
  const ok = Object.values(checks).every(Boolean);
  mark("auth-preview-redirect-code", ok, checks);
  return ok;
}

function probeMobilePadSource() {
  const padPath = join(ROOT, "packages/game-sdk/src/mobile-control-pad.tsx");
  const snakePath = join(ROOT, "games/snake/src/SnakeIo.tsx");
  const padSrc = readFileSync(padPath, "utf8");
  const snakeSrc = readFileSync(snakePath, "utf8");
  const dedupe = padSrc.includes("lastFire.current < 150");
  const lgHidden = padSrc.includes("lg:hidden");
  const snakePadDuringAwait =
    snakeSrc.includes("mySnake?.alive && !isPaused") &&
    !snakeSrc.match(/mySnake\?\.alive && !awaitingInput && !isPaused/);
  mark("mobile-pad-dedupe-150ms", dedupe);
  mark("mobile-pad-lg-hidden", lgHidden);
  mark("snake-pad-visible-before-first-move", snakePadDuringAwait);
  return dedupe && lgHidden && snakePadDuringAwait;
}

async function probeBuildInfo(page) {
  try {
    const res = await page.goto(`${BASE}/api/build-info`, { timeout: 30_000 });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      mark("build-info-reachable", res.ok(), { note: "non-json response", status: res.status() });
      return null;
    }
    mark("build-info-reachable", !!json?.commit || !!json?.sha, { json });
    return json;
  } catch (e) {
    mark("build-info-reachable", false, { error: String(e) });
    return null;
  }
}

async function main() {
  probeAuthCode();
  probeMobilePadSource();

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    hasTouch: true,
  });
  const page = await ctx.newPage();

  try {
    await probeBuildInfo(page);
    await probeInviteLinks(page);
    await probeSameWorld(page);
    for (const g of MP) {
      const mobilePage = await ctx.newPage();
      try {
        await probeMobilePad(mobilePage, g.slug);
      } finally {
        await mobilePage.close();
      }
    }
    try {
      const gridPage = await ctx.newPage();
      try {
        await probeBomberGridMove(gridPage);
      } finally {
        await gridPage.close();
      }
    } catch (e) {
      mark("bomber-grid-probe-error", false, { error: String(e) });
    }

    report.finishedAt = new Date().toISOString();
    report.pass = report.checks.every((c) => c.ok);
    writeFileSync(join(OUT, "verify-report.json"), JSON.stringify(report, null, 2));
    console.log("\n=== SUMMARY ===");
    console.log(JSON.stringify({ pass: report.pass, total: report.checks.length, failed: report.checks.filter((c) => !c.ok).map((c) => c.name) }, null, 2));
    process.exit(report.pass ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
