/** RC-LB-001 — Leaderboard integrity evidence pack. */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT =
  process.env.RC_LB_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-rc-lb-001");
const BUDGET_MS = Number(process.env.RC_LB_BUDGET_MS ?? 90000);
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
    const s = window.__RC_LB_001__;
    const summary = typeof s?.summary === "function" ? s.summary() : null;
    return {
      enabled: !!s?.enabled,
      summary,
      last: summary?.last ?? null,
      samples: (s?.samples ?? []).slice(-20),
    };
  });
}

async function roam(page) {
  const dirs = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"];
  const d = dirs[Math.floor(Math.random() * dirs.length)];
  await page.keyboard.down(d);
  await page.keyboard.down("Space");
  await page.waitForTimeout(700);
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
  if (text.includes("RC-LB-001")) consoleLines.push({ t: Date.now(), type: msg.type(), text });
});

const log = { rc: "RC-LB-001", commit: COMMIT, base: BASE, startedAt: new Date().toISOString(), snapshots: [] };

try {
  log.url = await enter(page);
  await page.screenshot({ path: join(OUT, "01-start.png") });
  const t0 = Date.now();
  while (Date.now() - t0 < BUDGET_MS * 0.55) {
    await roam(page);
    const s = await sample(page);
    log.snapshots.push({
      elapsedMs: Date.now() - t0,
      sampleCount: s.summary?.sampleCount,
      verdict: s.summary?.verdict,
      proof: s.summary?.proof,
      last: s.last,
    });
  }

  // Death → ghost check → respawn
  const forced = await page.evaluate(() => window.__RC_DEATH_007__?.forceLocalDeath?.() === true);
  log.forcedDeath = forced;
  await page.waitForTimeout(500);
  const midDeath = await sample(page);
  log.afterDeath = midDeath.last;
  await page.screenshot({ path: join(OUT, "02-after-death.png") });

  const waitRespawnUntil = Date.now() + 8000;
  while (Date.now() < waitRespawnUntil) {
    const s = await sample(page);
    if (s.last?.alive) break;
    await page.waitForTimeout(250);
  }
  await roam(page);
  await page.screenshot({ path: join(OUT, "03-after-respawn.png") });

  const final = await sample(page);
  log.endedAt = new Date().toISOString();
  log.final = final;
  log.verdict = final.summary?.verdict ?? null;
  log.pass = final.summary?.pass ?? null;
  log.passScore = final.summary?.passScore ?? null;
  log.proof = final.summary?.proof ?? null;

  // Disconnect not exercised in single-tab probe
  log.disconnect = "SKIPPED_SINGLE_TAB";

  writeFileSync(join(OUT, "rc-lb-001-report.json"), JSON.stringify(log, null, 2));
  writeFileSync(
    join(OUT, "window-RC_LB_001.json"),
    JSON.stringify({ summary: final.summary, samples: final.samples, afterDeath: midDeath.last }, null, 2)
  );
  writeFileSync(join(OUT, "console-RC_LB_001.json"), JSON.stringify(consoleLines, null, 2));

  const media = readdirSync(join(OUT, "media"));
  writeFileSync(
    join(OUT, "cpo-pack-index.json"),
    JSON.stringify(
      {
        rc: "RC-LB-001",
        commit: COMMIT,
        preview: BASE,
        url: log.url,
        verdict: log.verdict,
        pass: log.pass,
        passScore: log.passScore,
        proof: log.proof,
        disconnect: log.disconnect,
        media,
        next:
          log.verdict === "PASS"
            ? "Closed Alpha QA Report v1.0 (Collision Known Issue) or HUD Polish"
            : "FIX-LB-001 one fix then re-verify",
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
        verdict: log.verdict,
        passScore: log.passScore,
        pass: log.pass,
        proof: log.proof,
        afterDeathGhost: midDeath.last?.deadInRankings,
        out: OUT,
      },
      null,
      2
    )
  );
} catch (err) {
  log.error = String(err?.stack ?? err);
  writeFileSync(join(OUT, "rc-lb-001-report.json"), JSON.stringify(log, null, 2));
  await browser.close().catch(() => {});
  console.error(log.error);
  process.exit(1);
}
