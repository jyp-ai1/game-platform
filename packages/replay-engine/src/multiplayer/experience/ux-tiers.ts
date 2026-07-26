/** Multiplayer UX tiers — fun scales with player count */
import type { UxTier } from "@game-platform/shared";

export const UX_TIERS: UxTier[] = [
  {
    minPlayers: 2,
    label: "Duel",
    features: ["작은 맵", "빠른 매칭", "1:1 긴장감"],
    minimap: false,
    events: false,
    spectator: false,
    aiDirector: false,
  },
  {
    minPlayers: 4,
    label: "Skirmish",
    features: ["맵 확대", "아이템 추가", "첫 이벤트"],
    minimap: false,
    events: true,
    spectator: false,
    aiDirector: false,
  },
  {
    minPlayers: 8,
    label: "Battle",
    features: ["미니맵", "Boss Food", "협동 이벤트"],
    minimap: true,
    events: true,
    spectator: true,
    aiDirector: false,
  },
  {
    minPlayers: 16,
    label: "War",
    features: ["월드 분할", "바이옴", "랜덤 이벤트↑"],
    minimap: true,
    events: true,
    spectator: true,
    aiDirector: true,
  },
  {
    minPlayers: 20,
    label: "Festival",
    features: ["월드 이벤트", "시즌", "실시간 랭킹", "관전", "AI Director"],
    minimap: true,
    events: true,
    spectator: true,
    aiDirector: true,
  },
];

export function getUxTier(playerCount: number): UxTier {
  let tier = UX_TIERS[0]!;
  for (const t of UX_TIERS) {
    if (playerCount >= t.minPlayers) tier = t;
  }
  return tier;
}

export const UxEngine = { tiers: UX_TIERS, forPlayers: getUxTier };
