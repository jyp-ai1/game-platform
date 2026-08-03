/** RC-DEATH-002 — collect death pipeline trace (instrumentation only). */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const ROOM = process.env.SNAKE_PROBE_ROOM ?? "WORLD";
const OUT =
  process.env.RC_DEATH_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-rc-death-002");
const BUDGET_MS = Number(process.env.RC_DEATH_BUDGET_MS ?? 120_000);
const COMMIT = process.env.SNAKE_PROBE_COMMIT ?? "local";

mkdirSync(OUT, { recursive: true });

async function enter(page) {
  const url =
    ROOM === "PRACTICE"
      ? `${BASE}/flagship/snake-io/play?room=PRACTICE&debug=1`
      : `${BASE}/flagship/snake-io/play?room=WORLD&debug=1`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByRole("button", { name: "START", exact: true }).click({ timeout: 15_000 }).catch(() => {});
  if (ROOM === "WORLD") {
    await page.getByRole("button", { name: /ENTER WORLD/i }).click({ timeout: 15_000 }).catch(() => {});
  }
  const board = page.locator(".touch-none").first();
  await board.waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1500);
  await board.click({ position: { x: 220, y: 220 } }).catch(() => {});
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);
}

async function sample(page) {
  return page.evaluate(() => {
    const store = window.__RC_DEATH_002__;
    const summary = store?.summary?.() ?? null;
    const text = document.body.innerText;
    return {
      t: Date.now(),
      length: Number((text.match(/Length\s*(\d+)/) || [])[1] || 0),
      hasYou: /\bYOU\b/.test(text),
      hasRespawn: /RESPAWN/.test(text),
      traceEnabled: !!store?.enabled,
      counts: store?.counts ?? {},
      summary,
      auditAlive: window.__SNAKE_ENGINE_AUDIT__?.localSnake?.alive ?? null,
      head: window.__SNAKE_ENGINE_AUDIT__?.localSnake?.head ?? null,
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const log = { rc: "RC-DEATH-002", commit: COMMIT, base: BASE, room: ROOM, startedAt: new Date().toISOString(), samples: [] };

try {
  await enter(page);
  await page.screenshot({ path: join(OUT, "01-start.png") });
  const t0 = Date.now();
  while (Date.now() - t0 < BUDGET_MS) {
    await rampage(page);
    const s = await sample(page);
    log.samples.push({ elapsedMs: Date.now() - t0, ...s });
    const c = s.counts || {};
    // Early stop if human death pipeline advanced
    if ((c.alive_false ?? 0) > 0 || (c.merge_alive_conflict ?? 0) > 0 || (c.collision_detect ?? 0) > 0) {
      // keep going a bit after first signal for respawn stages
      if (Date.now() - t0 > 20_000 && ((c.alive_false ?? 0) > 0 || (c.invincible_block ?? 0) > 0)) break;
    }
  }
  const final = await sample(page);
  log.endedAt = new Date().toISOString();
  log.final = final;
  log.pipelineBreak = final.summary?.pipelineBreak ?? null;
  await page.screenshot({ path: join(OUT, "02-end.png") });
  writeFileSync(join(OUT, "rc-death-002-report.json"), JSON.stringify(log, null, 2));
  console.log(JSON.stringify({ pipelineBreak: log.pipelineBreak, counts: final.counts, enabled: final.traceEnabled }, null, 2));
  process.exit(0);
} catch (err) {
  log.error = String(err?.stack || err);
  writeFileSync(join(OUT, "rc-death-002-report.json"), JSON.stringify(log, null, 2));
  await page.screenshot({ path: join(OUT, "00-error.png") }).catch(() => {});
  console.error(log.error);
  process.exit(1);
} finally {
  await browser.close();
}
