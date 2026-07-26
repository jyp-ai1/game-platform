/** Party Journey — timeline, achievements, story. */
import type { Party, PartyJourneyEntry } from "@game-platform/shared";

const JOURNEY_KEY = "play29:party-journey:";

function loadTimeline(partyId: string): PartyJourneyEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(JOURNEY_KEY + partyId);
    return raw ? (JSON.parse(raw) as PartyJourneyEntry[]) : [];
  } catch {
    return [];
  }
}

function saveTimeline(partyId: string, entries: PartyJourneyEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JOURNEY_KEY + partyId, JSON.stringify(entries.slice(-50)));
}

export function appendPartyJourney(
  partyId: string,
  entry: Omit<PartyJourneyEntry, "id" | "at"> & { at?: string }
): PartyJourneyEntry[] {
  const timeline = loadTimeline(partyId);
  const item: PartyJourneyEntry = {
    id: `${Date.now()}`,
    at: entry.at ?? new Date().toISOString(),
    kind: entry.kind,
    title: entry.title,
    gameSlug: entry.gameSlug,
  };
  timeline.push(item);
  saveTimeline(partyId, timeline);
  return timeline;
}

export function getPartyTimeline(partyId: string): PartyJourneyEntry[] {
  return loadTimeline(partyId).sort((a, b) => b.at.localeCompare(a.at));
}

export function getPartyAchievements(party: Party): string[] {
  const badges: string[] = [];
  if (party.progress.level >= 5) badges.push("Party Veteran");
  if (party.progress.streak >= 3) badges.push(`${party.progress.streak} Day Streak`);
  if (party.history.length >= 10) badges.push("Marathon Crew");
  if (party.members.length >= 4) badges.push("Squad Goals");
  return badges;
}

export function buildPartyStory(party: Party): string {
  const games = party.history.length;
  const fav = party.progress.favoriteGame?.replace(/-/g, " ") ?? "Snake";
  return `${party.members.length}명이 ${games}판 함께 · 최애 ${fav} · Lv${party.progress.level}`;
}

export const PartyJourneyEngine = {
  append: appendPartyJourney,
  timeline: getPartyTimeline,
  achievements: getPartyAchievements,
  story: buildPartyStory,
};
