/**
 * MP-DETAIL-001 — HOME → DETAIL → WORLD PLAY → Character → GAME → EXIT → Lobby → DETAIL
 * Evidence: docs/qa/mp-detail-001/
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const PREVIEW =
  process.env.PREVIEW_URL ||
  "https://game29-9z73bylys-jyp-ai1s-projects.vercel.app";
const OUT = path.join("docs", "qa", "mp-detail-001");
fs.mkdirSync(OUT, { recursive: true });

const GAMES = [
  {
    slug: "snake",
    detail: "/games/snake",
    playPathIncludes: "snake-io/play",
  },
  {
    slug: "agar",
    detail: "/games/agar",
    playPathIncludes: "/games/agar/play",
  },
  {
    slug: "bomber",
    detail: "/games/bomber",
    playPathIncludes: "/games/bomber/play",
  },
];

function passFail(ok) {
  return ok ? "PASS" : "FAIL";
}

async function waitLobby(page) {
  await page.getByTestId("mp-entry-lobby").waitFor({ timeout: 25000 });
}

async function runGame(browser, g) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const steps = {
    homeToDetail: false,
    detailToPlay: false,
    playToCharacter: false,
    characterToGame: false,
    gameToExit: false,
    lobbyToDetail: false,
  };
  const detailUi = {
    thumbnail: false,
    description: false,
    multiplayer: false,
    shareInvite: false,
    comments: false,
  };
  const urls = {};
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e)));

  try {
    // HOME
    await page.goto(PREVIEW + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, `${g.slug}-00-home.png`), fullPage: true });

    // Prefer multiplayer card → Detail
    let navigated = false;
    const detailBtn = page
      .locator(`a[href="/games/${g.slug}"], a[href*="/games/${g.slug}"]`)
      .filter({ hasNot: page.locator('[href*="/play"]') })
      .first();
    if (await detailBtn.count()) {
      await detailBtn.click({ timeout: 8000 }).catch(() => null);
      await page.waitForTimeout(1500);
      navigated = page.url().includes(`/games/${g.slug}`) && !page.url().includes("/play");
    }
    if (!navigated) {
      await page.goto(PREVIEW + g.detail, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      // Mark HOME→DETAIL as fail if we had to force-navigate (card missing/wrong)
      steps.homeToDetail = false;
      errors.push("HOME card link to detail not found — forced goto detail");
    } else {
      steps.homeToDetail = true;
    }

    urls.detail = page.url();
    await page.waitForSelector('[data-testid="game-detail-page"]', { timeout: 20000 });
    await page.screenshot({
      path: path.join(OUT, `${g.slug}-01-detail.png`),
      fullPage: true,
    });

    // Detail UI checks
    detailUi.thumbnail =
      (await page.locator('[data-testid="game-detail-page"] img').count()) > 0;
    detailUi.description =
      (await page.getByTestId("game-detail-description").count()) > 0 &&
      ((await page.getByTestId("game-detail-description").innerText()).trim().length > 10);
    detailUi.multiplayer =
      (await page.getByTestId("game-detail-mp-badge").count()) > 0;
    detailUi.shareInvite =
      (await page.getByTestId("game-detail-share-btn").count()) > 0;
    detailUi.comments =
      (await page.getByTestId("game-detail-comments").count()) > 0;

    // DETAIL → WORLD PLAY
    const cta = page.getByTestId("game-detail-play-cta");
    const ctaText = (await cta.innerText()).trim();
    if (!/WORLD PLAY/i.test(ctaText)) {
      errors.push(`CTA text was "${ctaText}", expected WORLD PLAY`);
    }
    await cta.click();
    await page.waitForTimeout(3500);
    urls.afterPlayClick = page.url();
    steps.detailToPlay =
      page.url().includes(g.playPathIncludes) || page.url().includes("/play");

    await waitLobby(page);
    steps.playToCharacter = true;
    await page.screenshot({
      path: path.join(OUT, `${g.slug}-02-character.png`),
      fullPage: true,
    });

    // Character → Color (click a color) → ENTER WORLD
    const colorBtn = page.locator('[data-testid="mp-entry-lobby"] button[aria-label^="Color"]').nth(1);
    if (await colorBtn.count()) {
      await colorBtn.click().catch(() => null);
    }
    await page.getByTestId("mp-enter-world").click();
    await page.waitForTimeout(3000);
    const lobbyGone = (await page.getByTestId("mp-entry-lobby").count()) === 0;
    steps.characterToGame = lobbyGone;
    await page.screenshot({
      path: path.join(OUT, `${g.slug}-03-playing.png`),
      fullPage: true,
    });

    // EXIT → Character Lobby
    const exitBtn = page.getByRole("button", { name: /나가기/i }).first();
    if (await exitBtn.count()) {
      await exitBtn.click();
    } else {
      errors.push("나가기 button not found");
    }
    await waitLobby(page);
    steps.gameToExit = true;
    urls.afterExit = page.url();
    await page.screenshot({
      path: path.join(OUT, `${g.slug}-04-exit-lobby.png`),
      fullPage: true,
    });

    // Lobby BACK → Detail
    const backBtn = page.getByTestId("mp-play-back-detail").first();
    if (await backBtn.count()) {
      await backBtn.click();
    } else {
      await page.goBack();
    }
    await page.waitForTimeout(2000);
    urls.afterBack = page.url();
    const backPath = new URL(page.url()).pathname;
    steps.lobbyToDetail =
      backPath === `/games/${g.slug}` ||
      (backPath.includes(`/games/${g.slug}`) &&
        !backPath.includes("/play") &&
        !backPath.includes("snake-io/play"));
    // If back landed on play still, force detail check
    if (!steps.lobbyToDetail) {
      await page.goto(PREVIEW + g.detail, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      errors.push("Lobby BACK did not land on Detail — forced for screenshot");
      steps.lobbyToDetail = false;
    }
    await page.screenshot({
      path: path.join(OUT, `${g.slug}-05-back-detail.png`),
      fullPage: true,
    });
  } catch (e) {
    errors.push(String(e && e.stack ? e.stack : e));
    try {
      await page.screenshot({
        path: path.join(OUT, `${g.slug}-FAIL.png`),
        fullPage: true,
      });
    } catch {}
  }

  await page.close();
  return {
    slug: g.slug,
    steps: {
      homeToDetail: passFail(steps.homeToDetail),
      detailToPlay: passFail(steps.detailToPlay),
      playToCharacter: passFail(steps.playToCharacter),
      characterToGame: passFail(steps.characterToGame),
      gameToExit: passFail(steps.gameToExit),
      lobbyToDetail: passFail(steps.lobbyToDetail),
    },
    detailUi: Object.fromEntries(
      Object.entries(detailUi).map(([k, v]) => [k, passFail(v)])
    ),
    urls,
    errors,
    raw: steps,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const g of GAMES) {
    results.push(await runGame(browser, g));
  }
  await browser.close();

  // Aggregate Detail UI across games (all must pass)
  const detailKeys = ["thumbnail", "description", "multiplayer", "shareInvite", "comments"];
  const detailAgg = {};
  for (const k of detailKeys) {
    detailAgg[k] = results.every((r) => r.detailUi[k] === "PASS") ? "PASS" : "FAIL";
  }

  const report = {
    commit: "46759bc",
    preview: PREVIEW,
    at: new Date().toISOString(),
    results,
    detailUi: detailAgg,
    allFlowPass: results.every((r) =>
      Object.values(r.raw).every(Boolean)
    ),
    allDetailPass: Object.values(detailAgg).every((v) => v === "PASS"),
  };
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.allFlowPass && report.allDetailPass ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
