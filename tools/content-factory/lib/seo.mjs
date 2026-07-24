/** @typedef {import('./types.mjs').GameManifest} GameManifest */

/**
 * @param {GameManifest} m
 */
export function generateSeo(m) {
  const siteName = "Re:Play";
  return {
    slug: m.slug,
    path: `/games/${m.slug}`,
    title: `${m.title} — ${siteName}`,
    description: m.description,
    openGraph: {
      title: `${m.title} | ${siteName}`,
      description: m.description,
      type: "website",
      images: [`/images/games/${m.slug}.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.description,
    },
    keywords: [...m.tags, m.category, "무료 게임", "브라우저 게임"],
    structuredData: {
      "@type": "VideoGame",
      name: m.title,
      description: m.description,
      genre: m.category,
      playMode: "SinglePlayer",
    },
  };
}
