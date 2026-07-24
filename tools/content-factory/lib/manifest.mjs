/** @typedef {import('./types.mjs').GameManifest} GameManifest */

/**
 * @param {string} slug
 */
export function slugToPascal(slug) {
  const base = slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `${base}Game`;
}

/**
 * @param {string} slug
 */
export function packageNameFor(slug) {
  return `@game-platform/game-${slug}`;
}

/**
 * @param {unknown} raw
 * @returns {GameManifest}
 */
export function normalizeManifest(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Manifest must be a JSON object");
  }
  const m = /** @type {Record<string, unknown>} */ (raw);
  const slug = String(m.slug ?? "");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Invalid slug: ${slug}`);
  }

  const categories = ["arcade", "puzzle", "board", "casual", "sports"];
  const category = String(m.category ?? "");
  if (!categories.includes(category)) {
    throw new Error(`Invalid category: ${category}`);
  }

  const difficulties = ["EASY", "MEDIUM", "HARD"];
  const difficulty = String(m.difficulty ?? "EASY");
  if (!difficulties.includes(difficulty)) {
    throw new Error(`Invalid difficulty: ${difficulty}`);
  }

  const featuresRaw = /** @type {Record<string, unknown>} */ (m.features ?? {});
  const features = {
    save: Boolean(featuresRaw.save),
    ranking: Boolean(featuresRaw.ranking),
    multiplayer: Boolean(featuresRaw.multiplayer),
  };

  const tags = Array.isArray(m.tags) ? m.tags.map(String) : [category];

  return {
    slug,
    title: String(m.title ?? slug),
    category,
    description: String(m.description ?? ""),
    howToPlay: String(m.howToPlay ?? ""),
    difficulty,
    sortOrder: Number(m.sortOrder ?? 99),
    tags,
    playTime: String(m.playTime ?? "2~5분"),
    componentExport: String(m.componentExport ?? slugToPascal(slug)),
    packageName: String(m.packageName ?? packageNameFor(slug)),
    features,
    releasedAt: String(m.releasedAt ?? new Date().toISOString().slice(0, 10)),
    thumbnailAccent: String(m.thumbnailAccent ?? "#5B5BD6"),
    missionHints: {
      dailyTemplate: String(
        /** @type {Record<string, string>} */ (m.missionHints ?? {}).dailyTemplate ??
          "{category} 게임 {n}판"
      ),
      weeklyTemplate: String(
        /** @type {Record<string, string>} */ (m.missionHints ?? {}).weeklyTemplate ??
          "이번 주 {title} {n}판"
      ),
    },
  };
}

/**
 * @param {string} value
 */
export function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * @param {string[]} items
 */
export function sqlTextArray(items) {
  return `array[${items.map((t) => sqlLiteral(t)).join(", ")}]`;
}
