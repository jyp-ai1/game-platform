/**
 * MP-GAME-STANDARD-001 hotfix probe — Preview entry paths.
 * Run: node docs/qa/mp-game-standard-001/preview-probe.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base =
  process.argv[2] ?? "https://game29-3lct6dc29-jyp-ai1s-projects.vercel.app";

const paths = [
  { slug: "snake", url: `${base}/flagship/snake-io/play?room=WORLD` },
  { slug: "agar", url: `${base}/games/agar/play?room=WORLD` },
  { slug: "bomber", url: `${base}/games/bomber/play?room=WORLD` },
  { slug: "snake-detail", url: `${base}/games/snake` },
  { slug: "agar-detail", url: `${base}/games/agar` },
];

const report = { base, at: new Date().toISOString(), results: [] };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

for (const { slug, url } of paths) {
  errors.length = 0;
  const row = { slug, url, ok: false, title: "", bodySnippet: "", errors: [] };
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    row.status = resp?.status() ?? 0;
    await page.waitForTimeout(2500);
    row.title = await page.title();
    const body = await page.locator("body").innerText();
    row.bodySnippet = body.slice(0, 400).replace(/\s+/g, " ").trim();
    row.hasConnectionError = /잠시 연결이 불안정/.test(body);
    row.hasMpLobby = /Multiplayer|ENTER WORLD|Character|Difficulty/.test(body);
    row.hasPractice = /연습 모드|Practice/.test(body);
    row.ok = !row.hasConnectionError && (row.hasMpLobby || row.hasPractice);
    row.errors = [...errors];
  } catch (e) {
    row.errors = [String(e), ...errors];
  }
  report.results.push(row);
  console.log(JSON.stringify(row, null, 2));
}

await browser.close();
const out = path.join(__dirname, "preview-probe.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log("wrote", out);
