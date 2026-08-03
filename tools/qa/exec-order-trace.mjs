/** Execution Order evidence — final instrumentation before Root Cause LOCK. */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT =
  process.env.EXEC_ORDER_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-exec-order");
const BUDGET_MS = Number(process.env.EXEC_ORDER_BUDGET_MS ?? 60000);
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
    const s = window.__EXEC_ORDER__;
    const summary = typeof s?.summary === "function" ? s.summary() : null;
    return {
      enabled: !!s?.enabled,
      eventCount: s?.events?.length ?? 0,
      frame: s?.frame ?? 0,
      summary,
      byFrame: s?.byFrame ?? {},
      events: (s?.events ?? []).slice(-80),
    };
  });
}

async function chase(page) {
  const dirs = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"];
  const hint = await page.evaluate(() => window.__FIX_DEATH_001_S2__?.chaseHint ?? null);
  let dir = dirs[Math.floor(Math.random() * dirs.length)];
  if (hint && Number.isFinite(hint.dx)) {
    dir =
      Math.abs(hint.dx) > Math.abs(hint.dy)
        ? hint.dx > 0
          ? "ArrowRight"
          : "ArrowLeft"
        : hint.dy > 0
          ? "ArrowDown"
          : "ArrowUp";
  }
  await page.keyboard.down(dir);
  await page.keyboard.down("Space");
  await page.waitForTimeout(700);
  await page.keyboard.up("Space");
  await page.keyboard.up(dir);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: join(OUT, "media"), size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const consoleLines = [];
page.on("console", (msg) => {
  const text = msg.text();
  if (text.includes("EXEC-ORDER")) consoleLines.push({ t: Date.now(), type: msg.type(), text });
});

const log = {
  rc: "EXEC-ORDER",
  commit: COMMIT,
  base: BASE,
  startedAt: new Date().toISOString(),
  snapshots: [],
};

try {
  log.url = await enter(page);
  await page.screenshot({ path: join(OUT, "01-start.png") });
  const t0 = Date.now();
  while (Date.now() - t0 < BUDGET_MS) {
    await chase(page);
    const s = await sample(page);
    log.snapshots.push({
      elapsedMs: Date.now() - t0,
      eventCount: s.eventCount,
      sampleFrames: s.summary?.sampleFrames,
      dominantOrder: s.summary?.dominantOrder,
      proof: s.summary?.proof,
    });
    if (s.summary?.sampleFrames >= 40 && s.summary?.dominantOrder && Date.now() - t0 > 25_000) {
      break;
    }
  }

  const final = await sample(page);
  log.endedAt = new Date().toISOString();
  log.final = final;
  log.dominantOrder = final.summary?.dominantOrder ?? null;
  log.table = final.summary?.table ?? [];
  log.proof = final.summary?.proof ?? null;
  await page.screenshot({ path: join(OUT, "02-end.png") });

  writeFileSync(join(OUT, "exec-order-report.json"), JSON.stringify(log, null, 2));
  writeFileSync(
    join(OUT, "window-EXEC_ORDER.json"),
    JSON.stringify(
      {
        enabled: final.enabled,
        summary: final.summary,
        byFrame: final.byFrame,
        events: final.events,
      },
      null,
      2
    )
  );
  writeFileSync(join(OUT, "console-EXEC_ORDER.json"), JSON.stringify(consoleLines, null, 2));

  const media = readdirSync(join(OUT, "media"));
  const table = final.summary?.table ?? [];
  const ranks = Object.fromEntries(table.map((r) => [r.phase, r.firstRank]));
  writeFileSync(
    join(OUT, "cpo-pack-index.json"),
    JSON.stringify(
      {
        rc: "EXEC-ORDER",
        commit: COMMIT,
        preview: BASE,
        url: log.url,
        dominantOrder: log.dominantOrder,
        proof: log.proof,
        table: log.table,
        ranks,
        media,
        next: "Root Cause LOCK → FIX-DEATH-002 one fix",
      },
      null,
      2
    )
  );

  await context.close();
  await browser.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        dominantOrder: log.dominantOrder,
        proof: log.proof,
        table: log.table,
        out: OUT,
      },
      null,
      2
    )
  );
} catch (err) {
  log.error = String(err?.stack ?? err);
  writeFileSync(join(OUT, "exec-order-report.json"), JSON.stringify(log, null, 2));
  await browser.close().catch(() => {});
  console.error(log.error);
  process.exit(1);
}
