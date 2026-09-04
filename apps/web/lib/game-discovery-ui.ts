import type { Game } from "@game-platform/shared";

/** One-line summary for catalog cards and detail meta. */
export function gameSummaryDescription(game: Game, slug: string, maxLen = 100): string {
  if (slug === "snake") {
    return "다른 플레이어와 경쟁하며 가장 긴 뱀이 되어보세요. 보석을 먹고 성장하며 살아남으세요.";
  }
  if (slug === "agar") {
    return "세포를 키우고 분열·방출로 싸우세요. 작은 세포를 먹고, 큰 세포는 피하세요.";
  }
  if (slug === "bomber") {
    return "폭탄을 설치하고 장애물을 뚫어 최후의 1인이 되세요. 라운드마다 난이도가 올라갑니다.";
  }
  if (slug === "re-front") {
    return "영토를 확장하고 경제를 키우며 이웃 국가와 전쟁하세요. 실시간 전략 프로토타입.";
  }
  const raw = game.description?.trim();
  if (!raw) return "방향키와 버튼으로 플레이하세요.";
  const first = raw.split(/[.!?]\s/)[0] ?? raw;
  const text = first.length > maxLen ? `${first.slice(0, maxLen - 1)}…` : first;
  return text;
}

/** Client-safe creator label (no server registry / fs). */
export function gameCreatorLabel(slug: string): string {
  if (slug === "snake" || slug === "agar" || slug === "bomber" || slug === "re-front") {
    return "Replay Studio";
  }
  if (slug.startsWith("creator-")) return "Creator";
  return "Community";
}

export function isDiscoveryMultiplayerSlug(
  slug: string,
  game?: Pick<Game, "tags">
): boolean {
  return (
    slug === "snake" ||
    slug === "agar" ||
    slug === "bomber" ||
    slug === "re-front" ||
    (game?.tags?.includes("multiplayer") ?? false)
  );
}
