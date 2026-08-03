/** RC-DEATH-003 — Preview evidence for Human Collision Detection Pipeline. */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT =
  process.env.RC_DEATH_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-rc-death-003");
const BUDGET_MS = Number(process.env.RC_DEATH_BUDGET_MS ?? 120_000);
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
    const s = window.__RC_DEATH_003__;
    const summary = typeof s?.summary === "function" ? s.summary() : null;
    return {
      enabled: !!s?.enabled,
      counts: s?.counts ?? {},
      rejectReasons: s?.rejectReasons ?? {},
      candidateTotal: s?.candidateTotal ?? 0,
      evaluatorEnterHuman: s?.evaluatorEnterHuman ?? 0,
      hitHuman: s?.hitHuman ?? 0,
      summary,
      events: s?.events ?? [],
      audit: window.__SNAKE_ENGINE_AUDIT__?.localSnake ?? null,
      length: Number((document.body.innerText.match(/Length\s*(\d+)/) || [])[1] || 0),
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
  if (text.includes("RC-DEATH-003")) consoleLines.push({ t: Date.now(), type: msg.type(), text });
});

const log = { rc: "RC-DEATH-003", commit: COMMIT, base: BASE, startedAt: new Date().toISOString(), samples: [], console: consoleLines };

try {
  log.url = await enter(page);
  await page.screenshot({ path: join(OUT, "01-start.png") });
  const t0 = Date.now();
  let mid = false;
  while (Date.now() - t0 < BUDGET_MS) {
    await rampage(page);
    const s = await sample(page);
    log.samples.push({
      elapsedMs: Date.now() - t0,
      case: s.summary?.case,
      proof: s.summary?.proof,
      evaluatorEnterHuman: s.evaluatorEnterHuman,
      candidateTotal: s.candidateTotal,
      hitHuman: s.hitHuman,
      rejectReasons: s.rejectReasons,
      counts: s.counts,
      length: s.length,
      auditAlive: s.audit?.alive ?? null,
      head: s.audit?.head ?? null,
    });
    if (!mid && Date.now() - t0 > BUDGET_MS / 2) {
      await page.screenshot({ path: join(OUT, "02-mid.png") });
      mid = true;
    }
    // Early stop once Case A or B is proven with enough samples
    if (
      s.evaluatorEnterHuman > 5 &&
      (s.summary?.case === "A_candidate_zero" || s.summary?.case === "B_reject" || s.summary?.case === "C_hit_reached") &&
      Date.now() - t0 > 40_000
    ) {
      break;
    }
  }

  const final = await sample(page);
  log.endedAt = new Date().toISOString();
  log.final = final;
  log.case = final.summary?.case ?? null;
  log.proof = final.summary?.proof ?? null;
  await page.screenshot({ path: join(OUT, "03-end.png") });
  writeFileSync(join(OUT, "rc-death-003-report.json"), JSON.stringify(log, null, 2));
  writeFileSync(join(OUT, "window-RC_DEATH_003.json"), JSON.stringify({
    enabled: final.enabled,
    counts: final.counts,
    rejectReasons: final.rejectReasons,
    candidateTotal: final.candidateTotal,
    evaluatorEnterHuman: final.evaluatorEnterHuman,
    hitHuman: final.hitHuman,
    summary: final.summary,
    events: final.events,
  }, null, 2));
  writeFileSync(join(OUT, "console-RC_DEATH_003.json"), JSON.stringify(consoleLines, null, 2));

  await context.tracing.stop({ path: join(OUT, "media", "playwright-trace.zip") });
  await context.close();
  await browser.close();

  const media = readdirSync(join(OUT, "media"));
  writeFileSync(join(OUT, "cpo-pack-index.json"), JSON.stringify({
    rc: "RC-DEATH-003",
    commit: COMMIT,
    preview: BASE,
    url: log.url,
    case: log.case,
    proof: log.proof,
    artifacts: {
      report: "rc-death-003-report.json",
      windowStore: "window-RC_DEATH_003.json",
      console: "console-RC_DEATH_003.json",
      screenshots: ["01-start.png", "02-mid.png", "03-end.png"],
      playwrightTrace: "media/playwright-trace.zip",
      videos: media.filter((f) => f.endsWith(".webm")),
    },
  }, null, 2));

  console.log(JSON.stringify({ case: log.case, proof: log.proof, candidateTotal: final.candidateTotal, evaluatorEnterHuman: final.evaluatorEnterHuman, hitHuman: final.hitHuman, rejectReasons: final.rejectReasons, consoleLines: consoleLines.length }, null, 2));
  process.exit(0);
} catch (err) {
  log.error = String(err?.stack || err);
  writeFileSync(join(OUT, "rc-death-003-report.json"), JSON.stringify(log, null, 2));
  await page.screenshot({ path: join(OUT, "00-error.png") }).catch(() => {});
  await context.tracing.stop({ path: join(OUT, "media", "playwright-trace-error.zip") }).catch(() => {});
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  console.error(log.error);
  process.exit(1);
}
