/** Fast MP-011 dual-context only (no mobile regression). */
process.env.QA_GATE = "mp-cto-cpo-qa-011";

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { createDualContextReport, probeDualContextBomber } from "./bomber-dual-context.mjs";

async function main() {
  const { BASE, COMMIT, OUT, createReportState } = await import("./lib/mp-common.mjs");
  mkdirSync(OUT, { recursive: true });
  mkdirSync(join(OUT, "screenshots"), { recursive: true });
  const { mark } = createReportState();
  const dualContext = createDualContextReport();
  const browser = await chromium.launch({ headless: true });
  try {
    await probeDualContextBomber(browser, mark, dualContext);
    console.log(JSON.stringify(dualContext, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
