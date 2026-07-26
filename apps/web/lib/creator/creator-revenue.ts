/** Creator Revenue — monetization options UI data. */

export type RevenueModel = "premium" | "featured" | "sponsor" | "donation" | "ads";

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
      { id: "premium", label: "Premium", description: "Paid unlock for extra content", enabled: false, estimatedMonthly: 0 },
      { id: "featured", label: "Featured", description: "Boost visibility in Discover", enabled: false, estimatedMonthly: 0 },
      { id: "sponsor", label: "Sponsor", description: "Brand sponsorship slots", enabled: false, estimatedMonthly: 0 },
      { id: "donation", label: "Donation", description: "Player tips via Passport", enabled: true, estimatedMonthly: 0 },
      { id: "ads", label: "Ads Revenue", description: "Share from in-game ads (coming soon)", enabled: false, estimatedMonthly: 0 },
    ],
  };
}

/** Marketplace items — templates, assets, sounds (long-term). */
export type MarketplaceItemType = "game" | "template" | "asset" | "sound" | "background" | "icon";

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
  { id: "m2", type: "asset", title: "Pixel UI Pack", author: "PixelLab", price: 500, currency: "coin", downloads: 234, rating: 4.6, tags: ["ui", "pixel"] },
  { id: "m3", type: "sound", title: "Retro SFX Bundle", author: "AudioForge", price: 300, currency: "coin", downloads: 156, rating: 4.9, tags: ["sfx", "retro"] },
  { id: "m4", type: "background", title: "Space Parallax BG", author: "PixelLab", price: 200, currency: "coin", downloads: 412, rating: 4.5, tags: ["background", "space"] },
  { id: "m5", type: "icon", title: "Game Icon Set (50)", author: "Re:Play", price: 0, currency: "free", downloads: 2100, rating: 4.7, tags: ["icon", "free"] },
  { id: "m6", type: "game", title: "Memory Deluxe", author: "홍길동", price: 0, currency: "free", downloads: 1200, rating: 4.8, tags: ["puzzle", "featured"] },
];

export function getMarketplaceByType(type: MarketplaceItemType | "all"): MarketplaceItem[] {
  if (type === "all") return MARKETPLACE_ITEMS;
  return MARKETPLACE_ITEMS.filter((i) => i.type === type);
}
