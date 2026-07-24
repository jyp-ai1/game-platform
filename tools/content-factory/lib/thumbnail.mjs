/** @typedef {import('./types.mjs').GameManifest} GameManifest */

const WIDTH = 1024;
const HEIGHT = 576;
const BG = "#0F172A";
const FG = "#F8FAFC";

const CATEGORY_SHAPES = {
  arcade: (accent) =>
    `<rect x="362" y="80" width="300" height="200" rx="24" fill="${accent}" opacity="0.85"/>
     <circle cx="512" cy="170" r="40" fill="${FG}" opacity="0.9"/>`,
  puzzle: (accent) =>
    `<rect x="380" y="70" width="120" height="120" rx="12" fill="${accent}"/>
     <rect x="520" y="70" width="120" height="120" rx="12" fill="${accent}" opacity="0.7"/>
     <rect x="450" y="200" width="120" height="120" rx="12" fill="${accent}" opacity="0.5"/>`,
  board: (accent) =>
    `<rect x="362" y="70" width="300" height="300" rx="8" fill="${accent}" opacity="0.25"/>
     <circle cx="437" cy="145" r="28" fill="${FG}"/>
     <circle cx="587" cy="295" r="28" fill="${accent}"/>`,
  casual: (accent) =>
    `<circle cx="512" cy="170" r="90" fill="${accent}" opacity="0.9"/>
     <text x="512" y="190" font-size="72" fill="#fff" text-anchor="middle" font-family="Arial">★</text>`,
  sports: (accent) =>
    `<circle cx="512" cy="200" r="70" fill="${FG}" opacity="0.95"/>
     <path d="M442,200 L582,200 M512,130 L512,270" stroke="${accent}" stroke-width="8"/>`,
};

/**
 * @param {GameManifest} m
 */
function buildSvg(m) {
  const accent = m.thumbnailAccent || "#5B5BD6";
  const shapeFn = CATEGORY_SHAPES[m.category] ?? CATEGORY_SHAPES.casual;
  const initial = m.title.charAt(0).toUpperCase();
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
      <rect x="0" y="0" width="${WIDTH}" height="8" fill="${accent}"/>
      ${shapeFn(accent)}
      <text x="512" y="420" font-size="56" font-weight="700" fill="${FG}" text-anchor="middle" font-family="Arial, sans-serif">${m.title}</text>
      <text x="512" y="360" font-size="120" font-weight="700" fill="${accent}" opacity="0.35" text-anchor="middle" font-family="Arial, sans-serif">${initial}</text>
      <text x="512" y="466" font-size="24" font-weight="700" fill="${accent}" text-anchor="middle" font-family="Arial, sans-serif" letter-spacing="6">RE:PLAY</text>
    </svg>`;
}

/**
 * @param {GameManifest} m
 * @param {string} outPath
 */
export async function generateThumbnail(m, outPath) {
  const sharp = (await import("sharp")).default;
  const svg = buildSvg(m);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  return outPath;
}

/**
 * Snippet for scripts/generate-thumbnails.mjs (manual merge until batch hook lands).
 * @param {GameManifest} m
 */
export function thumbnailRegistrySnippet(m) {
  const fnName = `icon${m.slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("")}`;
  return `{ slug: "${m.slug}", title: "${m.title}", accent: "${m.thumbnailAccent}", icon: iconGeneric /* TODO: ${fnName} */ },`;
}
