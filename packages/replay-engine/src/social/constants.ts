/** Party quick reactions — 1-tap game chat. */
import type { PartyReactionId } from "@game-platform/shared";

export const PARTY_REACTIONS: { id: PartyReactionId; label: string; emoji: string }[] = [
  { id: "fire", label: "🔥", emoji: "🔥" },
  { id: "lol", label: "ㅋㅋ", emoji: "😂" },
  { id: "gg", label: "GG", emoji: "👏" },
  { id: "rematch", label: "리벤지", emoji: "⚔️" },
  { id: "go", label: "가자", emoji: "🚀" },
  { id: "ready", label: "준비", emoji: "✅" },
  { id: "ping", label: "Ping", emoji: "📍" },
];

export const REACTION_TEXT: Record<PartyReactionId, string> = {
  fire: "🔥",
  lol: "ㅋㅋㅋㅋ",
  gg: "GG",
  rematch: "리벤지!",
  go: "가자!",
  ready: "준비!",
  ping: "📍 여기!",
};

/** Next games for Continue Together flow. */
export const CONTINUE_GAMES = [
  { slug: "snake", label: "Snake", href: "/flagship/snake-io" },
  { slug: "mini-golf", label: "Mini Golf", href: "/games/mini-golf" },
  { slug: "uno", label: "UNO", href: "/games/uno" },
  { slug: "bomber", label: "Bomber", href: "/games/bomber" },
] as const;

export function nextContinueGame(currentSlug: string): (typeof CONTINUE_GAMES)[number] {
  const idx = CONTINUE_GAMES.findIndex((g) => g.slug === currentSlug);
  return CONTINUE_GAMES[(idx + 1) % CONTINUE_GAMES.length]!;
}
