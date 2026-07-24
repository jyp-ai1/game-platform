/** @typedef {import('./types.mjs').GameManifest} GameManifest */

/**
 * @param {GameManifest} m
 */
export function generateMissions(m) {
  const hints = m.missionHints ?? {};
  const dailyTemplate = hints.dailyTemplate ?? "{category} 게임 {n}판";
  const weeklyTemplate = hints.weeklyTemplate ?? "이번 주 {title} {n}판";
  const fill = (template) =>
    template.replace("{category}", m.category).replace("{title}", m.title).replace("{n}", "3");

  return {
    slug: m.slug,
    category: m.category,
    daily: {
      type: "category_play",
      title: fill(dailyTemplate),
      target: 3,
      xp: 50,
    },
    weekly: {
      type: "slug_complete",
      title: fill(weeklyTemplate),
      target: 5,
      xp: 150,
    },
    launchBonus: {
      title: `${m.title} 첫 플레이 XP 2×`,
      durationDays: 7,
      note: "CMS event reward_text — platform hook TBD",
    },
  };
}
