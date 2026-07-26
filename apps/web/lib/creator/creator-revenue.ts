/** Creator Revenue — diversified monetization (광고 의존 ↓). */

export type RevenueModel =
  | "sale" | "featured" | "template" | "asset" | "donation" | "subscription"
  | "tournament" | "brand" | "qa-pro" | "analytics-pro" | "cloud-pro";

export interface RevenueOption {
  id: RevenueModel;
  label: string;
  description: string;
  enabled: boolean;
  estimatedMonthly: number;
}

export interface RevenueSummary {
  totalEarned: number;
  pendingPayout: number;
  sharePercent: number;
  options: RevenueOption[];
}

export function getCreatorRevenue(): RevenueSummary {
  return {
    totalEarned: 0,
    pendingPayout: 0,
    sharePercent: 70,
    options: [
      { id: "sale", label: "Game Sales", description: "게임 판매 수수료 (70% creator share)", enabled: false, estimatedMonthly: 0 },
      { id: "featured", label: "Premium Featured", description: "Discover 프리미엄 노출", enabled: false, estimatedMonthly: 0 },
      { id: "template", label: "Template Sales", description: "템플릿 판매", enabled: false, estimatedMonthly: 0 },
      { id: "asset", label: "Asset Sales", description: "에셋 · UI · 사운드 판매", enabled: false, estimatedMonthly: 0 },
      { id: "donation", label: "Donation", description: "플레이어 후원", enabled: true, estimatedMonthly: 0 },
      { id: "subscription", label: "Creator Subscription", description: "월 구독", enabled: false, estimatedMonthly: 0 },
      { id: "tournament", label: "Tournament Entry", description: "토너먼트 참가비", enabled: false, estimatedMonthly: 0 },
      { id: "brand", label: "Brand Events", description: "브랜드 이벤트 스폰서", enabled: false, estimatedMonthly: 0 },
      { id: "qa-pro", label: "AI QA Pro", description: "고급 AI QA + 자동 Fix", enabled: false, estimatedMonthly: 0 },
      { id: "analytics-pro", label: "Analytics Pro", description: "고급 개발자 분석", enabled: false, estimatedMonthly: 0 },
      { id: "cloud-pro", label: "Cloud Save Pro", description: "클라우드 세이브 Pro", enabled: false, estimatedMonthly: 0 },
    ],
  };
}

/** Marketplace — Games, Templates, Assets, Music, Sprites, UI, AI, NPC, Effects, etc. */
export type MarketplaceItemType =
  | "game" | "template" | "asset" | "logic" | "music" | "sprite" | "ui"
  | "ai-prompt" | "npc" | "boss" | "quest" | "achievement-pack" | "mission-pack"
  | "skin" | "sound" | "particle" | "map" | "stage" | "localization"
  | "ui-theme" | "physics" | "effect" | "background" | "icon" | "shader";

export interface MarketplaceItem {
  id: string;
  type: MarketplaceItemType;
  title: string;
  author: string;
  price: number;
  currency: "coin" | "free";
  downloads: number;
  rating: number;
  tags: string[];
}

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  { id: "m1", type: "template", title: "Snake Template Pro", author: "SnakeMaster", price: 0, currency: "free", downloads: 890, rating: 4.8, tags: ["template", "arcade"] },
  { id: "m2", type: "ui", title: "Pixel UI Pack", author: "PixelLab", price: 500, currency: "coin", downloads: 234, rating: 4.6, tags: ["ui", "pixel"] },
  { id: "m3", type: "music", title: "Retro SFX Bundle", author: "AudioForge", price: 300, currency: "coin", downloads: 156, rating: 4.9, tags: ["sfx", "retro"] },
  { id: "m4", type: "background", title: "Space Parallax BG", author: "PixelLab", price: 200, currency: "coin", downloads: 412, rating: 4.5, tags: ["background", "space"] },
  { id: "m5", type: "icon", title: "Game Icon Set (50)", author: "Re:Play", price: 0, currency: "free", downloads: 2100, rating: 4.7, tags: ["icon", "free"] },
  { id: "m6", type: "game", title: "Memory Deluxe", author: "홍길동", price: 0, currency: "free", downloads: 1200, rating: 4.8, tags: ["puzzle", "featured"] },
  { id: "m7", type: "sprite", title: "Character Sprite Pack", author: "PixelLab", price: 400, currency: "coin", downloads: 320, rating: 4.7, tags: ["sprite", "character"] },
  { id: "m8", type: "ai-prompt", title: "NPC Dialogue Pack", author: "AIForge", price: 150, currency: "coin", downloads: 89, rating: 4.5, tags: ["ai", "npc"] },
  { id: "m9", type: "npc", title: "Shopkeeper NPC", author: "AIForge", price: 250, currency: "coin", downloads: 67, rating: 4.6, tags: ["npc", "rpg"] },
  { id: "m10", type: "effect", title: "Particle FX Pack", author: "VFXLab", price: 350, currency: "coin", downloads: 178, rating: 4.8, tags: ["vfx", "particles"] },
  { id: "m11", type: "shader", title: "Retro CRT Shader", author: "ShaderDev", price: 100, currency: "coin", downloads: 245, rating: 4.4, tags: ["shader", "retro"] },
  { id: "m12", type: "boss", title: "Dragon Boss Pack", author: "BossLab", price: 400, currency: "coin", downloads: 112, rating: 4.7, tags: ["boss", "rpg"] },
  { id: "m13", type: "quest", title: "Daily Quest Pack", author: "QuestForge", price: 0, currency: "free", downloads: 340, rating: 4.6, tags: ["quest", "daily"] },
  { id: "m14", type: "achievement-pack", title: "Arcade Achievements", author: "Re:Play", price: 0, currency: "free", downloads: 520, rating: 4.8, tags: ["achievement"] },
  { id: "m15", type: "skin", title: "Neon Snake Skins", author: "SkinDev", price: 150, currency: "coin", downloads: 890, rating: 4.9, tags: ["skin", "snake"] },
  { id: "m16", type: "map", title: "Dungeon Map Pack", author: "MapLab", price: 250, currency: "coin", downloads: 167, rating: 4.5, tags: ["map", "rpg"] },
  { id: "m17", type: "logic", title: "Inventory System", author: "Re:Play", price: 0, currency: "free", downloads: 890, rating: 4.9, tags: ["logic", "inventory"] },
];

export function getMarketplaceByType(type: MarketplaceItemType | "all"): MarketplaceItem[] {
  if (type === "all") return MARKETPLACE_ITEMS;
  return MARKETPLACE_ITEMS.filter((i) => i.type === type);
}
