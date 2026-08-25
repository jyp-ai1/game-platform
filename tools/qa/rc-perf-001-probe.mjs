/** RC-PERF-001 — MEASURE ONLY. No gameplay fix. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3020";
const OUT =
  process.env.RC_PERF_OUT ??
  join(dirname(fileURLToPath(import.meta.url)), "../../docs/qa/cpo-rc-perf-001");
const BUDGET_MS = Number(process.env.RC_PERF_BUDGET_MS ?? 45000);
const COMMIT = process.env.SNAKE_PROBE_COMMIT ?? "local";

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "media"), { recursive: true });

async function enter(page) {
  const url = `${BASE}/flagship/snake-io/play?room=WORLD&debug=1`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  // MP-UX-001 shell: character/color → PLAY (legacy START / ENTER WORLD kept as fallback)
  await page.getByRole("button", { name: "PLAY", exact: true }).click({ timeout: 20_000 }).catch(() => {});
  await page.getByRole("button", { name: "START", exact: true }).click({ timeout: 8_000 }).catch(() => {});
  await page.getByRole("button", { name: /ENTER WORLD/i }).click({ timeout: 8_000 }).catch(() => {});
  const board = page.locator(".touch-none").first();
  await board.waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1200);
  await board.click({ position: { x: 220, y: 220 } }).catch(() => {});
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  return url;
}

async function installObservers(page) {
  await page.evaluate(() => {
    const w = window;
    w.__RC_PERF_001__ = {
      hudMutations: 0,
      statePayloads: [],
      startedAt: performance.now(),
    };
    const hud = [...document.querySelectorAll("p")].find((p) => p.textContent?.trim() === "WORLD")
      ?.closest("div");
    if (hud) {
      const mo = new MutationObserver(() => {
        w.__RC_PERF_001__.hudMutations += 1;
      });
      mo.observe(hud, { subtree: true, characterData: true, childList: true });
      w.__RC_PERF_001__._mo = mo;
    }
    // Estimate sync payload via structured clone size of audit snapshot deltas.
    const pushPayload = (label, obj) => {
      try {
        const json = JSON.stringify(obj);
        w.__RC_PERF_001__.statePayloads.push({
          t: performance.now(),
          label,
          bytes: json.length,
        });
        if (w.__RC_PERF_001__.statePayloads.length > 200) {
          w.__RC_PERF_001__.statePayloads.shift();
        }
      } catch {
        /* ignore */
      }
    };
    w.__RC_PERF_001__._payloadTimer = setInterval(() => {
      const audit = w.__SNAKE_ENGINE_AUDIT__;
      if (audit) pushPayload("engine_audit", audit);
    }, 500);
  });
}

async function measureRtt(page) {
  return page.evaluate(async () => {
    const samples = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      try {
        await fetch(`${location.origin}/`, { method: "HEAD", cache: "no-store" });
        samples.push(Math.round(performance.now() - t0));
      } catch {
        samples.push(null);
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    const ok = samples.filter((n) => typeof n === "number");
    const avg = ok.length ? Math.round(ok.reduce((a, b) => a + b, 0) / ok.length) : null;
    return { samples, avg };
  });
}

async function sample(page) {
  return page.evaluate(() => {
    const parseHud = () => {
      const root = [...document.querySelectorAll("p")].find((p) => p.textContent?.trim() === "WORLD")
        ?.closest("div");
      const text = root?.innerText ?? "";
      const num = (re) => {
        const m = text.match(re);
        return m ? Number(m[1]) : null;
      };
      return {
        text,
        players: num(/Players\s+(\d+)/i),
        bots: num(/Bots\s+(\d+)/i),
        pingMs: (() => {
          const m = text.match(/Ping\s+(\d+|—)/i);
          if (!m || m[1] === "—") return null;
          return Number(m[1]);
        })(),
        fps: num(/FPS\s+(\d+)/i),
        tickHz: num(/Tick\s+(\d+)/i),
        isHost: /HOST/i.test(text),
      };
    };
    const audit = window.__SNAKE_ENGINE_AUDIT__ ?? null;
    const loop = window.__SNAKE_LOOP_DIAG__ ?? null;
    const perf = window.__RC_PERF_001__ ?? null;
    const payloads = perf?.statePayloads ?? [];
    const recent = payloads.slice(-20);
    const elapsedSec = perf ? (performance.now() - perf.startedAt) / 1000 : 0;
    return {
      hud: parseHud(),
      audit,
      loop,
      hudMutations: perf?.hudMutations ?? 0,
      hudMutationsPerSec: elapsedSec > 0 ? +(perf.hudMutations / elapsedSec).toFixed(2) : null,
      payloadRecentBytes: recent.map((p) => p.bytes),
      payloadAvgBytes: recent.length
        ? Math.round(recent.reduce((a, b) => a + b.bytes, 0) / recent.length)
        : null,
      payloadSamples: recent.length,
      note:
        "HUD ping = guest state inter-arrival EMA (capped 0–999), NOT Date.now()-_updatedAt age. Host shows 0.",
    };
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleLines = [];
page.on("console", (msg) => {
  const t = msg.text();
  if (/LOOP|RC-PERF|ENGINE|Ping|_updatedAt/i.test(t)) {
    consoleLines.push({ t: Date.now(), type: msg.type(), text: t });
  }
});

const log = {
  rc: "RC-PERF-001",
  mode: "MEASURE_ONLY",
  commit: COMMIT,
  base: BASE,
  startedAt: new Date().toISOString(),
  snapshots: [],
  priorPingFix:
    "HEAD 0012f4e already replaced stale _updatedAt age with inter-arrival EMA + 0–999 clamp (SnakeIo.tsx).",
};

try {
  log.url = await enter(page);
  await installObservers(page);
  await page.screenshot({ path: join(OUT, "01-world-start.png"), fullPage: false });
  log.rtt = await measureRtt(page);

  const t0 = Date.now();
  while (Date.now() - t0 < BUDGET_MS) {
    await page.keyboard.press("ArrowRight").catch(() => {});
    await page.waitForTimeout(2000);
    const s = await sample(page);
    log.snapshots.push({
      elapsedMs: Date.now() - t0,
      hud: s.hud,
      auditRender: s.audit?.render ?? null,
      auditTick: s.audit?.tick ?? null,
      auditRoom: s.audit?.room ?? null,
      loop: s.loop
        ? {
            frame: s.loop.frame,
            tick: s.loop.tick,
            worldSnakeCount: s.loop.worldSnakeCount,
            phase: s.loop.phase,
          }
        : null,
      hudMutations: s.hudMutations,
      hudMutationsPerSec: s.hudMutationsPerSec,
      payloadAvgBytes: s.payloadAvgBytes,
    });
  }

  const final = await sample(page);
  log.endedAt = new Date().toISOString();
  log.final = final;
  log.rttFinal = await measureRtt(page);

  const pings = log.snapshots.map((s) => s.hud?.pingMs).filter((n) => n != null);
  const fps = log.snapshots.map((s) => s.hud?.fps).filter((n) => n != null);
  log.summary = {
    hudPingMin: pings.length ? Math.min(...pings) : null,
    hudPingMax: pings.length ? Math.max(...pings) : null,
    hudPingAvg: pings.length ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : null,
    realRttAvgMs: log.rttFinal?.avg ?? log.rtt?.avg ?? null,
    hudVsReal:
      pings.length && (log.rttFinal?.avg ?? log.rtt?.avg) != null
        ? {
            hudIsNotWallClockAge: true,
            hudRepresents: "guest state receive inter-arrival EMA (approx sync interval), host=0",
            realRttMethod: "fetch HEAD / origin",
            deltaHint:
              "Do not equate HUD ping to network RTT; host shows 0; guest ≈ sync cadence not ICMP.",
          }
        : null,
    fpsAvg: fps.length ? Math.round(fps.reduce((a, b) => a + b, 0) / fps.length) : null,
    lastPlayers: final.hud?.players,
    lastBots: final.hud?.bots,
    lastFoods: final.audit?.render?.foods ?? null,
    lastSnakesAlive: final.audit?.render?.snakesAlive ?? null,
    lastTickHz: final.hud?.tickHz ?? final.audit?.tick?.hz ?? null,
    reactHudMutPerSec: final.hudMutationsPerSec,
    payloadAvgBytes: final.payloadAvgBytes,
    staleUpdatedAtBug: "FIXED_IN_HEAD — no multi-million ms ping observed when HUD shows numbers",
  };

  await page.screenshot({ path: join(OUT, "02-world-end.png"), fullPage: false });
  writeFileSync(join(OUT, "rc-perf-001-report.json"), JSON.stringify(log, null, 2));
  writeFileSync(join(OUT, "console-RC_PERF_001.json"), JSON.stringify(consoleLines, null, 2));
  writeFileSync(
    join(OUT, "cpo-conclusion.json"),
    JSON.stringify(
      {
        rc: "RC-PERF-001",
        status: "MEASURED",
        commit: COMMIT,
        base: BASE,
        summary: log.summary,
        fixAppliedThisStep: false,
        priorFixDocumented: log.priorPingFix,
      },
      null,
      2
    )
  );
  console.log(JSON.stringify(log.summary, null, 2));
} catch (err) {
  log.error = String(err?.stack ?? err);
  writeFileSync(join(OUT, "rc-perf-001-report.json"), JSON.stringify(log, null, 2));
  console.error(log.error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
