/** @typedef {import('./types.mjs').GameManifest} GameManifest */

/**
 * @param {GameManifest} m
 * @param {{ codeExists?: boolean }} [opts]
 */
export function generateReleasePackage(m, opts = {}) {
  const codeExists = opts.codeExists ?? false;
  const autoPass = (cond) => (cond ? "PASS" : "PENDING");

  return {
    slug: m.slug,
    title: m.title,
    generatedAt: new Date().toISOString(),
    checklist: [
      { id: 1, item: "Game", status: autoPass(codeExists), note: "games/{slug} + wiring" },
      { id: 2, item: "Thumbnail", status: "PENDING", note: "generate-thumbnails.mjs or factory hook" },
      { id: 3, item: "SEO", status: "PASS", note: "seo.json — DB metadata from migration" },
      { id: 4, item: "OG", status: "PASS", note: "opengraph-image.tsx auto per slug" },
      { id: 5, item: "Leaderboard", status: autoPass(m.features.ranking), note: "reportScore + ranking_submit" },
      { id: 6, item: "Mission", status: "PARTIAL", note: "category auto; slug-specific optional" },
      { id: 7, item: "XP", status: "PARTIAL", note: "session hooks" },
      { id: 8, item: "Save", status: autoPass(m.features.save), note: "useAutoSave" },
      { id: 9, item: "Resume", status: autoPass(m.features.save), note: "useResumableGame" },
      { id: 10, item: "Category", status: "PASS", note: "migration.sql" },
      { id: 11, item: "Featured", status: "PASS", note: "cms.sql new_games" },
      { id: 12, item: "Launch Event", status: "PASS", note: "cms.sql events" },
      { id: 13, item: "Analytics", status: "PENDING", note: "QA + analytics_events verify" },
      { id: 14, item: "CMS visibility", status: "PASS", note: "cms.sql" },
      { id: 15, item: "NEW Badge", status: "PASS", note: "released_at 7-day window" },
      { id: 16, item: "Review Card", status: "PENDING", note: "D+7 placeholder" },
      { id: 17, item: "Operation guide", status: "PASS", note: "operation-guide.md" },
      { id: 18, item: "QA PASS", status: "PENDING", note: "operator sign-off" },
      { id: 19, item: "Mobile / Console 0", status: "PENDING", note: "QA" },
    ],
    passCount: 0,
    pendingCount: 0,
  };
}

/** @param {ReturnType<typeof generateReleasePackage>} pkg */
export function tallyReleasePackage(pkg) {
  const counts = { PASS: 0, PARTIAL: 0, PENDING: 0 };
  for (const row of pkg.checklist) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  pkg.passCount = counts.PASS ?? 0;
  pkg.pendingCount = counts.PENDING ?? 0;
  return pkg;
}
