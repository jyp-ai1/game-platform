/** Situation-based recommendation — recommend situations, not just games. */
import { getDailyMission, isDailyChallengeComplete } from "@game-platform/game-sdk";
import { fetchPresenceEntries } from "@game-platform/multiplayer-sdk";
import type { FriendProfile, SituationRecommendation } from "@game-platform/shared";

import { getGameProfile } from "../multiplayer/balance/registry";
import { ExperienceEngine } from "../multiplayer/experience";
import { getFriends, recommendFriends } from "./friends";
import { getMyParty } from "./party";

const RECENT_GAMES_KEY = "play29:recent-games";

function getRecentGameSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_GAMES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function recordRecentGame(gameSlug: string): void {
  if (typeof window === "undefined") return;
  const next = [gameSlug, ...getRecentGameSlugs().filter((g) => g !== gameSlug)].slice(0, 10);
  window.localStorage.setItem(RECENT_GAMES_KEY, JSON.stringify(next));
}

function genreOf(slug: string): string {
  if (["snake", "bomber"].includes(slug)) return "action";
  if (["mini-golf", "drawing"].includes(slug)) return "casual";
  if (["uno"].includes(slug)) return "card";
  return "arcade";
}

function suggestGenre(recent: string[]): string | null {
  if (recent.length < 3) return null;
  const genres = recent.slice(0, 5).map(genreOf);
  const allSame = genres.every((g) => g === genres[0]);
  if (!allSame) return null;
  const current = genres[0]!;
  const alternatives: Record<string, string> = {
    action: "casual",
    casual: "action",
    card: "action",
    arcade: "action",
  };
  return alternatives[current] ?? null;
}

function gameForGenre(genre: string): string {
  const map: Record<string, string> = {
    action: "snake",
    casual: "mini-golf",
    card: "uno",
    arcade: "snake",
  };
  return map[genre] ?? "snake";
}

interface SituationContext {
  presence?: Awaited<ReturnType<typeof fetchPresenceEntries>>;
  friends?: FriendProfile[];
  recentGames?: string[];
}

/** Build situation recommendations from live context. */
export function getSituations(ctx: SituationContext = {}): SituationRecommendation[] {
  const recs: SituationRecommendation[] = [];
  const presence = ctx.presence ?? [];
  const friends = ctx.friends ?? getFriends();
  const recent = ctx.recentGames ?? getRecentGameSlugs();

  for (const p of presence.filter((e) => e.status === "playing").slice(0, 3)) {
    recs.push({
      id: `join-${p.deviceId}`,
      kind: "join_friend",
      title: `${p.nickname}가 ${(p.gameSlug ?? "게임").replace(/-/g, " ")} 중`,
      subtitle: "지금 참가하면 바로 함께 플레이",
      href: p.roomCode ? `/p/${p.roomCode}` : `/flagship/snake-io`,
      cta: "지금 참가",
      priority: 90,
      gameSlug: p.gameSlug,
    });
  }

  for (const t of ExperienceEngine.tournament.upcoming().slice(0, 2)) {
    const mins = t.startsAt ? Math.max(0, Math.round((new Date(t.startsAt).getTime() - Date.now()) / 60_000)) : 0;
    recs.push({
      id: `tournament-${t.id}`,
      kind: "tournament_soon",
      title: mins > 0 ? `토너먼트 ${mins}분 후 시작` : "토너먼트 진행 중",
      subtitle: `${t.maxPlayers}P · Snake`,
      href: "/flagship/snake-io",
      cta: "참가",
      priority: mins <= 2 ? 85 : 70,
      gameSlug: "snake",
    });
  }

  const mission = getDailyMission();
  if (!isDailyChallengeComplete(mission)) {
    const pendingId = mission.missionIds.find((id) => !mission.completed.includes(id));
    const prog = pendingId ? mission.progress[pendingId] : undefined;
    recs.push({
      id: "mission-daily",
      kind: "mission_ready",
      title: "오늘 미션 완료 가능",
      subtitle: prog ? `${prog.current}/${prog.target} 진행` : "데일리 미션",
      href: "/games",
      cta: "바로 플레이",
      priority: 75,
    });
  }

  const suggest = suggestGenre(recent);
  if (suggest) {
    const slug = gameForGenre(suggest);
    recs.push({
      id: `genre-${suggest}`,
      kind: "genre_suggest",
      title: `${suggest === "action" ? "Action" : "Casual"} 장르 추천`,
      subtitle: "최근 플레이 패턴 기반",
      href: slug === "snake" ? "/flagship/snake-io" : `/games/${slug}`,
      cta: "도전",
      priority: 55,
      gameSlug: slug,
    });
  }

  for (const f of recommendFriends(2)) {
    recs.push({
      id: `friend-${f.deviceId}`,
      kind: "party_invite",
      title: `${f.nickname}와 다시 플레이`,
      subtitle: `${f.coPlayCount}회 함께 · ${f.relation}`,
      href: "/flagship/snake-io",
      cta: "초대",
      priority: 60,
    });
  }

  const snakeProfile = getGameProfile("snake");
  if (snakeProfile?.playModes.party) {
    recs.push({
      id: "quick-match",
      kind: "quick_match",
      title: "빠른 매칭 (5초)",
      subtitle: "혼자 또는 랜덤 매칭",
      href: "/flagship/snake-io",
      cta: "매칭",
      priority: 50,
      gameSlug: "snake",
    });
  }

  return recs.sort((a, b) => b.priority - a.priority);
}

/** Async fetch live context and return situations. */
export async function fetchSituations(): Promise<SituationRecommendation[]> {
  const [presence, party] = await Promise.all([
    fetchPresenceEntries(),
    getMyParty(),
  ]);

  const recs = getSituations({ presence, friends: getFriends(), recentGames: getRecentGameSlugs() });

  if (party && party.members.length >= 2) {
    recs.unshift({
      id: `party-${party.id}`,
      kind: "party_invite",
      title: `파티 ${party.members.length}명 대기 중`,
      subtitle: party.currentGameSlug
        ? `${party.currentGameSlug.replace(/-/g, " ")} 준비`
        : "다음 게임 선택",
      href: `/p/${party.id}`,
      cta: "파티로",
      priority: 95,
      gameSlug: party.currentGameSlug,
    });
  }

  return recs.sort((a, b) => b.priority - a.priority);
}

/** Surface play mode CTAs for a game slug. */
export function playModeActions(gameSlug: string): { label: string; href: string }[] {
  const profile = getGameProfile(gameSlug);
  if (!profile) return [{ label: "플레이", href: `/games/${gameSlug}` }];
  const actions: { label: string; href: string }[] = [];
  const base = gameSlug === "snake" ? "/flagship/snake-io" : `/games/${gameSlug}`;
  if (profile.playModes.solo) actions.push({ label: "혼자 하기", href: base });
  if (profile.playModes.duo) actions.push({ label: "1:1", href: `${base}?mode=duo` });
  if (profile.playModes.party) actions.push({ label: "친구와 하기", href: `${base}?mode=party` });
  if (profile.playModes.tournament) actions.push({ label: "토너먼트", href: `${base}?mode=tournament` });
  if (profile.playModes.spectator) actions.push({ label: "관전", href: `${base}?mode=spectator` });
  return actions;
}

export const RecommendEngine = {
  situations: getSituations,
  fetch: fetchSituations,
  playModes: playModeActions,
  recordGame: recordRecentGame,
};
