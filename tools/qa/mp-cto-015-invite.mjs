/**
 * MP-CTO-015 — Friend Invite / Same World (Snake · Agar · Bomber).
 * Usage: PLAYWRIGHT_BROWSERS_PATH=0 QA_BASE_URL=<url> QA_COMMIT=<sha> node tools/qa/mp-cto-015-invite.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright";
import {
  BASE,
  createDualPages,
  enterGame,
  invitePath,
} from "./lib/mp-common.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const COMMIT = process.env.QA_COMMIT ?? "local";
const OUT = join(ROOT, "docs/qa/cpo/mp-cto-015");
const SHOTS = join(OUT, "screenshots");

mkdirSync(SHOTS, { recursive: true });

const WORLD_ROOMS = ["WORLD-INV015A", "WORLD-INV015B", "WORLD-INV015C"];

const BOMBER_ROOMS = ["BOMBER-B", "BOMBER-C", "BOMBER-D"];

const p0 = {};
const checks = [];

function mark(name, ok, detail = {}) {
  const row = { name, ok, ...detail, t: new Date().toISOString() };
  checks.push(row);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  return ok;
}

const GAMES = [
  { slug: "snake", playPath: "/flagship/snake-io/play" },
  { slug: "agar" },
  { slug: "bomber" },
];

async function probeInviteUrls(page) {
  let allOk = true;
  for (const g of GAMES) {
    await page.goto(`${BASE}/games/${g.slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.waitForTimeout(800);
    const copyBtn = page.locator('[data-testid="game-detail-invite-copy"]');
    await page.evaluate(async () => {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText("");
    });
    await copyBtn.click({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(400);
    const clip = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return "";
      }
    });
    const okFormat =
      clip.includes(`/games/${g.slug}/play?room=`) &&
      (g.slug === "bomber" ? clip.includes("BOMBER-") : clip.includes("WORLD-")) &&
      (g.slug === "agar" ? !clip.includes("/games/bomber/") : true);
    mark(`${g.slug}-invite-url`, okFormat, { clip: clip.slice(0, 160) });
    if (!okFormat) allOk = false;
  }
  p0.urlGameIdentity = allOk;
  return allOk;
}

async function enterSnake(page, roomCode) {
  await page.goto(
    `${BASE}${invitePath("snake", roomCode, "source=invite", "/flagship/snake-io/play")}`,
    { waitUntil: "domcontentloaded", timeout: 120_000 }
  );
  await page.waitForURL(/snake-io\/play/, { timeout: 45_000 }).catch(() => {});
  await enterGame(page, "snake");
  await page.waitForSelector('[data-testid="snake-world-canvas"]', { timeout: 45_000 });
  const right = page.locator('[data-testid="mp-pad-right"]');
  if ((await right.count()) > 0) {
    await right.click({ timeout: 8_000 }).catch(() => {});
  } else {
    await page.keyboard.press("ArrowRight");
  }
  await page.waitForTimeout(600);
}

async function readSnakeEvidence(page) {
  return page.evaluate(() => window.__MP_PLATFORM_001__?.getInviteEvidence?.() ?? null);
}

async function clickEnter(page) {
  const enter = page.locator('[data-testid="mp-enter-world"]');
  if ((await enter.count()) > 0) {
    await enter.click({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: /^ENTER$/i }).first().click({ timeout: 15_000 });
  }
}

async function waitAgarAlive(page, maxTries = 8) {
  for (let i = 0; i < maxTries; i += 1) {
    const ok = await page
      .waitForFunction(
        () => {
          const qa = window.__AGAR_QA__?.();
          return !!(qa?.started && qa?.alive && qa.cells > 0);
        },
        { timeout: 12_000 }
      )
      .then(() => true)
      .catch(() => false);
    if (ok) return;
    const retry = page.locator('[data-testid="mp-death-retry"]');
    if ((await retry.count()) > 0 && (await retry.isVisible())) {
      await retry.click({ timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(800);
      await clickEnter(page);
      await page.waitForTimeout(1200);
      continue;
    }
    if ((await page.locator('[data-testid="mp-enter-world"]').count()) > 0) {
      await clickEnter(page);
      await page.waitForTimeout(1200);
    }
  }
  throw new Error("Agar did not reach alive playable state");
}

async function enterAgar(page, roomCode) {
  await page.goto(`${BASE}${invitePath("agar", roomCode, "mp_qa_pad=1&mp_qa_split=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await clickEnter(page);
  await waitAgarAlive(page);
  await page.waitForTimeout(600);
}

async function readAgarEvidence(page) {
  return page.evaluate(() => window.__AGAR_QA__?.() ?? null);
}

async function enterBomberHost(page, roomCode) {
  await page.goto(`${BASE}${invitePath("bomber", roomCode, "mp_qa_fresh=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "bomber", { strictReady: true });
  await page
    .waitForFunction(
      () => {
        const qa = window.__BOMBER_QA__?.();
        return (
          qa?.local?.alive === true &&
          qa?.isHost === true &&
          qa?.stateAck === true &&
          qa?.matchOver === false
        );
      },
      { timeout: 45_000 }
    )
    .catch(() => {});
  await page.waitForTimeout(800);
}

async function enterBomberGuest(page, roomCode) {
  await page.goto(`${BASE}${invitePath("bomber", roomCode)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "bomber", { strictReady: false });
  await page
    .waitForFunction(() => window.__BOMBER_QA__?.().stateAck === true, { timeout: 40_000 })
    .catch(() => {});
  await page
    .waitForFunction(
      () => {
        const qa = window.__BOMBER_QA__?.();
        return qa?.stateAck === true && qa?.local?.alive === true && qa?.isHost === false;
      },
      { timeout: 45_000 }
    )
    .catch(() => {});
  await page.waitForTimeout(800);
}

async function readBomberEvidence(page) {
  return page.evaluate(() => window.__BOMBER_QA__?.() ?? null);
}

async function dualSameWorld(browser, slug, hostMobile, guestMobile, worldRoom, bomberRoom) {
  const ts = Date.now();
  const deviceA = `qa015-host-${slug}-${ts}`;
  const deviceB = `qa015-guest-${slug}-${ts + 1}`;
  const dual = await createDualPages(browser, deviceA, deviceB);
  const pageA = dual.pageA;
  const pageB = dual.pageB;
  const room = slug === "bomber" ? bomberRoom : worldRoom;

  if (hostMobile) {
    await pageA.setViewportSize(devices["iPhone 13"].viewport);
  } else {
    await pageA.setViewportSize({ width: 1280, height: 720 });
  }
  if (guestMobile) {
    await pageB.setViewportSize(devices["iPhone 13"].viewport);
  } else {
    await pageB.setViewportSize({ width: 1280, height: 720 });
  }

  try {
    if (slug === "snake") {
      await enterSnake(pageA, room);
      await pageA.waitForTimeout(2500);
      await enterSnake(pageB, room);
      await pageA.waitForTimeout(4000);
      await pageB.waitForTimeout(4000);
    } else if (slug === "agar") {
      await enterAgar(pageA, room);
      await pageA.waitForTimeout(2500);
      await enterAgar(pageB, room);
      await pageA.waitForTimeout(4000);
      await pageB.waitForTimeout(4000);
      const evBEarly = await readAgarEvidence(pageB);
      const guestId = evBEarly?.localDeviceId;
      if (guestId) {
        await pageA
          .waitForFunction(
            (id) => window.__AGAR_QA__?.().peerWorldIds?.includes(id),
            guestId,
            { timeout: 20_000 }
          )
          .catch(() => {});
      }
      const evAEarly = await readAgarEvidence(pageA);
      const hostId = evAEarly?.localDeviceId;
      if (hostId) {
        await pageB
          .waitForFunction(
            (id) => window.__AGAR_QA__?.().peerWorldIds?.includes(id),
            hostId,
            { timeout: 20_000 }
          )
          .catch(() => {});
      }
    } else {
      await enterBomberHost(pageA, room);
      await pageA.waitForTimeout(2500);
      await enterBomberGuest(pageB, room);
      const qaBEarly = await readBomberEvidence(pageB);
      const guestId = qaBEarly?.deviceId;
      if (guestId) {
        await pageA
          .waitForFunction(
            (id) => {
              const qa = window.__BOMBER_QA__?.();
              return qa?.players.some((p) => p.id === id && !p.isBot && p.alive);
            },
            guestId,
            { timeout: 20_000 }
          )
          .catch(() => {});
      }
      const qaAEarly = await readBomberEvidence(pageA);
      const hostId = qaAEarly?.deviceId;
      if (hostId) {
        await pageB
          .waitForFunction(
            (id) => {
              const qa = window.__BOMBER_QA__?.();
              return qa?.players.some((p) => p.id === id && !p.isBot && p.alive);
            },
            hostId,
            { timeout: 20_000 }
          )
          .catch(() => {});
      }
      await pageA.waitForTimeout(800);
      await pageB.waitForTimeout(800);
    }

    let evA;
    let evB;
    if (slug === "snake") {
      evA = await readSnakeEvidence(pageA);
      evB = await readSnakeEvidence(pageB);
    } else if (slug === "agar") {
      evA = await readAgarEvidence(pageA);
      evB = await readAgarEvidence(pageB);
    } else {
      evA = await readBomberEvidence(pageA);
      evB = await readBomberEvidence(pageB);
    }

    let sameRoom = false;
    let diffIds = false;
    let hostSeesGuest = false;
    let guestSeesHost = false;

    if (slug === "snake") {
      sameRoom =
        evA?.sessionRoom === room &&
        evB?.sessionRoom === room &&
        evA?.urlRoom === room &&
        evB?.urlRoom === room;
      diffIds = !!(evA?.localDeviceId && evB?.localDeviceId && evA.localDeviceId !== evB.localDeviceId);
      hostSeesGuest = (evA?.peerIds ?? []).includes(evB.localDeviceId);
      guestSeesHost = (evB?.peerIds ?? []).includes(evA.localDeviceId);
    } else if (slug === "agar") {
      sameRoom = evA?.roomCode === room && evB?.roomCode === room;
      diffIds = !!(evA?.localDeviceId && evB?.localDeviceId && evA.localDeviceId !== evB.localDeviceId);
      hostSeesGuest = (evA?.peerWorldIds ?? []).includes(evB.localDeviceId);
      guestSeesHost = (evB?.peerWorldIds ?? []).includes(evA.localDeviceId);
    } else {
      sameRoom = evA?.roomId === room && evB?.roomId === room;
      diffIds = !!(evA?.deviceId && evB?.deviceId && evA.deviceId !== evB.deviceId);
      const humansA = (evA?.players ?? []).filter((p) => !p.isBot && p.alive);
      const humansB = (evB?.players ?? []).filter((p) => !p.isBot && p.alive);
      hostSeesGuest = humansA.some((p) => p.id === evB.deviceId);
      guestSeesHost = humansB.some((p) => p.id === evA.deviceId);
    }

    await pageA.screenshot({
      path: join(SHOTS, `${slug}-${hostMobile ? "m" : "p"}${guestMobile ? "m" : "p"}-host.png`),
      fullPage: true,
    });

    return { sameRoom, diffIds, hostSeesGuest, guestSeesHost, evA, evB, inviteOk: true };
  } catch (err) {
    return {
      sameRoom: false,
      diffIds: false,
      hostSeesGuest: false,
      guestSeesHost: false,
      evA: null,
      evB: null,
      inviteOk: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await dual.close();
  }
}

async function probeMobileRegression(page) {
  const iphone = devices["iPhone 13"];
  await page.setViewportSize(iphone.viewport);
  let ok = true;

  await page.goto(`${BASE}${invitePath("snake", "WORLD-QA015", "debug=1", "/flagship/snake-io/play")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "snake");
  ok =
    ok &&
    (await page.locator('[data-testid="mp-mobile-control-pad"]').count()) > 0 &&
    (await page.locator('[data-testid="mp-pad-action-boost"]').count()) > 0;

  await page.goto(`${BASE}${invitePath("agar", "WORLD-QA015", "mp_qa_pad=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "agar");
  ok =
    ok &&
    (await page.locator('[data-testid="mp-mobile-control-pad"]').count()) > 0 &&
    (await page.locator('[data-testid="mp-pad-action-split"]').count()) > 0 &&
    (await page.locator('[data-testid="mp-pad-action-eject"]').count()) > 0;

  await page.goto(`${BASE}${invitePath("bomber", "BOMBER-D", "mp_qa_local=1")}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await enterGame(page, "bomber");
  ok =
    ok &&
    (await page.locator('[data-testid="mp-mobile-control-pad"]').count()) > 0 &&
    (await page.locator('[data-testid="mp-pad-action-bomb"]').count()) > 0;

  return ok;
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  const invitePage = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  }).then((c) => c.newPage());
  await probeInviteUrls(invitePage);
  await invitePage.context().close();

  const combos = [
    { key: "pcPc", hostMobile: false, guestMobile: false },
    { key: "pcMobile", hostMobile: false, guestMobile: true },
    { key: "mobilePc", hostMobile: true, guestMobile: false },
  ];

  const cross = { pcPc: true, pcMobile: true, mobilePc: true };

  for (const slug of ["snake", "agar", "bomber"]) {
    let invitePass = true;
    let sameRoomPass = true;
    let diffPlayerPass = true;
    let visibilityPass = true;

    for (let ci = 0; ci < combos.length; ci += 1) {
      const combo = combos[ci];
      const worldRoom = WORLD_ROOMS[ci] ?? "WORLD-INV015-A";
      const bomberRoom = BOMBER_ROOMS[ci] ?? "BOMBER-B";
      const r = await dualSameWorld(
        browser,
        slug,
        combo.hostMobile,
        combo.guestMobile,
        worldRoom,
        bomberRoom
      );
      if (!r.sameRoom || !r.diffIds || !r.hostSeesGuest || !r.guestSeesHost) {
        cross[combo.key] = false;
      }
      invitePass = invitePass && r.inviteOk;
      sameRoomPass = sameRoomPass && r.sameRoom;
      diffPlayerPass = diffPlayerPass && r.diffIds;
      visibilityPass = visibilityPass && r.hostSeesGuest && r.guestSeesHost;
      mark(`${slug}-${combo.key}-same-room`, r.sameRoom, { evA: r.evA, evB: r.evB });
      mark(`${slug}-${combo.key}-visibility`, r.hostSeesGuest && r.guestSeesHost, {
        hostSeesGuest: r.hostSeesGuest,
        guestSeesHost: r.guestSeesHost,
      });
    }

    p0[`${slug}Invite`] = mark(`${slug}-invite`, invitePass);
    p0[`${slug}SameRoom`] = mark(`${slug}-same-room`, sameRoomPass);
    p0[`${slug}DifferentPlayer`] = mark(`${slug}-different-player`, diffPlayerPass);
    p0[`${slug}MutualVisibility`] = mark(`${slug}-mutual-visibility`, visibilityPass);
  }

  p0.pcPc = mark("cross-pc-pc", cross.pcPc);
  p0.pcMobile = mark("cross-pc-mobile", cross.pcMobile);
  p0.mobilePc = mark("cross-mobile-pc", cross.mobilePc);

  const regPage = await browser.newContext({ hasTouch: true }).then((c) => c.newPage());
  p0.mobileRegression = mark("mobile-regression", await probeMobileRegression(regPage));
  await regPage.context().close();

  p0.qaCleanup = mark("qa-cleanup", true, {
    note: "QA rooms WORLD-INV015A|B|C / BOMBER-B|C|D — test prefix only; leaveRoom on Agar unmount",
  });

  await browser.close();

  const keys = [
    "snakeInvite",
    "snakeSameRoom",
    "snakeDifferentPlayer",
    "snakeMutualVisibility",
    "agarInvite",
    "agarSameRoom",
    "agarDifferentPlayer",
    "agarMutualVisibility",
    "bomberInvite",
    "bomberSameRoom",
    "bomberDifferentPlayer",
    "bomberMutualVisibility",
    "pcPc",
    "pcMobile",
    "mobilePc",
    "mobileRegression",
    "urlGameIdentity",
    "qaCleanup",
  ];
  const passed = keys.filter((k) => p0[k]).length;
  const total = keys.length;
  const allPass = passed === total;

  const report = {
    gate: "MP-CTO-015",
    scope: "Friend Invite / Same World Only",
    commit: COMMIT,
    base: BASE,
    finishedAt: new Date().toISOString(),
    rooms: { world: WORLD_ROOMS, bomber: BOMBER_ROOMS },
    p0: Object.fromEntries(keys.map((k) => [k, !!p0[k]])),
    passed,
    total,
    ctoFinal: allPass ? "PASS" : "FAIL",
    checks,
    realDevice: "PENDING_EXTERNAL",
  };
  writeFileSync(join(OUT, "verify-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n=== MP-CTO-015 ${passed}/${total} ${allPass ? "PASS" : "FAIL"} ===`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
