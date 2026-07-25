/** Live data event bus — score/ranking updates without page refresh. */

type ScoreListener = (payload: { gameSlug: string; score: number }) => void;
type GlobalListener = () => void;

const scoreListeners = new Set<ScoreListener>();
const globalListeners = new Set<GlobalListener>();

export function emitLiveScoreUpdate(gameSlug: string, score: number): void {
  for (const listener of scoreListeners) listener({ gameSlug, score });
  for (const listener of globalListeners) listener();
}

export function subscribeLiveScore(listener: ScoreListener): () => void {
  scoreListeners.add(listener);
  return () => scoreListeners.delete(listener);
}

export function subscribeLiveData(listener: GlobalListener): () => void {
  globalListeners.add(listener);
  return () => globalListeners.delete(listener);
}
