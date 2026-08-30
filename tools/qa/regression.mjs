/**
 * Unit + static regression probes (Bomber seat, bomb authority, Snake AI, Agar split).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { devices } from "playwright";
import { BASE, ROOT, enterGame, invitePath } from "./lib/mp-common.mjs";

export function probeCode(mark) {
  const pad = readFileSync(join(ROOT, "packages/game-sdk/src/floating-mobile-pad.tsx"), "utf8");
  const bomber = readFileSync(join(ROOT, "games/bomber/src/Bomber.tsx"), "utf8");
  const engine = readFileSync(join(ROOT, "games/bomber/src/bomber-engine.ts"), "utf8");
  const agar = readFileSync(join(ROOT, "games/agar/src/Agar.tsx"), "utf8");

  mark("bomber-host-seat-pin", engine.includes("hostId") && engine.includes("seat 0"));
  mark("bomber-reconcile-hostId", bomber.includes("reconcileHumans") && bomber.includes("hostId"));
  mark("bomber-state-ack-gate", bomber.includes("stateAckRef") && bomber.includes("waitForHostStateAck"));
  mark("bomber-qa-hook", bomber.includes("__BOMBER_QA__") && bomber.includes("__BOMBER_QA_PLANT__"));
  mark("floating-pad-left-half-joystick", pad.includes("clientX < half"));
  mark("agar-qa-split-hook", agar.includes("mp_qa_split") && agar.includes("__AGAR_QA__"));
}

export function probeUnitTests(mark) {
  try {
    execSync(
      "node --import tsx --test games/bomber/src/__tests__/bomber-online-003.test.ts games/bomber/src/__tests__/bomber-online-004.test.ts",
      { cwd: ROOT, encoding: "utf8", timeout: 90_000, stdio: ["pipe", "pipe", "pipe"] }
    );
    mark("bomber-host-seat-unit", true);
  } catch (e) {
    mark("bomber-host-seat-unit", false, {
      note: String(e?.stderr ?? e?.message ?? e).slice(0, 200),
    });
  }
  try {
    execSync("node --import tsx --test games/bomber/src/__tests__/bomber-online-003.test.ts", {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 60_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    mark("bomber-bomb-authority-unit", true);
  } catch (e) {
    mark("bomber-bomb-authority-unit", false, {
      note: String(e?.stderr ?? e?.message ?? e).slice(0, 200),
    });
  }
  try {
    execSync("node --import tsx --test games/snake/src/__tests__/snake-phase2-2.test.ts", {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 60_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    mark("snake-ai-movement-unit", true);
  } catch {
    mark("snake-ai-movement-unit", false);
  }
}

export async function probeAgarSplit(page, mark) {
  await page.setViewportSize(devices["iPhone 13"].viewport);
  await page.goto(`${BASE}${invitePath("agar", "WORLD-AGAR010", "mp_qa_split=1&mp_qa_pad=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "agar");

  const qaReady = await page
    .waitForFunction(() => typeof window.__AGAR_QA__ === "function" && window.__AGAR_QA__().ready, {
      timeout: 15_000,
    })
    .then(() => true)
    .catch(() => false);
  mark("agar-split-setup-ready", qaReady);

  const setup = await page.evaluate(() => window.__AGAR_QA__?.() ?? null);
  if (!qaReady) {
    mark("agar-split-cells-change", false, { note: "setup fail" });
    return;
  }

  const cellsBefore = setup?.cells ?? 0;
  await page.keyboard.press("Space");
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => window.__AGAR_QA__?.() ?? null);
  mark("agar-split-cells-change", (after?.cells ?? 0) > cellsBefore || (after?.cells ?? 0) >= 2, {
    cellsBefore,
    cellsAfter: after?.cells,
  });
}
