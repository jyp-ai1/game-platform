/** @typedef {import('./types.mjs').GameManifest} GameManifest */

/**
 * @param {GameManifest} m
 */
export function generatePlayableGamesSnippet(m) {
  return `  "${m.slug}",`;
}

/**
 * @param {GameManifest} m
 */
export function generateGamePlayerSnippet(m) {
  const needsQuotes = m.slug.includes("-") || /^\d/.test(m.slug);
  const key = needsQuotes ? `"${m.slug}"` : m.slug;
  return `${key}: dynamic(
    () => import("${m.packageName}").then((mod) => mod.${m.componentExport}),
    { ssr: false, loading: Loading }
  ),`;
}

/**
 * @param {GameManifest} m
 */
export function generateWiringReadme(m) {
  return `# Wiring snippets for ${m.slug}

Append to \`apps/web/lib/playable-games.ts\` (PLAYABLE_SLUGS):

\`\`\`ts
${generatePlayableGamesSnippet(m)}
\`\`\`

Append to \`apps/web/components/game-player.tsx\` (gameComponents):

\`\`\`ts
${generateGamePlayerSnippet(m)}
\`\`\`

Package name: \`${m.packageName}\`
Export: \`${m.componentExport}\`
`;
}
