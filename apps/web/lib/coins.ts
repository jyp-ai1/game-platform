/** Coin economy — Sprint18 Retention Engine. */
const COINS_KEY = "play29:coins";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

export function getCoins(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.localStorage.getItem(COINS_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function getServerCoinsSnapshot(): number {
  return 0;
}

export function addCoins(amount: number): number {
  if (typeof window === "undefined" || amount <= 0) return getCoins();
  const next = getCoins() + amount;
  window.localStorage.setItem(COINS_KEY, String(next));
  notify();
  return next;
}

export function spendCoins(amount: number): boolean {
  if (typeof window === "undefined" || amount <= 0) return false;
  const current = getCoins();
  if (current < amount) return false;
  window.localStorage.setItem(COINS_KEY, String(current - amount));
  notify();
  return true;
}

export function subscribeCoins(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function coinsForScore(score: number, isNewBest: boolean): number {
  const base = Math.max(1, Math.floor(score / 200));
  return base + (isNewBest ? 5 : 0);
}
