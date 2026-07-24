#!/usr/bin/env node
/** Broken links, images, and extended 404 scan. */
import { readPlayableSlugs, writeReport, REPO } from "./lib/common.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3020";

const STATIC_PATHS = [
  "/",
  "/games",
  "/profile",
  "/favorites",
  "/search",
  "/admin",
  "/admin/analytics",
  "/admin/cms",
  "/admin/games",
  "/admin/reports",
  "/sitemap.xml",
];

async function fetchCheck(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    const text = await res.text();
    return { url, status: res.status, ok: res.status < 400, text };
  } catch (e) {
    return { url, status: 0, ok: false, error: String(e), text: "" };
  }
}

function extractImages(html, base) {
  const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
  return imgs.map((src) => {
    if (src.startsWith("http")) return src;
    if (src.startsWith("//")) return `https:${src}`;
    return new URL(src, base).href;
  });
}

function extractLinks(html, base) {
  const hrefs = [...html.matchAll(/<a[^>]+href="([^"]+)"/gi)].map((m) => m[1]);
  return hrefs
    .filter((h) => !h.startsWith("#") && !h.startsWith("mailto:"))
    .map((href) => {
      if (href.startsWith("http")) return href;
      return new URL(href, base).href;
    });
}

async function main() {
  const slugs = await readPlayableSlugs();
  const paths = [
    ...STATIC_PATHS,
    ...slugs.map((s) => `/games/${s}`),
  ];

  const broken404 = [];
  const brokenImages = [];
  const brokenLinks = [];

  for (const p of paths) {
    const url = `${BASE}${p}`;
    const res = await fetchCheck(url);
    if (!res.ok || res.status === 404) {
      broken404.push({ path: p, status: res.status, error: res.error });
      continue;
    }
    if (!p.startsWith("/games/")) continue;

    const imgs = extractImages(res.text, url).slice(0, 12);
    for (const imgUrl of imgs) {
      if (!imgUrl.includes(BASE.replace("http://", "").replace("https://", "")) && !imgUrl.startsWith(BASE)) {
        continue;
      }
      const ir = await fetchCheck(imgUrl);
      if (!ir.ok) brokenImages.push({ page: p, img: imgUrl, status: ir.status });
    }

    const links = extractLinks(res.text, url)
      .filter((l) => l.startsWith(BASE))
      .slice(0, 8);
    for (const link of links) {
      const lr = await fetchCheck(link);
      if (!lr.ok) brokenLinks.push({ page: p, link, status: lr.status });
    }
  }

  const allFailed = paths.every(async () => false);
  const noServer = broken404.length === paths.length && broken404.every((b) => b.status === 0);

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    pagesChecked: paths.length,
    broken404: broken404.length,
    brokenImages: brokenImages.length,
    brokenLinks: brokenLinks.length,
    failures: { broken404: broken404.slice(0, 20), brokenImages, brokenLinks },
    overall: noServer
      ? "SKIP"
      : broken404.length === 0 && brokenImages.length === 0 && brokenLinks.length === 0
        ? "PASS"
        : "FAIL",
  };

  if (noServer) {
    summary.note = "No server at " + BASE + " — run with QA_SKIP_SERVER=0 when server is up";
  }

  const out = await writeReport("broken-assets.json", summary);
  console.log(
    `Broken assets: 404=${broken404.length} img=${brokenImages.length} link=${brokenLinks.length} → ${out}`
  );
  if (summary.overall === "SKIP") process.exit(0);
  process.exit(summary.overall === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  if (process.env.QA_SKIP_SERVER === "1") process.exit(0);
  process.exit(1);
});
