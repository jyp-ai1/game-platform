/**
 * Display-only helpers for Re:Front human opponent identification.
 * Does not change bot AI, bot count, or economy.
 */

export function rfHumanNickname(nickname: string): string {
  return (nickname || "Player").trim().slice(0, 10);
}

export function rfHumanRoster(
  nations: Array<{ id: string; isBot: boolean; nickname: string; territoryPct: number; alive?: boolean }>
): Array<{ id: string; nickname: string; territoryPct: number }> {
  return nations
    .filter((n) => !n.isBot && n.alive !== false)
    .map((n) => ({
      id: n.id,
      nickname: n.nickname,
      territoryPct: n.territoryPct,
    }));
}
