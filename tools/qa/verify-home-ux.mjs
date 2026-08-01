#!/usr/bin/env node
import { chromium } from "@playwright/test";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3006";

async function check(browser, w, h, mobile) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("h1", { state: "attached", timeout: 30000 });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const vh = window.innerHeight;
    const cta = document.querySelector('[data-testid="home-hero-cta"]');
    const ctaRect = cta?.getBoundingClientRect();
    const sections = [...document.querySelectorAll("section[aria-labelledby], section[data-testid]")].map(
      (el) =>
        el.getAttribute("data-testid") ||
        el.querySelector("h2")?.textContent?.trim() ||
        el.getAttribute("aria-labelledby")
    );
    const mpIdx = sections.findIndex((s) => s === "home-multiplayer-grid" || String(s).includes("multiplayer"));
    const timelineIdx = sections.findIndex((s) => String(s).toLowerCase().includes("timeline"));
    return {
      ctaInViewport: ctaRect ? ctaRect.bottom <= vh + 4 && ctaRect.top >= 0 : false,
      ctaBottom: ctaRect?.bottom ?? null,
      vh,
      h1: document.querySelector("h1")?.textContent ?? null,
      sections,
      multiplayerBeforeTimeline: mpIdx >= 0 && timelineIdx >= 0 ? mpIdx < timelineIdx : null,
    };
  });
  await ctx.close();
  return { width: w, height: h, ...r };
}

const browser = await chromium.launch({ headless: true });
const mobile = await check(browser, 375, 667, true);
const desktop = await check(browser, 1280, 800, false);
await browser.close();

console.log(JSON.stringify({ base: BASE, mobile, desktop }, null, 2));

const pass =
  mobile.ctaInViewport &&
  desktop.ctaInViewport &&
  mobile.multiplayerBeforeTimeline !== false &&
  desktop.multiplayerBeforeTimeline !== false;

process.exit(pass ? 0 : 1);
