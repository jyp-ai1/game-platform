/**
 * Retention Shop — coins, avatar, frame, season pass. Epic11.
 */
const SHOP_KEY = "play29:shop-owned";
const AVATAR_KEY = "play29:avatar";
const FRAME_KEY = "play29:frame";
const ATTENDANCE_KEY = "play29:attendance";

export interface ShopItem {
  id: string;
  name: string;
  type: "avatar" | "frame" | "boost";
  price: number;
  emoji: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "avatar-fox", name: "Fox Avatar", type: "avatar", price: 50, emoji: "🦊" },
  { id: "avatar-dragon", name: "Dragon Avatar", type: "avatar", price: 100, emoji: "🐉" },
  { id: "frame-gold", name: "Gold Frame", type: "frame", price: 75, emoji: "✨" },
  { id: "frame-neon", name: "Neon Frame", type: "frame", price: 120, emoji: "💫" },
  { id: "boost-xp", name: "XP Boost (1 day)", type: "boost", price: 30, emoji: "⚡" },
];

function readOwned(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(SHOP_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function getOwnedItems(): string[] {
  return readOwned();
}

import { getCoins, spendCoins } from "@/lib/coins";

export function purchaseItem(itemId: string): boolean {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item || readOwned().includes(itemId)) return false;
  if (getCoins() < item.price) return false;
  if (!spendCoins(item.price)) return false;
  const owned = [...readOwned(), itemId];
  window.localStorage.setItem(SHOP_KEY, JSON.stringify(owned));
  if (item.type === "avatar") window.localStorage.setItem(AVATAR_KEY, itemId);
  if (item.type === "frame") window.localStorage.setItem(FRAME_KEY, itemId);
  return true;
}

export function getEquippedAvatar(): string {
  if (typeof window === "undefined") return "🎮";
  const id = window.localStorage.getItem(AVATAR_KEY);
  return SHOP_ITEMS.find((i) => i.id === id)?.emoji ?? "🎮";
}

export function getEquippedFrame(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(FRAME_KEY);
  return SHOP_ITEMS.find((i) => i.id === id)?.emoji ?? null;
}

export function recordAttendance(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().slice(0, 10);
  const raw = window.localStorage.getItem(ATTENDANCE_KEY);
  let data: { last: string; streak: number } = { last: "", streak: 0 };
  try {
    if (raw) data = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  if (data.last === today) return data.streak;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  data.streak = data.last === yStr ? data.streak + 1 : 1;
  data.last = today;
  window.localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data));
  return data.streak;
}

export function getAttendanceStreak(): number {
  if (typeof window === "undefined") return 0;
  try {
    return (JSON.parse(window.localStorage.getItem(ATTENDANCE_KEY) ?? "{}") as { streak: number }).streak ?? 0;
  } catch {
    return 0;
  }
}

export function getSeasonPassProgress(): { level: number; percent: number } {
  const streak = getAttendanceStreak();
  const level = Math.min(50, Math.floor(streak / 2) + 1);
  return { level, percent: (streak % 2) * 50 };
}
