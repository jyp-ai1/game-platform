import { test, expect } from "@playwright/test";

import { ADMIN_ROUTES, PLAYABLE_SLUGS, STATIC_ROUTES } from "./helpers/constants";

const ALL_ROUTES = [
  ...STATIC_ROUTES.map((r) => ({ path: r, kind: "static" as const })),
  ...ADMIN_ROUTES.map((r) => ({ path: r, kind: "admin" as const })),
  ...PLAYABLE_SLUGS.map((slug) => ({
    path: `/games/${slug}`,
    kind: "game" as const,
  })),
];

for (const { path, kind } of ALL_ROUTES) {
  test(`404 check ${kind} ${path}`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(res?.status(), `${path} should not 404`).toBeLessThan(400);
    expect(res?.status()).not.toBe(404);
  });
}
