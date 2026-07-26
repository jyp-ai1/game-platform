/** Creator types — Game, Asset, Template, AI, Event. */

export type CreatorType = "game" | "asset" | "template" | "ai" | "event";

export interface CreatorTypeDef {
  id: CreatorType;
  emoji: string;
  label: string;
  labelKo: string;
  description: string;
  studioHref: string;
}

export const CREATOR_TYPES: CreatorTypeDef[] = [
  {
    id: "game",
    emoji: "🎮",
    label: "Game Creator",
    labelKo: "게임 제작",
    description: "HTML5, React, Phaser 게임 제작 및 배포",
    studioHref: "/studio/create",
  },
  {
    id: "asset",
    emoji: "🎨",
    label: "Asset Creator",
    labelKo: "에셋 제작",
    description: "이미지, UI, 사운드, 스프라이트 판매",
    studioHref: "/studio/upload?type=asset",
  },
  {
    id: "template",
    emoji: "🧩",
    label: "Template Creator",
    labelKo: "템플릿 제작",
    description: "Snake, 2048, Puzzle 등 재사용 템플릿",
    studioHref: "/studio/templates",
  },
  {
    id: "ai",
    emoji: "🤖",
    label: "AI Creator",
    labelKo: "AI 크리에이터",
    description: "프롬프트, AI NPC, AI 이벤트",
    studioHref: "/studio/upload?type=ai",
  },
  {
    id: "event",
    emoji: "🏆",
    label: "Event Creator",
    labelKo: "이벤트 제작",
    description: "시즌, 대회, 챌린지 운영",
    studioHref: "/studio/upload?type=event",
  },
];

export type CreatorBadge = "top" | "rising" | "verified" | "official";

export interface CreatorBadgeDef {
  id: CreatorBadge;
  label: string;
  labelKo: string;
  minLevel: number;
  minFollowers: number;
}

export const CREATOR_BADGES: CreatorBadgeDef[] = [
  { id: "rising", label: "Rising Creator", labelKo: "Rising Creator", minLevel: 3, minFollowers: 10 },
  { id: "top", label: "Top Creator", labelKo: "Top Creator", minLevel: 10, minFollowers: 100 },
  { id: "verified", label: "Verified Creator", labelKo: "Verified Creator", minLevel: 8, minFollowers: 50 },
  { id: "official", label: "Official Creator", labelKo: "Official Creator", minLevel: 15, minFollowers: 500 },
];

export function getCreatorBadges(level: number, followers: number): CreatorBadge[] {
  return CREATOR_BADGES.filter((b) => level >= b.minLevel && followers >= b.minFollowers).map((b) => b.id);
}

/** Player → Creator funnel stages. */
export type CreatorFunnelStage = "guest" | "player" | "challenge" | "community" | "creator" | "top" | "studio";

export function getCreatorFunnelStage(
  hasPlayed: boolean,
  hasChallenged: boolean,
  hasPublished: boolean,
  creatorLevel: number
): CreatorFunnelStage {
  if (creatorLevel >= 10) return "top";
  if (hasPublished) return "creator";
  if (hasChallenged) return "community";
  if (hasPlayed) return "player";
  return "guest";
}
