/**
 * Display-only helpers for human opponent identification.
 * Does not change rankings, mass, bots, or multiplayer sync.
 */

export const AGAR_BOT_NICK_MIN_RADIUS = 14;

export function agarCellNickname(nickname: string): string {
  return (nickname || "Player").trim().slice(0, 6);
}

export function shouldShowAgarCellNickname(isBot: boolean, radius: number): boolean {
  if (!isBot) return true;
  return radius > AGAR_BOT_NICK_MIN_RADIUS;
}

export function agarHumanLabelAboveCell(isBot: boolean, radius: number): boolean {
  return !isBot && radius <= AGAR_BOT_NICK_MIN_RADIUS;
}

export function agarHumanHudNicknames(
  players: Array<{ isBot: boolean; nickname: string }>
): string[] {
  return players.filter((p) => !p.isBot).map((p) => p.nickname);
}
