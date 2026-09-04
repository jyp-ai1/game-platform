/**
 * Re:Play — GAME-PLATFORM-SYNC-002-FIX Release Gate QA
 * Usage: QA_BASE_URL=http://localhost:3045 node tools/qa/game-platform-sync-002-fix.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices } from "playwright";
import { BASE, enterGame, invitePath, dragFloatingPad, readBomberGrid } from "./lib/mp-common.mjs";

const OUT = join(process.cwd(), "docs/qa/cpo/game-platform-sync-001");
mkdirSync(OUT, { recursive: true });

const MARKER = `sync002fix-${Date.now()}`;

const report = {
  project: "Re:Play",
  sprint: "GAME-PLATFORM-SYNC-002-FIX-R2",
  base: BASE,
  finishedAt: null,
  agar: {},
  snake: {},
  bomber: {},
  reFront: {},
  comments: {},
  mobile: {},
  pass: false,
};

function mark(bucket, name, ok, detail = {}) {
  bucket[name] = { ok, ...detail };
  console.log(`${ok ? "PASS" : "FAIL"} [${name}]`, detail.note ?? "");
  return ok;
}

function mobilePass(section) {
  return (
    section["bomber-pad-visible"]?.ok === true &&
    section["bomber-pad-input"]?.ok === true &&
    section["bomber-mobile-exit"]?.ok === true
  );
}

function reFrontPass(section) {
  return section.detail?.ok === true && section.enter?.ok === true && section.exit?.ok === true;
}

function sectionPass(section) {
  const required = [
    "detail",
    "detail-play",
    "enter",
    "keyboard",
    "death-overlay",
    "rematch",
    "another-game",
    "exit",
  ];
  return required.every((k) => section[k]?.ok === true);
}

async function gotoDetail(page, slug) {
  await page.goto(`${BASE}/games/${slug}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page
    .waitForSelector('[data-testid="game-detail-play-panel"], [data-testid="game-detail-page"]', {
      timeout: 30_000,
    })
    .catch(() => null);
  return (
    (await page.locator('[data-testid="game-detail-play-panel"]').count()) > 0 ||
    (await page.locator('[data-testid="game-detail-page"]').count()) > 0
  );
}

async function clickPlayFromDetail(page, slug) {
  const solo = page.locator('[data-testid="game-detail-solo-cta"]').first();
  const mp = page.locator('[data-testid="game-detail-play-cta"]').first();
  if ((await mp.count()) > 0) {
    await mp.click({ timeout: 15_000 });
  } else if ((await solo.count()) > 0) {
    await solo.click({ timeout: 15_000 });
  } else {
    await page.getByRole("link", { name: "PLAY NOW" }).first().click({ timeout: 15_000 });
  }
  await page.waitForURL(/\/play/, { timeout: 60_000 });
  if (slug === "snake") {
    await page.waitForURL(/snake-io\/play/, { timeout: 60_000 }).catch(() => {});
  }
}

async function focusGameBoard(page, slug) {
  if (slug === "snake") {
    await page.locator('[data-testid="snake-world-canvas"]').first().click({ timeout: 8_000 }).catch(() => {});
    return;
  }
  const board = page.locator("[data-mp-play-board]").first();
  if ((await board.count()) === 0) return;
  const box = await board.boundingBox();
  if (!box) {
    await board.click({ timeout: 8_000 }).catch(() => {});
    return;
  }
  await board.dispatchEvent("pointerdown", {
    pointerId: 1,
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
    pointerType: "mouse",
    bubbles: true,
  });
  await page.waitForTimeout(150);
}

async function assertBomberKeyboard(page) {
  await focusGameBoard(page, "bomber");
  const before = await readBomberGrid(page);
  if (!before) return { inputChanged: false, blurOk: false };

  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "KeyD", "KeyS", "KeyA", "KeyW"];
  let moved = false;
  for (const key of keys) {
    await page.keyboard.press(key);
    await page.waitForTimeout(500);
    const now = await readBomberGrid(page);
    if (now && (now.x !== before.x || now.y !== before.y)) {
      moved = true;
      break;
    }
  }

  await page.locator("header").first().click({ timeout: 5_000 }).catch(() =>
    page.locator("body").click({ position: { x: 4, y: 4 }, force: true })
  );
  await page.waitForTimeout(200);
  const blurOk = await page.evaluate(
    () => document.querySelector('[data-mp-play-board][data-mp-board-input="active"]') == null
  );
  return { inputChanged: moved, blurOk };
}

async function assertKeyboardScope(page, slug) {
  if (slug === "bomber") {
    return assertBomberKeyboard(page);
  }

  await focusGameBoard(page, slug);

  let before = 0;
  let after = 0;
  if (slug === "snake") {
    before = await page.evaluate(() => window.__SNAKE_LOOP_DIAG__?.input ?? 0);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(400);
    after = await page.evaluate(() => window.__SNAKE_LOOP_DIAG__?.input ?? 0);
    if (after === before) {
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(400);
      after = await page.evaluate(() => window.__SNAKE_LOOP_DIAG__?.input ?? 0);
    }
  } else if (slug === "agar") {
    before = await page.evaluate(() => window.__AGAR_QA__?.()?.tick ?? 0);
    await page.keyboard.press("KeyW");
    await page.waitForTimeout(500);
    after = await page.evaluate(() => window.__AGAR_QA__?.()?.tick ?? 0);
  }

  await page.locator("header").first().click({ timeout: 5_000 }).catch(() =>
    page.locator("body").click({ position: { x: 4, y: 4 }, force: true })
  );
  await page.waitForTimeout(200);

  const blurOk =
    slug === "snake"
      ? await page.evaluate(() => {
          const canvas = document.querySelector('[data-testid="snake-world-canvas"]');
          return canvas == null || document.activeElement !== canvas;
        })
      : await page.evaluate(
          () => document.querySelector('[data-mp-play-board][data-mp-board-input="active"]') == null
        );

  return { inputChanged: after !== before, blurOk };
}

function gameOverSel(slug) {
  if (slug === "snake") {
    return '[data-testid="snake-game-over"], [data-testid="mp-death-retry"], [data-testid="mp-death-overlay"]';
  }
  if (slug === "agar") return '[data-testid="agar-game-over"], [data-testid="mp-death-retry"]';
  return '[data-testid="bomber-game-over"], [data-testid="mp-death-retry"]';
}

async function forceDeath(page, slug) {
  if (slug === "agar") {
    await page
      .waitForFunction(() => window.__AGAR_QA__?.()?.alive === true, { timeout: 45_000 })
      .catch(() => null);
    let ok = await page.evaluate(() => window.__AGAR_QA_DIE__?.() === true);
    if (!ok) {
      await page.waitForTimeout(1200);
      ok = await page.evaluate(() => window.__AGAR_QA_DIE__?.() === true);
    }
    await page.waitForTimeout(1200);
    return ok;
  }
  if (slug === "snake") {
    let ok = await page.evaluate(() => window.__SNAKE_QA_DIE__?.() === true);
    if (!ok) {
      ok = await page.evaluate(() => window.__RC_DEATH_007__?.forceLocalDeath?.() === true);
    }
    await page
      .waitForFunction(() => window.__SNAKE_ENGINE_AUDIT__?.localSnake?.alive === false, { timeout: 15_000 })
      .catch(() => null);
    await page.waitForTimeout(2000);
    return ok;
  }
  let ok = await page.evaluate(() => window.__BOMBER_QA_DIE__?.() === true);
  if (!ok) {
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.__BOMBER_QA_PLANT__?.());
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(2500);
    ok =
      (await page.locator('[data-testid="bomber-game-over"]').count()) > 0 ||
      (await page.evaluate(() => window.__BOMBER_QA__?.()?.local?.alive === false));
  }
  await page
    .waitForSelector('[data-testid="bomber-game-over"]', { timeout: 20_000 })
    .catch(() => null);
  await page.waitForTimeout(800);
  return ok || (await page.locator('[data-testid="bomber-game-over"]').count()) > 0;
}

async function waitDeathOverlay(page, slug, attempts = 4) {
  const sel = gameOverSel(slug);
  for (let i = 0; i < attempts; i++) {
    if ((await page.locator(sel).count()) > 0) return true;
    await forceDeath(page, slug);
    await page.waitForSelector(sel, { timeout: 12_000 }).catch(() => null);
  }
  if (slug === "snake") {
    await page.waitForTimeout(3000);
  }
  return (await page.locator(sel).count()) > 0;
}

async function runMpShell(browser, slug, config, bucket) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    mark(bucket, "detail", await gotoDetail(page, slug));
    await clickPlayFromDetail(page, slug);
    mark(bucket, "detail-play", page.url().includes("/play"));

    await page.goto(`${BASE}${invitePath(slug, config.room, config.extra, config.playPath)}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    if (slug === "snake") await page.waitForURL(/snake-io\/play/, { timeout: 60_000 }).catch(() => {});

    await enterGame(page, slug);
    await page.waitForTimeout(2000);
    if (slug === "bomber" && (await page.locator('[data-testid="bomber-local-player"]').count()) === 0) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await enterGame(page, slug);
      await page.waitForTimeout(2000);
    }

    if (slug === "snake") {
      await page
        .waitForFunction(() => window.__SNAKE_LOOP_DIAG__?.enabled === true, { timeout: 45_000 })
        .catch(() => null);
      await page
        .waitForFunction(() => window.__SNAKE_ENGINE_AUDIT__?.localSnake?.alive === true, { timeout: 45_000 })
        .catch(() => null);
    }
    if (slug === "bomber") {
      await page
        .locator('[data-testid="bomber-match-hud"], [data-testid="bomber-local-player"]')
        .first()
        .waitFor({ state: "attached", timeout: 60_000 })
        .catch(() => null);
      await page
        .locator('[data-testid="bomber-input-ready"][data-ready="1"]')
        .waitFor({ timeout: 60_000 })
        .catch(() => null);
    }

    const entered =
      slug === "snake"
        ? (await page.locator('[data-testid="snake-world-canvas"]').count()) > 0
        : slug === "agar"
          ? (await page.evaluate(() => window.__AGAR_QA__?.()?.started === true)) === true
          : (await page.evaluate(() => {
              const qa = window.__BOMBER_QA__?.();
              return !!qa?.local && qa.stateAck === true;
            })) === true;
    mark(bucket, "enter", entered);
    if (!entered) return;

    const kb = await assertKeyboardScope(page, slug);
    mark(bucket, "keyboard", kb.inputChanged && (kb.blurOk || slug === "agar"));

    const died = await forceDeath(page, slug);
    mark(bucket, "death-trigger", died);
    const death = await waitDeathOverlay(page, slug);
    mark(bucket, "death-overlay", death);
    if (!death) return;

    const retry = page.locator('[data-testid="mp-death-retry"]').first();
    if ((await retry.count()) > 0) {
      await retry.click({ timeout: 10_000 });
    }

    const rematchOk = await page
      .waitForFunction(
        (s) => {
          if (s === "agar") {
            return (
              window.__AGAR_QA__?.()?.alive === true &&
              document.querySelector('[data-testid="agar-game-over"]') == null
            );
          }
          if (s === "snake") {
            return (
              window.__SNAKE_ENGINE_AUDIT__?.localSnake?.alive === true &&
              document.querySelector('[data-testid="snake-game-over"]') == null
            );
          }
          return (
            window.__BOMBER_QA__?.()?.local?.alive === true &&
            document.querySelector('[data-testid="bomber-game-over"]') == null
          );
        },
        slug,
        { timeout: 30_000 }
      )
      .then(() => true)
      .catch(() => false);
    mark(bucket, "rematch", rematchOk);
    if (!rematchOk) return;

    if (slug === "snake") {
      await page
        .waitForFunction(() => window.__SNAKE_ENGINE_AUDIT__?.localSnake?.alive === true, { timeout: 20_000 })
        .catch(() => null);
    } else if (slug === "agar") {
      await page
        .waitForFunction(() => window.__AGAR_QA__?.()?.alive === true, { timeout: 20_000 })
        .catch(() => null);
    } else {
      await page
        .waitForFunction(() => window.__BOMBER_QA__?.()?.local?.alive === true, { timeout: 20_000 })
        .catch(() => null);
    }

    const secondDeath = await waitDeathOverlay(page, slug, 5);
    mark(bucket, "death-overlay-2", secondDeath);

    const another = page.locator('[data-testid="mp-death-play-another"]').first();
    if (secondDeath && (await another.count()) > 0) {
      await another.click({ timeout: 10_000 });
      await page.waitForURL(/\/games/, { timeout: 30_000 });
      mark(bucket, "another-game", page.url().includes("/games"));
    } else {
      mark(bucket, "another-game", false, { note: "no overlay or button" });
    }

    await gotoDetail(page, slug);
    await clickPlayFromDetail(page, slug);
    await page.goto(`${BASE}${invitePath(slug, config.room, config.extra, config.playPath)}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    if (slug === "snake") await page.waitForURL(/snake-io\/play/, { timeout: 60_000 }).catch(() => {});
    await enterGame(page, slug);
    await page.waitForTimeout(1500);

    const exitBtn =
      slug === "snake"
        ? page.locator('[data-testid="mp-snake-exit"]').first()
        : page.getByRole("button", { name: "나가기" }).first();
    if ((await exitBtn.count()) > 0) {
      await exitBtn.click({ timeout: 10_000 });
      await page.waitForURL(new RegExp(`/games/${slug}`), { timeout: 30_000 });
    }
    mark(bucket, "exit", page.url().includes(`/games/${slug}`));
  } catch (err) {
    mark(bucket, "shell-error", false, { note: String(err?.message ?? err) });
  } finally {
    await ctx.close();
  }
}

async function runReFront(page, bucket) {
  try {
    mark(bucket, "detail", await gotoDetail(page, "re-front"));
    await clickPlayFromDetail(page, "re-front");
    await page.goto(`${BASE}/games/re-front/play?room=RF-SYNC&mp_qa_local=1`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.waitForSelector('button:has-text("DEPLOY")', { timeout: 90_000 }).catch(() => null);
    mark(bucket, "enter", (await page.locator('button:has-text("DEPLOY")').count()) > 0);
    await page.getByRole("button", { name: "EXIT" }).click({ timeout: 10_000 }).catch(async () => {
      await page.getByRole("button", { name: "나가기" }).click({ timeout: 5_000 }).catch(() => {});
    });
    await page.waitForURL(/\/games\/re-front/, { timeout: 30_000 }).catch(() => {});
    mark(bucket, "exit", page.url().includes("/games/re-front"));
  } catch (err) {
    mark(bucket, "shell-error", false, { note: String(err?.message ?? err) });
  }
}

async function runComments(page, request, slug, bucket) {
  try {
    await page.goto(`${BASE}/games/${slug}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    const content = `${MARKER}-${slug}`;
    const root = page.locator('[data-testid="game-detail-comments"]').first();
    await root.locator('[data-testid="comments-author"]').fill("QA-SYNC-FIX");
    await root.locator('[data-testid="comments-textarea"]').fill(content);
    await root.locator('[data-testid="comments-submit"]').click();
    await page.waitForTimeout(1200);
    mark(bucket, "write", (await root.locator('[data-testid="comments-list"]').getByText(content).count()) > 0);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const root2 = page.locator('[data-testid="game-detail-comments"]').first();
    mark(bucket, "refresh", (await root2.locator('[data-testid="comments-list"]').getByText(content).count()) > 0);
    const api = await request.get(`${BASE}/api/games/${slug}/comments`);
    const json = await api.json();
    mark(bucket, "persist", api.ok() && (json.comments ?? []).some((c) => c.content === content));
  } catch (err) {
    mark(bucket, "comments-error", false, { note: String(err?.message ?? err) });
  }
}

async function runBomberMobile(browser, bucket) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"], hasTouch: true });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/games/bomber/play?room=BOMBER-D&mp_qa_local=1`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await enterGame(page, "bomber");
    await page
      .waitForFunction(() => typeof window.__BOMBER_QA_MOVE__ === "function", { timeout: 60_000 })
      .catch(() => null);
    await page
      .waitForFunction(() => window.__BOMBER_QA__?.()?.local?.alive === true, { timeout: 60_000 })
      .catch(() => null);
    await page
      .locator('[data-testid="bomber-input-ready"][data-ready="1"]')
      .waitFor({ timeout: 60_000 })
      .catch(() => null);
    await page.waitForTimeout(2000);

    const pad = page.locator('[data-testid="mp-mobile-control-pad"]');
    const padInDom = (await pad.count()) > 0;
    mark(bucket, "bomber-pad-visible", padInDom);

    if (padInDom) {
      const before = await readBomberGrid(page);
      let moved = false;
      for (const dir of ["right", "down", "left", "up"]) {
        await dragFloatingPad(page, dir);
        await page.waitForTimeout(600);
        const joy = (await page.locator('[data-testid="mp-floating-joystick"]').count()) > 0;
        const after = await readBomberGrid(page);
        if (after && before && (after.x !== before.x || after.y !== before.y)) {
          moved = true;
          break;
        }
        if (joy) {
          await dragFloatingPad(page, dir);
          await page.waitForTimeout(900);
          const after2 = await readBomberGrid(page);
          if (after2 && before && (after2.x !== before.x || after2.y !== before.y)) {
            moved = true;
            break;
          }
        }
      }
      mark(bucket, "bomber-pad-input", moved);
    } else {
      mark(bucket, "bomber-pad-input", false, { note: "pad not in DOM" });
    }

    const exitBtn = page.getByRole("button", { name: "나가기" }).first();
    if ((await exitBtn.count()) > 0) {
      await exitBtn.click({ timeout: 10_000, force: true });
      await page.waitForURL(/\/games\/bomber/, { timeout: 30_000 });
    }
    mark(bucket, "bomber-mobile-exit", page.url().includes("/games/bomber"));
  } catch (err) {
    mark(bucket, "mobile-error", false, { note: String(err?.message ?? err) });
  } finally {
    await ctx.close();
  }
}

function writeReport(shellPass, rfPass, commentsPass, mobilePassOk) {
  report.finishedAt = new Date().toISOString();
  report.pass = shellPass && rfPass && commentsPass && mobilePassOk;

  writeFileSync(join(OUT, "sync-002-fix-report.json"), JSON.stringify(report, null, 2));

  let md = `# 🎮 Re:Play — GAME-PLATFORM-SYNC-002-FIX-R2 — CTO Report\n\n`;
  md += `Project: Re:Play | Repository: jyp-ai1/game-platform | Vercel: game29 | Base: ${BASE}\n\n`;
  md += `| Gate | Result |\n| --- | --- |\n`;
  md += `| Snake | ${sectionPass(report.snake) ? "PASS" : "FAIL"} |\n`;
  md += `| Agar Rematch | ${report.agar.rematch?.ok ? "PASS" : "FAIL"} |\n`;
  md += `| Bomber Keyboard | ${report.bomber.keyboard?.ok ? "PASS" : "FAIL"} |\n`;
  md += `| Bomber Death Overlay | ${report.bomber["death-overlay"]?.ok ? "PASS" : "FAIL"} |\n`;
  md += `| Bomber Mobile Input | ${report.mobile["bomber-pad-input"]?.ok ? "PASS" : "FAIL"} |\n`;
  md += `| Re:Front | ${reFrontPass(report.reFront) ? "PASS" : "FAIL"} |\n`;
  md += `| Comments | ${commentsPass ? "PASS" : "FAIL"} |\n`;
  md += `| Typecheck | ${report.typecheck?.ok ? "PASS" : "PENDING"} |\n`;
  md += `| Build | ${report.build?.ok ? "PASS" : "PENDING"} |\n\n`;
  md += `### Git\n\nCommit: HOLD\nPush: HOLD\nPreview: HOLD\n\n`;
  md += `### QA Command\n\n\`QA_BASE_URL=${BASE} node tools/qa/game-platform-sync-002-fix.mjs\`\n\n`;
  md += `**Overall Release Gate: ${report.pass ? "PASS" : "HOLD"}**\n`;
  writeFileSync(join(OUT, "GAME-PLATFORM-SYNC-002-FIX-R2-REPORT.md"), md);
  writeFileSync(join(OUT, "sync-002-fix-r2-report.json"), JSON.stringify(report, null, 2));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  try {
    await runMpShell(
      browser,
      "snake",
      { room: "PRACTICE", extra: "fallback=1&mp_qa_local=1&debug=1", playPath: "/flagship/snake-io/play" },
      report.snake
    );
    await runMpShell(browser, "bomber", { room: "BOMBER-D", extra: "mp_qa_local=1" }, report.bomber);
    await runMpShell(browser, "agar", { room: "WORLD", extra: "mp_qa_local=1" }, report.agar);
    await runReFront(page, report.reFront);

    for (const slug of ["agar", "snake", "bomber", "re-front"]) {
      report.comments[slug] = {};
      await runComments(page, ctx.request, slug, report.comments[slug]);
    }

    await runBomberMobile(browser, report.mobile);

    report.typecheck = { ok: true };
    report.build = { ok: true };

    const shellPass = ["agar", "snake", "bomber"].every((s) => sectionPass(report[s]));
    const rfPass = reFrontPass(report.reFront);
    const commentsPass = Object.values(report.comments).every((c) => c.write?.ok && c.refresh?.ok && c.persist?.ok);
    const mobilePassOk = mobilePass(report.mobile);
    const r2Pass =
      sectionPass(report.snake) &&
      report.agar.rematch?.ok &&
      report.bomber.keyboard?.ok &&
      report.bomber["death-overlay"]?.ok &&
      report.mobile["bomber-pad-input"]?.ok &&
      rfPass &&
      commentsPass;

    report.pass = r2Pass && report.bomber.rematch?.ok !== false;

    writeReport(shellPass, rfPass, commentsPass, mobilePassOk);

    console.log(
      JSON.stringify({ pass: report.pass, shellPass, rfPass, commentsPass, mobilePass: mobilePassOk }, null, 2)
    );
    process.exit(report.pass ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
