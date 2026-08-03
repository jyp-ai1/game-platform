/** FIX-DEATH-001 Step1 — render vs physics head coordinate evidence. */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const OUT =
  process.env.FIX_DEATH_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-fix-death-001");
const BUDGET_MS = Number(process.env.FIX_DEATH_BUDGET_MS ?? 60000);
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
    const s = window.__FIX_DEATH_001__;
    const summary = typeof s?.summary === "function" ? s.summary() : null;
    return {
      enabled: !!s?.enabled,
      sampleCount: s?.samples?.length ?? 0,
      mismatchPhysicsCount: s?.mismatchPhysicsCount ?? 0,
      mismatchRenderCount: s?.mismatchRenderCount ?? 0,
      maxDeltaPhysics: s?.maxDeltaPhysics ?? 0,
      maxDeltaRender: s?.maxDeltaRender ?? 0,
      summary,
      samples: (s?.samples ?? []).slice(-40),
    };
  });
}

async function rampage(page) {
  const dirs = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"];
  for (let i = 0; i < 4; i++) {
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    await page.keyboard.down(d);
    await page.keyboard.down("Space");
    await page.waitForTimeout(500);
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
  if (text.includes("FIX-DEATH-001")) consoleLines.push({ t: Date.now(), type: msg.type(), text });
});

const log = {
  rc: "FIX-DEATH-001",
  step: "render_vs_physics",
  commit: COMMIT,
  base: BASE,
  startedAt: new Date().toISOString(),
  samples: [],
  console: consoleLines,
};

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
      verdict: s.summary?.verdict,
      proof: s.summary?.proof,
      maxDeltaPhysics: s.maxDeltaPhysics,
      maxDeltaRender: s.maxDeltaRender,
    });
    if (s.sampleCount >= 24 && s.summary?.verdict && s.summary.verdict !== "unknown" && Date.now() - t0 > 20_000) {
      break;
    }
  }

  const final = await sample(page);
  log.endedAt = new Date().toISOString();
  log.final = final;
  log.verdict = final.summary?.verdict ?? null;
  log.proof = final.summary?.proof ?? null;
  await page.screenshot({ path: join(OUT, "02-end.png") });

  writeFileSync(join(OUT, "fix-death-001-report.json"), JSON.stringify(log, null, 2));
  writeFileSync(
    join(OUT, "window-FIX_DEATH_001.json"),
    JSON.stringify(
      {
        enabled: final.enabled,
        summary: final.summary,
        mismatchPhysicsCount: final.mismatchPhysicsCount,
        mismatchRenderCount: final.mismatchRenderCount,
        maxDeltaPhysics: final.maxDeltaPhysics,
        maxDeltaRender: final.maxDeltaRender,
        samples: final.samples,
      },
      null,
      2
    )
  );
  writeFileSync(join(OUT, "console-FIX_DEATH_001.json"), JSON.stringify(consoleLines, null, 2));

  await context.tracing.stop({ path: join(OUT, "media", "playwright-trace.zip") });
  await context.close();
  await browser.close();

  const media = readdirSync(join(OUT, "media"));
  writeFileSync(
    join(OUT, "cpo-pack-index.json"),
    JSON.stringify(
      {
        rc: "FIX-DEATH-001",
        step: "render_vs_physics",
        commit: COMMIT,
        preview: BASE,
        url: log.url,
        verdict: log.verdict,
        proof: log.proof,
        maxDeltaPhysics: final.maxDeltaPhysics,
        maxDeltaRender: final.maxDeltaRender,
        sampleCount: final.sampleCount,
        media,
        next:
          log.verdict === "MISMATCH_PHYSICS_HEADXY"
            ? "ONE_FIX: collision head source = headX/Y (or resolveSnakeHead)"
            : log.verdict === "RENDER_INTERP_ONLY" || log.verdict === "MATCH"
              ? "NO_FIX this step → Step2 human trajectory / approach floor"
              : "re-collect samples",
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
        sampleCount: final.sampleCount,
        maxDeltaPhysics: final.maxDeltaPhysics,
        maxDeltaRender: final.maxDeltaRender,
        out: OUT,
      },
      null,
      2
    )
  );
} catch (err) {
  log.error = String(err?.stack ?? err);
  writeFileSync(join(OUT, "fix-death-001-report.json"), JSON.stringify(log, null, 2));
  await context.tracing.stop({ path: join(OUT, "media", "playwright-trace.zip") }).catch(() => {});
  await browser.close().catch(() => {});
  console.error(log.error);
  process.exit(1);
}
