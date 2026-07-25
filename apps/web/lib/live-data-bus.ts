/** Live data event bus — score/ranking/profile updates without page refresh. */

export interface ProfileUpdatePayload {
  gameSlug: string;
  score: number;
  isNewBest: boolean;
}

type ScoreListener = (payload: { gameSlug: string; score: number }) => void;
type ProfileListener = (payload: ProfileUpdatePayload) => void;
type GlobalListener = () => void;

const scoreListeners = new Set<ScoreListener>();
const profileListeners = new Set<ProfileListener>();
const globalListeners = new Set<GlobalListener>();

function notifyGlobal(): void {
  for (const listener of globalListeners) listener();
}

export function emitLiveScoreUpdate(gameSlug: string, score: number): void {
  for (const listener of scoreListeners) listener({ gameSlug, score });
  notifyGlobal();
}

export function emitLiveProfileUpdate(payload: ProfileUpdatePayload): void {
  for (const listener of profileListeners) listener(payload);
  notifyGlobal();
}

export function subscribeLiveScore(listener: ScoreListener): () => void {
  scoreListeners.add(listener);
  return () => scoreListeners.delete(listener);
}

export function subscribeLiveProfile(listener: ProfileListener): () => void {
  profileListeners.add(listener);
  return () => profileListeners.delete(listener);
}

export function subscribeLiveData(listener: GlobalListener): () => void {
  globalListeners.add(listener);
  return () => globalListeners.delete(listener);
}
