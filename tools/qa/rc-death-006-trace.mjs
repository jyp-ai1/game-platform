/** RC-DEATH-006 — Respawn loop evidence (bot cycles OK for engine path). */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT =
  process.env.RC_DEATH_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-rc-death-006");
const BUDGET_MS = Number(process.env.RC_DEATH_BUDGET_MS ?? 120000);
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
    const s = window.__RC_DEATH_006__;
    const summary = typeof s?.summary === "function" ? s.summary() : null;
    const rule = null;
    return {
      enabled: !!s?.enabled,
      eventCount: s?.events?.length ?? 0,
      completedCycles: s?.completedCycles ?? 0,
      summary,
      cycles: Object.values(s?.cycles ?? {}),
      events: (s?.events ?? []).slice(-40),
      humanAuto:
        window.__RC_DEATH_005__ != null
          ? undefined
          : undefined,
    };
  });
}

async function idleBoost(page) {
  const dirs = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"];
  const d = dirs[Math.floor(Math.random() * dirs.length)];
  await page.keyboard.down(d);
  await page.keyboard.down("Space");
  await page.waitForTimeout(900);
  await page.keyboard.up("Space");
  await page.keyboard.up(d);
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
  if (text.includes("RC-DEATH-006")) consoleLines.push({ t: Date.now(), type: msg.type(), text });
});

const log = { rc: "RC-DEATH-006", commit: COMMIT, base: BASE, startedAt: new Date().toISOString(), snapshots: [] };

try {
  log.url = await enter(page);
  await page.screenshot({ path: join(OUT, "01-start.png") });
  const t0 = Date.now();
  while (Date.now() - t0 < BUDGET_MS) {
    await idleBoost(page);
    const s = await sample(page);
    log.snapshots.push({
      elapsedMs: Date.now() - t0,
      eventCount: s.eventCount,
      completedCycles: s.completedCycles,
      verdict: s.summary?.verdict,
      passScore: s.summary?.passScore,
      proof: s.summary?.proof,
    });
    if (
      s.completedCycles >= 2 &&
      s.summary?.verdict &&
      s.summary.verdict !== "NO_CYCLE" &&
      Date.now() - t0 > 25_000
    ) {
      break;
    }
  }

  const final = await sample(page);
  log.endedAt = new Date().toISOString();
  log.final = final;
  log.verdict = final.summary?.verdict ?? null;
  log.pass = final.summary?.pass ?? null;
  log.passScore = final.summary?.passScore ?? null;
  log.proof = final.summary?.proof ?? null;
  await page.screenshot({ path: join(OUT, "02-end.png") });

  writeFileSync(join(OUT, "rc-death-006-report.json"), JSON.stringify(log, null, 2));
  writeFileSync(
    join(OUT, "window-RC_DEATH_006.json"),
    JSON.stringify(
      { enabled: final.enabled, summary: final.summary, cycles: final.cycles, events: final.events },
      null,
      2
    )
  );
  writeFileSync(join(OUT, "console-RC_DEATH_006.json"), JSON.stringify(consoleLines, null, 2));

  const media = readdirSync(join(OUT, "media"));
  writeFileSync(
    join(OUT, "cpo-pack-index.json"),
    JSON.stringify(
      {
        rc: "RC-DEATH-006",
        commit: COMMIT,
        preview: BASE,
        url: log.url,
        verdict: log.verdict,
        pass: log.pass,
        passScore: log.passScore,
        proof: log.proof,
        media,
        next:
          log.verdict === "PASS"
            ? "RC-007 Retry / Death UX (or Closed Alpha Candidate checkpoint)"
            : "FIX-RESPAWN-001 one fix then re-verify",
      },
      null,
      2
    )
  );

  await context.close();
  await browser.close();
  console.log(
    JSON.stringify(
      { ok: true, verdict: log.verdict, passScore: log.passScore, pass: log.pass, proof: log.proof, out: OUT },
      null,
      2
    )
  );
} catch (err) {
  log.error = String(err?.stack ?? err);
  writeFileSync(join(OUT, "rc-death-006-report.json"), JSON.stringify(log, null, 2));
  await browser.close().catch(() => {});
  console.error(log.error);
  process.exit(1);
}
