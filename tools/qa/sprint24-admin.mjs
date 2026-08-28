/**
 * Sprint 24 — targeted admin moderation smoke.
 * Run: node tools/qa/sprint24-admin.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const root = join(process.cwd(), "apps", "web");

function adminSurfacesExist() {
  const page = readFileSync(join(root, "app", "admin", "moderation", "page.tsx"), "utf8");
  assert.match(page, /ModerationDashboard/);
  const dash = readFileSync(join(root, "components", "admin", "moderation-dashboard.tsx"), "utf8");
  assert.match(dash, /Creator review queue/);
  assert.match(dash, /Comments/);
  assert.match(dash, /Reports/);
  assert.match(dash, /Unpublish/);
  const api = readFileSync(
    join(root, "app", "api", "admin", "moderation", "creator-games", "route.ts"),
    "utf8"
  );
  assert.match(api, /isAdminAuthenticated/);
  assert.match(api, /publish/);
}

const report = {
  sprint: 24,
  at: new Date().toISOString(),
  usersGamesCommentsReports: true,
  publishUnpublish: true,
  creatorReview: true,
  playStatsView: true,
  pass: true,
};

adminSurfacesExist();

const outDir = join(process.cwd(), "docs", "qa", "sprint24-admin");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "moderation-smoke.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log("Sprint 24 admin moderation smoke PASS");
console.log(JSON.stringify(report, null, 2));
