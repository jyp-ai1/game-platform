/** FIX-DEATH-001 Step2 — approach floor / who turns evidence. */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT =
  process.env.FIX_DEATH_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-fix-death-001-step2");
const BUDGET_MS = Number(process.env.FIX_DEATH_BUDGET_MS ?? 90000);
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
    const s = window.__FIX_DEATH_001_S2__;
    const summary = typeof s?.summary === "function" ? s.summary() : null;
    return {
      enabled: !!s?.enabled,
      sampleCount: s?.samples?.length ?? 0,
      absoluteMinBody: s?.absoluteMinBody ?? null,
      absoluteMinHead: s?.absoluteMinHead ?? null,
      floorHitsAt13: s?.floorHitsAt13 ?? 0,
      belowThresholdCount: s?.belowThresholdCount ?? 0,
      breakCounts: s?.breakCounts ?? {},
      turnCounts: s?.turnCounts ?? {},
      series: (s?.series ?? []).slice(-80),
      samples: (s?.samples ?? []).slice(-40),
      summary,
    };
  });
}

/** Steer toward nearest visible snake by sampling store + keyboard chase. */
async function chaseTowardNearest(page) {
  const hint = await page.evaluate(() => {
    const s = window.__FIX_DEATH_001_S2__;
    const last = s?.samples?.[s.samples.length - 1];
    if (!last) return null;
    return {
      body: last.minBodyDist,
      head: last.minHeadDist,
      kind: last.nearestKind,
      selfAngle: last.selfAngle,
      otherAngle: last.otherAngle,
    };
  });
  // Prefer boost + zig-zag toward cluster; alternate cardinal dirs aggressively
  const dirs = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"];
  const start = Math.floor(Math.random() * dirs.length);
  for (let i = 0; i < 6; i++) {
    const d = dirs[(start + i) % dirs.length];
    await page.keyboard.down(d);
    await page.keyboard.down("Space");
    await page.waitForTimeout(hint && hint.body < 40 ? 900 : 450);
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
  if (text.includes("FIX-DEATH-001") && text.includes("[S2]")) {
    consoleLines.push({ t: Date.now(), type: msg.type(), text });
  }
});

const log = {
  rc: "FIX-DEATH-001",
  step: "approach_floor",
  commit: COMMIT,
  base: BASE,
  startedAt: new Date().toISOString(),
  snapshots: [],
  console: consoleLines,
};

try {
  log.url = await enter(page);
  await page.screenshot({ path: join(OUT, "01-start.png") });
  const t0 = Date.now();
  while (Date.now() - t0 < BUDGET_MS) {
    await chaseTowardNearest(page);
    const s = await sample(page);
    log.snapshots.push({
      elapsedMs: Date.now() - t0,
      sampleCount: s.sampleCount,
      absoluteMinBody: s.absoluteMinBody,
      absoluteMinHead: s.absoluteMinHead,
      floorHitsAt13: s.floorHitsAt13,
      belowThresholdCount: s.belowThresholdCount,
      verdict: s.summary?.verdict,
      proof: s.summary?.proof,
      topBreak: s.summary?.topBreakReasons?.[0] ?? null,
      topTurn: s.summary?.topTurnActors?.[0] ?? null,
    });
    if (
      s.sampleCount >= 30 &&
      s.summary?.verdict &&
      s.summary.verdict !== "unknown" &&
      Date.now() - t0 > 35_000
    ) {
      break;
    }
  }

  const final = await sample(page);
  log.endedAt = new Date().toISOString();
  log.final = final;
  log.verdict = final.summary?.verdict ?? null;
  log.proof = final.summary?.proof ?? null;
  await page.screenshot({ path: join(OUT, "02-end.png") });

  writeFileSync(join(OUT, "fix-death-001-step2-report.json"), JSON.stringify(log, null, 2));
  writeFileSync(
    join(OUT, "window-FIX_DEATH_001_S2.json"),
    JSON.stringify(
      {
        enabled: final.enabled,
        summary: final.summary,
        absoluteMinBody: final.absoluteMinBody,
        absoluteMinHead: final.absoluteMinHead,
        floorHitsAt13: final.floorHitsAt13,
        belowThresholdCount: final.belowThresholdCount,
        breakCounts: final.breakCounts,
        turnCounts: final.turnCounts,
        series: final.series,
        samples: final.samples,
      },
      null,
      2
    )
  );
  writeFileSync(join(OUT, "console-FIX_DEATH_001_S2.json"), JSON.stringify(consoleLines, null, 2));

  await context.tracing.stop({ path: join(OUT, "media", "playwright-trace.zip") });
  await context.close();
  await browser.close();

  const media = readdirSync(join(OUT, "media"));
  writeFileSync(
    join(OUT, "cpo-pack-index.json"),
    JSON.stringify(
      {
        rc: "FIX-DEATH-001",
        step: "approach_floor",
        commit: COMMIT,
        preview: BASE,
        url: log.url,
        verdict: log.verdict,
        proof: log.proof,
        absoluteMinBody: final.absoluteMinBody,
        absoluteMinHead: final.absoluteMinHead,
        canReachCollisionRadius: final.summary?.canReachCollisionRadius ?? null,
        topBreakReasons: final.summary?.topBreakReasons ?? [],
        topTurnActors: final.summary?.topTurnActors ?? [],
        media,
        next:
          final.summary?.canReachCollisionRadius === true
            ? "Approach possible → FIX-DEATH-002 rethink (evaluator inputs vs hit path)"
            : "Cause candidate from verdict → FIX-DEATH-002 one fix only after CPO confirm",
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        verdict: log.verdict,
        proof: log.proof,
        absoluteMinBody: final.absoluteMinBody,
        absoluteMinHead: final.absoluteMinHead,
        canReach: final.summary?.canReachCollisionRadius,
        topBreak: final.summary?.topBreakReasons,
        topTurn: final.summary?.topTurnActors,
        out: OUT,
      },
      null,
      2
    )
  );
} catch (err) {
  log.error = String(err?.stack ?? err);
  writeFileSync(join(OUT, "fix-death-001-step2-report.json"), JSON.stringify(log, null, 2));
  await context.tracing.stop({ path: join(OUT, "media", "playwright-trace.zip") }).catch(() => {});
  await browser.close().catch(() => {});
  console.error(log.error);
  process.exit(1);
}
