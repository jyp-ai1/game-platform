/**
 * Friend challenge sessions — invite → play → compare → rematch.
 */
import { recordFriendChallengeSent } from "@/lib/universal-mission-engine";
const CHALLENGES_KEY = "play29:challenges";
const ACTIVE_CHALLENGE_KEY = "play29:active-challenge";

export interface ChallengeSession {
  id: string;
  gameSlug: string;
  gameTitle: string;
  challengerId: string;
  challengerNickname: string;
  targetFriendId: string;
  targetNickname: string;
  challengerScore: number | null;
  targetScore: number | null;
  createdAt: string;
  status: "pending" | "active" | "complete";
}

type Listener = () => void;
const listeners = new Set<Listener>();
let challengeVersion = 0;

function notify(): void {
  challengeVersion += 1;
  for (const l of listeners) l();
}

function readAll(): ChallengeSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CHALLENGES_KEY) ?? "[]") as ChallengeSession[];
  } catch {
    return [];
  }
}

function writeAll(list: ChallengeSession[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHALLENGES_KEY, JSON.stringify(list));
  notify();
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function createChallenge(
  gameSlug: string,
  gameTitle: string,
  challengerId: string,
  challengerNickname: string,
  targetFriendId: string,
  targetNickname: string
): ChallengeSession {
  const session: ChallengeSession = {
    id: randomId(),
    gameSlug,
    gameTitle,
    challengerId,
    challengerNickname,
    targetFriendId,
    targetNickname,
    challengerScore: null,
    targetScore: null,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  const list = [session, ...readAll()].slice(0, 50);
  writeAll(list);
  recordFriendChallengeSent();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_CHALLENGE_KEY, session.id);
  }
  return session;
}

export function getChallenge(id: string): ChallengeSession | null {
  return readAll().find((c) => c.id === id) ?? null;
}

export function getActiveChallengeId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_CHALLENGE_KEY);
}

export function setActiveChallenge(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(ACTIVE_CHALLENGE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_CHALLENGE_KEY);
}

export function recordChallengeScore(
  challengeId: string,
  playerId: string,
  score: number
): ChallengeSession | null {
  const list = readAll();
  const idx = list.findIndex((c) => c.id === challengeId);
  if (idx === -1) return null;
  const c = { ...list[idx] };
  if (playerId === c.challengerId) c.challengerScore = score;
  else c.targetScore = score;
  c.status = "active";
  if (c.challengerScore !== null && c.targetScore !== null) c.status = "complete";
  list[idx] = c;
  writeAll(list);
  return c;
}

export function listChallenges(limit = 10): ChallengeSession[] {
  return readAll().slice(0, limit);
}

export function getChallengeUrl(challengeId: string, gameSlug: string): string {
  if (typeof window === "undefined") return `/games/${gameSlug}?challenge=${challengeId}`;
  return `${window.location.origin}/games/${gameSlug}?challenge=${challengeId}`;
}

export function getChallengeShareText(session: ChallengeSession): string {
  return `Re:Play Challenge · Beat ${session.challengerNickname} in ${session.gameTitle}!\n${getChallengeUrl(session.id, session.gameSlug)}`;
}

export function subscribeChallenges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getChallengesSnapshot(): ChallengeSession[] {
  return readAll();
}

export function getChallengesVersion(): number {
  return challengeVersion;
}
