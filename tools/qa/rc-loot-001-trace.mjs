/** RC-LOOT-001 — Death loot drop evidence pack (length / world / render / collect). */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT =
  process.env.RC_LOOT_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-rc-loot-001");
const BUDGET_MS = Number(process.env.RC_LOOT_BUDGET_MS ?? 100000);
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
    const s = window.__RC_LOOT_001__;
    const summary = typeof s?.summary === "function" ? s.summary() : null;
    const deathFoodDom = document.querySelectorAll(".ring-red-400\\/50, [class*=\"ring-red-400\"]").length;
    return {
      enabled: !!s?.enabled,
      summary,
      lastDrop: summary?.lastDrop ?? null,
      drops: (s?.drops ?? []).slice(-12),
      collects: (s?.collects ?? []).slice(-12),
      deathFoodDom,
    };
  });
}

async function roam(page) {
  const dirs = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"];
  const d = dirs[Math.floor(Math.random() * dirs.length)];
  await page.keyboard.down(d);
  await page.keyboard.down("Space");
  await page.waitForTimeout(800);
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
  if (text.includes("RC-LOOT-001")) consoleLines.push({ t: Date.now(), type: msg.type(), text });
});

const log = {
  rc: "RC-LOOT-001",
  commit: COMMIT,
  base: BASE,
  startedAt: new Date().toISOString(),
  snapshots: [],
};

try {
  log.url = await enter(page);
  await page.screenshot({ path: join(OUT, "01-start.png") });

  const t0 = Date.now();
  while (Date.now() - t0 < BUDGET_MS * 0.45) {
    await roam(page);
    const s = await sample(page);
    log.snapshots.push({
      elapsedMs: Date.now() - t0,
      dropCount: s.summary?.dropCount,
      deathCollects: s.summary?.deathCollects,
      verdict: s.summary?.verdict,
      proof: s.summary?.proof,
      deathFoodDom: s.deathFoodDom,
      lastDrop: s.lastDrop,
    });
    if (s.summary?.dropCount >= 3 && s.summary?.deathCollects >= 1) break;
  }

  // Force local death to guarantee at least one human loot drop
  const forced = await page.evaluate(() => window.__RC_DEATH_007__?.forceLocalDeath?.() === true);
  log.forcedDeath = forced;
  await page.waitForTimeout(600);
  const afterForce = await sample(page);
  log.afterForcedDeath = afterForce;
  await page.screenshot({ path: join(OUT, "02-after-death-loot.png") });

  // Wait respawn then roam to attempt collect
  const waitUntil = Date.now() + 10000;
  while (Date.now() < waitUntil) {
    await roam(page);
    const s = await sample(page);
    if (s.summary?.deathCollects > 0) break;
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: join(OUT, "03-after-collect-window.png") });

  const final = await sample(page);
  log.endedAt = new Date().toISOString();
  log.final = final;
  log.verdict = final.summary?.verdict ?? null;
  log.pass = final.summary?.pass ?? null;
  log.passScore = final.summary?.passScore ?? null;
  log.proof = final.summary?.proof ?? null;
  log.renderNote =
    final.deathFoodDom > 0 || (final.lastDrop?.deathFoodAdded ?? 0) > 0
      ? "death food present in world and/or red-ring DOM"
      : "no death-food DOM and no lastDrop";

  writeFileSync(join(OUT, "rc-loot-001-report.json"), JSON.stringify(log, null, 2));
  writeFileSync(
    join(OUT, "window-RC_LOOT_001.json"),
    JSON.stringify(
      {
        summary: final.summary,
        drops: final.drops,
        collects: final.collects,
        deathFoodDom: final.deathFoodDom,
        afterForcedDeath: afterForce.lastDrop,
      },
      null,
      2
    )
  );
  writeFileSync(join(OUT, "console-RC_LOOT_001.json"), JSON.stringify(consoleLines, null, 2));

  const media = readdirSync(join(OUT, "media"));
  writeFileSync(
    join(OUT, "cpo-pack-index.json"),
    JSON.stringify(
      {
        rc: "RC-LOOT-001",
        commit: COMMIT,
        base: BASE,
        verdict: log.verdict,
        passScore: log.passScore,
        media,
        files: [
          "01-start.png",
          "02-after-death-loot.png",
          "03-after-collect-window.png",
          "rc-loot-001-report.json",
          "window-RC_LOOT_001.json",
          "console-RC_LOOT_001.json",
        ],
      },
      null,
      2
    )
  );
  writeFileSync(
    join(OUT, "cpo-conclusion.json"),
    JSON.stringify(
      {
        rc: "RC-LOOT-001",
        commit: COMMIT,
        base: BASE,
        verdict: log.verdict,
        passScore: log.passScore,
        pass: log.pass,
        proof: log.proof,
        renderNote: log.renderNote,
        next:
          log.verdict === "PASS"
            ? "RC-AUTH-001 Login regression"
            : "ONE fix for failing loot gate → re-verify",
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      {
        rc: "RC-LOOT-001",
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
  writeFileSync(
    join(OUT, "rc-loot-001-report.json"),
    JSON.stringify({ ...log, error: String(err), stack: err?.stack }, null, 2)
  );
  console.error(err);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
