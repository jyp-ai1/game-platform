/**
 * SNAKE-PERF/UX-001 — L10–L400 canvas segment draw benchmark (with tail stride opt).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const OUT = dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

const LEVELS = [10, 100, 200, 300, 400];

async function measureInBrowser() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const results = await page.evaluate(async (levels) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { error: "no-ctx" };

    function drawSnake(segments, useStride) {
      const len = segments;
      const tailStride = useStride ? (len > 240 ? 3 : len > 120 ? 2 : 1) : 1;
      let drawn = 0;
      for (let i = len - 1; i >= 0; i--) {
        const isHead = i === 0;
        const isTail = i === len - 1;
        if (useStride && tailStride > 1 && !isHead && !isTail && i % tailStride !== 0) continue;
        const x = 400 + Math.cos(i * 0.05) * (50 + i * 0.15);
        const y = 400 + Math.sin(i * 0.05) * (50 + i * 0.15);
        ctx.beginPath();
        ctx.arc(x, y, isHead ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = isHead ? "#22c55e" : "#16a34a";
        ctx.fill();
        if (isHead) {
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🐍", x, y);
        }
        drawn += 1;
      }
      return drawn;
    }

    function frameCost(segments, useStride) {
      const samples = [];
      for (let s = 0; s < 40; s++) {
        const t0 = performance.now();
        ctx.clearRect(0, 0, 800, 800);
        const drawn = drawSnake(segments, useStride);
        const t1 = performance.now();
        samples.push({ frameMs: t1 - t0, drawn });
      }
      samples.sort((a, b) => a.frameMs - b.frameMs);
      const avg = samples.reduce((s, x) => s + x.frameMs, 0) / samples.length;
      const p95 = samples[Math.floor(samples.length * 0.95)].frameMs;
      return {
        segments,
        drawn: samples[0].drawn,
        avgFrameMs: Number(avg.toFixed(3)),
        p95FrameMs: Number(p95.toFixed(3)),
        estFpsAvg: Number((1000 / avg).toFixed(1)),
      };
    }

    return levels.map((L) => ({
      before: frameCost(L, false),
      after: frameCost(L, true),
    }));
  }, LEVELS);

  await browser.close();
  return results;
}

const rows = await measureInBrowser();
const levels = rows.map(({ before, after }) => ({
  segments: before.segments,
  drawCountBefore: before.drawn,
  drawCountAfter: after.drawn,
  avgFrameMsBefore: before.avgFrameMs,
  avgFrameMsAfter: after.avgFrameMs,
  p95FrameMsBefore: before.p95FrameMs,
  p95FrameMsAfter: after.p95FrameMs,
  estFpsBefore: before.estFpsAvg,
  estFpsAfter: after.estFpsAvg,
  estFpsGainPct: Number(
    (((after.estFpsAvg - before.estFpsAvg) / before.estFpsAvg) * 100).toFixed(1)
  ),
}));

const l300 = levels.find((l) => l.segments === 300);

const report = {
  measuredAt: new Date().toISOString(),
  note: "Canvas arc-fill proxy with tail stride (matches snake-world-canvas.ts).",
  bottleneck: "O(segments) per-frame arc fills; L300 ~2400B payload; stride cuts draw calls ~33–50% at L120+.",
  levels,
  l300Summary: l300
    ? `L300: ${l300.estFpsBefore}→${l300.estFpsAfter} fps est (${l300.drawCountBefore}→${l300.drawCountAfter} draws)`
    : null,
  targets: {
    L10_L200: "≥60fps est",
    L300: "playable (stride applied)",
    L400: "not severe lag",
  },
};

writeFileSync(join(OUT, "l300-perf.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
