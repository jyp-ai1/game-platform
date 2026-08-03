/** RC-DEATH-007 — Death UX evidence (WORLD countdown path). */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT =
  process.env.RC_DEATH_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-rc-death-007");
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
  await page.waitForTimeout(2000);
  await board.click({ position: { x: 220, y: 220 } }).catch(() => {});
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  return url;
}

async function sample(page) {
  return page.evaluate(() => {
    const s = window.__RC_DEATH_007__;
    const summary = typeof s?.summary === "function" ? s.summary() : null;
    return {
      enabled: !!s?.enabled,
      summary,
      samples: (s?.samples ?? []).slice(-40),
      countdownDom: !!document.querySelector('[data-testid="death-ux-countdown"]'),
      gameOverDom: !!document.querySelector('[data-testid="death-ux-gameover"]'),
    };
  });
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
  if (text.includes("RC-DEATH-007")) consoleLines.push({ t: Date.now(), type: msg.type(), text });
});

const log = { rc: "RC-DEATH-007", commit: COMMIT, base: BASE, startedAt: new Date().toISOString() };

try {
  log.url = await enter(page);
  await page.screenshot({ path: join(OUT, "01-alive.png") });

  const forced = await page.evaluate(() => window.__RC_DEATH_007__?.forceLocalDeath?.() === true);
  log.forcedDeath = forced;
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "02-death-overlay.png") });

  // Wait through countdown / until respawn
  let sawCountdown = false;
  let sawRemoved = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 12_000) {
    const s = await sample(page);
    if (s.countdownDom) {
      sawCountdown = true;
      await page.screenshot({ path: join(OUT, "03-countdown.png") });
    }
    if (s.summary?.pass?.overlayRemoved) {
      sawRemoved = true;
      await page.screenshot({ path: join(OUT, "04-respawned.png") });
      break;
    }
    await page.waitForTimeout(300);
  }

  // Keep moving after respawn
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(1500);
  await page.keyboard.up("ArrowRight");
  await page.screenshot({ path: join(OUT, "05-move-after.png") });

  const final = await sample(page);
  log.endedAt = new Date().toISOString();
  log.final = final;
  log.sawCountdown = sawCountdown;
  log.sawRemoved = sawRemoved;
  log.verdict = final.summary?.verdict ?? null;
  log.pass = final.summary?.pass ?? null;
  log.passScore = final.summary?.passScore ?? null;
  log.proof = final.summary?.proof ?? null;

  writeFileSync(join(OUT, "rc-death-007-report.json"), JSON.stringify(log, null, 2));
  writeFileSync(
    join(OUT, "window-RC_DEATH_007.json"),
    JSON.stringify({ summary: final.summary, samples: final.samples }, null, 2)
  );
  writeFileSync(join(OUT, "console-RC_DEATH_007.json"), JSON.stringify(consoleLines, null, 2));

  const media = readdirSync(join(OUT, "media"));
  writeFileSync(
    join(OUT, "cpo-pack-index.json"),
    JSON.stringify(
      {
        rc: "RC-DEATH-007",
        commit: COMMIT,
        preview: BASE,
        url: log.url,
        forcedDeath: log.forcedDeath,
        verdict: log.verdict,
        pass: log.pass,
        passScore: log.passScore,
        proof: log.proof,
        media,
        next:
          log.verdict === "PASS"
            ? "Leaderboard/HUD Epic or Closed Alpha Candidate"
            : "FIX-RETRY-001 Death UX one fix then re-verify",
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
        forcedDeath: log.forcedDeath,
        verdict: log.verdict,
        passScore: log.passScore,
        pass: log.pass,
        proof: log.proof,
        out: OUT,
      },
      null,
      2
    )
  );
} catch (err) {
  log.error = String(err?.stack ?? err);
  writeFileSync(join(OUT, "rc-death-007-report.json"), JSON.stringify(log, null, 2));
  await browser.close().catch(() => {});
  console.error(log.error);
  process.exit(1);
}
