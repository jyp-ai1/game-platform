/** RC-DEATH-004 — Preview evidence for distance/threshold unit verification. */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT =
  process.env.RC_DEATH_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-rc-death-004");
const BUDGET_MS = Number(process.env.RC_DEATH_BUDGET_MS ?? 90000);
const COMMIT = process.env.SNAKE_PROBE_COMMIT ?? "local";

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "media"), { recursive: true });

async function enter(page) {
  const url = `${BASE}/flagship/snake-io/play?room=WORLD&debug=1`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByRole("button", { name: "START", exact: true }).click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole("button", { name: /ENTER WORLD/i }).click({ timeout: 15_000 }).catch(() => {});
  const board = page.locator(".touch-none").first();
  await board.waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1500);
  await board.click({ position: { x: 220, y: 220 } }).catch(() => {});
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);
  return url;
}

async function sample(page) {
  return page.evaluate(() => {
    const s = window.__RC_DEATH_004__;
    const summary = typeof s?.summary === "function" ? s.summary() : null;
    return {
      enabled: !!s?.enabled,
      sampleCount: s?.samples?.length ?? 0,
      last: s?.last ?? null,
      summary,
      samples: s?.samples ?? [],
    };
  });
}

async function rampage(page) {
  const dirs = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"];
  for (let i = 0; i < 5; i++) {
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    await page.keyboard.down(d);
    await page.keyboard.down("Space");
    await page.waitForTimeout(700);
    await page.keyboard.up("Space");
    await page.keyboard.up(d);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: join(OUT, "media"), size: { width: 1440, height: 900 } },
});
await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
const page = await context.newPage();
const consoleLines = [];
page.on("console", (msg) => {
  const text = msg.text();
  if (text.includes("RC-DEATH-004")) consoleLines.push({ t: Date.now(), type: msg.type(), text });
});

const log = { rc: "RC-DEATH-004", commit: COMMIT, base: BASE, startedAt: new Date().toISOString(), samples: [], console: consoleLines };

try {
  log.url = await enter(page);
  await page.screenshot({ path: join(OUT, "01-start.png") });
  const t0 = Date.now();
  while (Date.now() - t0 < BUDGET_MS) {
    await rampage(page);
    const s = await sample(page);
    log.samples.push({
      elapsedMs: Date.now() - t0,
      sampleCount: s.sampleCount,
      case: s.summary?.case,
      proof: s.summary?.proof,
      last: s.last,
      minDistance: s.summary?.minDistance,
      threshold: s.summary?.threshold,
      ratio: s.summary?.ratioMinDistOverThreshold,
    });
    if (s.sampleCount >= 20 && (s.summary?.case === "1_unit_mismatch" || s.summary?.case === "2_same_unit_far") && Date.now() - t0 > 25_000) {
      break;
    }
  }

  const final = await sample(page);
  log.endedAt = new Date().toISOString();
  log.final = final;
  log.case = final.summary?.case ?? null;
  log.proof = final.summary?.proof ?? null;
  await page.screenshot({ path: join(OUT, "02-end.png") });

  writeFileSync(join(OUT, "rc-death-004-report.json"), JSON.stringify(log, null, 2));
  writeFileSync(join(OUT, "window-RC_DEATH_004.json"), JSON.stringify({
    enabled: final.enabled,
    summary: final.summary,
    samples: final.samples,
    last: final.last,
  }, null, 2));
  writeFileSync(join(OUT, "console-RC_DEATH_004.json"), JSON.stringify(consoleLines, null, 2));

  await context.tracing.stop({ path: join(OUT, "media", "playwright-trace.zip") });
  await context.close();
  await browser.close();

  const media = readdirSync(join(OUT, "media"));
  writeFileSync(join(OUT, "cpo-pack-index.json"), JSON.stringify({
    rc: "RC-DEATH-004",
    commit: COMMIT,
    preview: BASE,
    url: log.url,
    case: log.case,
    proof: log.proof,
    artifacts: {
      report: "rc-death-004-report.json",
      windowStore: "window-RC_DEATH_004.json",
      console: "console-RC_DEATH_004.json",
      screenshots: ["01-start.png", "02-end.png"],
      playwrightTrace: "media/playwright-trace.zip",
      videos: media.filter((f) => f.endsWith(".webm")),
    },
  }, null, 2));

  console.log(JSON.stringify({
    case: log.case,
    proof: log.proof,
    sampleCount: final.sampleCount,
    minDistance: final.summary?.minDistance,
    threshold: final.summary?.threshold,
    ratio: final.summary?.ratioMinDistOverThreshold,
    headMagMedian: final.summary?.headMagMedian,
    segMagMedian: final.summary?.segMagMedian,
    worldSize: final.summary?.worldSize,
    last: final.last,
  }, null, 2));
  process.exit(0);
} catch (err) {
  log.error = String(err?.stack || err);
  writeFileSync(join(OUT, "rc-death-004-report.json"), JSON.stringify(log, null, 2));
  await page.screenshot({ path: join(OUT, "00-error.png") }).catch(() => {});
  await context.tracing.stop({ path: join(OUT, "media", "playwright-trace-error.zip") }).catch(() => {});
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  console.error(log.error);
  process.exit(1);
}
