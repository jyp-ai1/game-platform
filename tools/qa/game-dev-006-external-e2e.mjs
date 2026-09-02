/**
 * GAME-DEV-006 — external game registration + discovery E2E on Preview.
 * Usage: QA_BASE_URL=https://game29-xxxx.vercel.app node tools/qa/game-dev-006-external-e2e.mjs
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = "docs/qa/cpo/game-dev-006";
const TEST_SLUG = "qa-external-game";
const TEST_PLAY_URL = "https://example.com/";

function loadEnv() {
  const envPath = join(ROOT, "apps/web/.env.local");
  try {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  } catch {
    /* ignore */
  }
}

loadEnv();

const BASE = process.env.QA_BASE_URL?.replace(/\/$/, "");
if (!BASE) {
  console.error("QA_BASE_URL required");
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const report = {
  baseUrl: BASE,
  at: new Date().toISOString(),
  p0: {},
  validation: {},
  native: {},
  mobile: {},
  errors: [],
};

function pass(bucket, name) {
  report[bucket][name] = "PASS";
}

function fail(bucket, name, msg) {
  report[bucket][name] = `FAIL: ${msg}`;
  report.errors.push({ bucket, name, error: msg });
}

async function cleanupTestGame() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;
  const admin = createClient(url, key, { auth: { persistSession: false } });
  await admin.from("games").delete().eq("slug", TEST_SLUG);
}

async function registerViaApi(baseUrl, body) {
  const res = await fetch(`${baseUrl}/api/creator/register-game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function runValidation() {
  const cases = [
    { name: "rejectJavascript", body: { title: "Bad", slug: "bad-js", description: "x", playUrl: "javascript:alert(1)" }, expectStatus: 400 },
    { name: "rejectDataUrl", body: { title: "Bad", slug: "bad-data", description: "x", playUrl: "data:text/html,hi" }, expectStatus: 400 },
    { name: "rejectFileUrl", body: { title: "Bad", slug: "bad-file", description: "x", playUrl: "file:///etc/passwd" }, expectStatus: 400 },
    { name: "rejectShortTitle", body: { title: "A", slug: "bad-title", description: "desc", playUrl: TEST_PLAY_URL }, expectStatus: 400 },
    { name: "rejectNoDescription", body: { title: "Good Title", slug: "bad-desc", description: "", playUrl: TEST_PLAY_URL }, expectStatus: 400 },
    { name: "rejectBadSlug", body: { title: "Good Title", slug: "Bad_Slug!", description: "desc", playUrl: TEST_PLAY_URL }, expectStatus: 400 },
  ];

  for (const c of cases) {
    try {
      const { status, data } = await registerViaApi(BASE, c.body);
      if (status === c.expectStatus && data.ok === false) {
        pass("validation", c.name);
      } else {
        fail("validation", c.name, `status=${status} ok=${data.ok}`);
      }
    } catch (e) {
      fail("validation", c.name, e instanceof Error ? e.message : String(e));
    }
  }
}

async function runP0(browser) {
  await cleanupTestGame();

  const reg = await registerViaApi(BASE, {
    title: "QA External Game",
    slug: TEST_SLUG,
    description: "QA external game registration",
    playUrl: TEST_PLAY_URL,
    authorName: "QA",
  });
  if (reg.status === 201 && reg.data.ok) {
    pass("p0", "registration");
  } else {
    fail("p0", "registration", JSON.stringify(reg));
    return;
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    await page.goto(`${BASE}/games`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const card = page.locator(`a[href="/games/${TEST_SLUG}"], [data-testid="platform-game-card"]:has-text("QA External Game")`).first();
    if ((await card.count()) > 0) {
      pass("p0", "catalogVisible");
    } else {
      fail("p0", "catalogVisible", "card not found on /games");
    }
    await page.screenshot({ path: path.join(OUT, "01-games-list.png"), fullPage: true });

    await page.reload({ waitUntil: "domcontentloaded" });
    if ((await page.locator(`text=QA External Game`).count()) > 0) {
      pass("p0", "refreshPersistence");
    } else {
      fail("p0", "refreshPersistence", "missing after refresh");
    }

    await page.goto(`${BASE}/games/${TEST_SLUG}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator('[data-testid="game-detail-play-cta"]').waitFor({ timeout: 20_000 });
    pass("p0", "detail");
    await page.screenshot({ path: path.join(OUT, "02-detail.png"), fullPage: true });

    await page.locator('[data-testid="game-detail-play-cta"]').click();
    await page.waitForURL(new RegExp(`/games/${TEST_SLUG}/play`), { timeout: 30_000 });
    const iframe = page.locator('[data-testid="external-game-iframe"]');
    const fallback = page.locator('a:has-text("새 탭에서 열기")');
    if ((await iframe.count()) > 0 || (await fallback.count()) > 0) {
      pass("p0", "externalPlayOrFallback");
    } else {
      fail("p0", "externalPlayOrFallback", "no iframe or fallback");
    }
    await page.screenshot({ path: path.join(OUT, "03-play.png"), fullPage: true });

    const dup = await registerViaApi(BASE, {
      title: "QA External Game",
      slug: TEST_SLUG,
      description: "dup",
      playUrl: TEST_PLAY_URL,
    });
    if (dup.status === 400 && dup.data.ok === false) {
      pass("p0", "duplicateSlugRejected");
    } else {
      fail("p0", "duplicateSlugRejected", JSON.stringify(dup));
    }
  } catch (e) {
    fail("p0", "flow", e instanceof Error ? e.message : String(e));
  } finally {
    await page.close();
  }

  const incognito = await browser.newContext();
  const incPage = await incognito.newPage();
  try {
    await incPage.goto(`${BASE}/games/${TEST_SLUG}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const title = await incPage.locator("h1").first().textContent();
    if (title?.includes("QA External Game")) {
      pass("p0", "incognitoVisibility");
    } else {
      fail("p0", "incognitoVisibility", `title=${title}`);
    }
  } catch (e) {
    fail("p0", "incognitoVisibility", e instanceof Error ? e.message : String(e));
  } finally {
    await incognito.close();
  }
}

async function runNative(browser) {
  const slugs = ["snake", "agar", "bomber"];
  const page = await browser.newPage();
  for (const slug of slugs) {
    try {
      await page.goto(`${BASE}/games/${slug}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      const cta = page.locator('[data-testid="game-detail-play-cta"]').first();
      await cta.waitFor({ timeout: 20_000 });
      await cta.click();
      await page.waitForTimeout(3000);
      const url = page.url();
      if (url.includes("/play") || url.includes("snake-io")) {
        pass("native", slug);
      } else {
        fail("native", slug, `url=${url}`);
      }
    } catch (e) {
      fail("native", slug, e instanceof Error ? e.message : String(e));
    }
  }
  await page.close();
}

async function runMobile(browser) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/games`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector('[data-testid="platform-game-card"], [data-testid="home-hero-card"]', {
      timeout: 30_000,
    });
    pass("mobile", "gamesList");

    await page.goto(`${BASE}/games/${TEST_SLUG}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const cta = page.locator('[data-testid="game-detail-play-cta"]').first();
    await cta.waitFor({ timeout: 20_000 });
    const box = await cta.boundingBox();
    if (box && box.width > 40 && box.height > 40) {
      pass("mobile", "detailPlayCta");
    } else {
      fail("mobile", "detailPlayCta", "CTA too small or missing");
    }

    await page.goto(`${BASE}/studio/upload`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator('[data-testid="game-register-form"]').waitFor({ timeout: 20_000 });
    pass("mobile", "studioUpload");

    await page.screenshot({ path: path.join(OUT, "04-mobile-studio.png"), fullPage: true });
  } catch (e) {
    fail("mobile", "layout", e instanceof Error ? e.message : String(e));
  } finally {
    await ctx.close();
  }
}

const browser = await chromium.launch({ headless: true });
await runValidation();
await runP0(browser);
await runNative(browser);
await runMobile(browser);
await browser.close();

const allResults = { ...report.p0, ...report.validation, ...report.native, ...report.mobile };
const passCount = Object.values(allResults).filter((v) => v === "PASS").length;
const total = Object.keys(allResults).length;
report.summary = `${passCount}/${total} PASS`;

fs.writeFileSync(path.join(OUT, "verify-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.errors.length ? 1 : 0);
