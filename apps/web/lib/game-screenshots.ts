// Screenshot gallery paths are fully deterministic from the game slug (no
// live gameplay-capture pipeline — see scripts/generate-thumbnails.mjs,
// which emits 3 procedural variant images per game alongside the regular
// thumbnail). Derived data, so no DB column is needed.
const GALLERY_VARIANTS = 3;

export function getScreenshotUrls(slug: string): string[] {
  return Array.from(
    { length: GALLERY_VARIANTS },
    (_, index) => `/images/games/${slug}-gallery-${index + 1}.png`
  );
}
