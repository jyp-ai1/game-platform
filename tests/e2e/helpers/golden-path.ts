import { expect, type Page } from "@playwright/test";

import { attachConsoleMonitor } from "./console-monitor";

export type EntryLogCollector = {
  getSteps: () => string[];
  assertSteps: (required: string[]) => void;
};

/** Collect `[ENTRY]` console.info lines during a flow. */
export function attachEntryLogCollector(page: Page): EntryLogCollector {
  const steps: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[ENTRY]")) steps.push(text);
  });
  return {
    getSteps: () => [...steps],
    assertSteps(required: string[]) {
      const joined = steps.join("\n");
      for (const step of required) {
        expect(joined, `missing [ENTRY] ${step}`).toContain(`[ENTRY] ${step}`);
      }
    },
  };
}

/** Game HUD visible — WORLD or PRACTICE both acceptable for local E2E. */
export async function expectGameReady(page: Page, timeoutMs = 25_000): Promise<void> {
  const hud = page.getByText(/TOP 10|GLOBAL WORLD|50인 LIVE|SCORE/i).first();
  await expect(hud).toBeVisible({ timeout: timeoutMs });
  await expect(page.locator(".touch-none").first()).toBeVisible({ timeout: timeoutMs });
}

/** First input — arrow key should not crash. */
export async function expectInputWorks(page: Page): Promise<void> {
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(400);
}

export function attachGoldenPathMonitors(page: Page) {
  const consoleMon = attachConsoleMonitor(page);
  const entry = attachEntryLogCollector(page);
  return { consoleMon, entry };
}

/** Regression routes — must load without 500 or crash. */
export async function assertRegressionRoutes(page: Page): Promise<void> {
  const routes = [
    { path: "/", text: /LIVE|Snake\.io|Continue/i },
    { path: "/games", heading: /Discover/i },
    { path: "/community", heading: /Community/i },
    { path: "/passport", heading: /Memory|Collections/i },
  ];
  for (const route of routes) {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    if ("heading" in route && route.heading) {
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible({
        timeout: 20_000,
      });
    } else if ("text" in route && route.text) {
      await expect(page.getByText(route.text).first()).toBeVisible({ timeout: 20_000 });
    }
  }
}
