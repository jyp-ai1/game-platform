/** Snake session memory — Party Journey data (Snake-only, no Engine change) */

export interface SnakeDayMemory {
  date: string;
  primaryFriend: string | null;
  gamesPlayed: number;
  wins: number;
  losses: number;
  killsAgainst: Record<string, number>;
  deathsFrom: Record<string, number>;
  longestSurvivalMs: number;
}

const KEY = "play29:snake-day-memory";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadSnakeDayMemory(): SnakeDayMemory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as SnakeDayMemory;
    return m.date === today() ? m : null;
  } catch {
    return null;
  }
}

function emptyMemory(): SnakeDayMemory {
  return {
    date: today(),
    primaryFriend: null,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    killsAgainst: {},
    deathsFrom: {},
    longestSurvivalMs: 0,
  };
}

export function recordSnakeSessionEnd(opts: {
  won: boolean;
  survivalMs: number;
  killsAgainst: Record<string, number>;
  deathsFrom: Record<string, number>;
  coPlayers: string[];
}): SnakeDayMemory {
  const prev = loadSnakeDayMemory() ?? emptyMemory();
  const friend = opts.coPlayers.find((n) => n !== "Player") ?? opts.coPlayers[0] ?? null;

  for (const [name, n] of Object.entries(opts.killsAgainst)) {
    prev.killsAgainst[name] = (prev.killsAgainst[name] ?? 0) + n;
  }
  for (const [name, n] of Object.entries(opts.deathsFrom)) {
    prev.deathsFrom[name] = (prev.deathsFrom[name] ?? 0) + n;
  }

  prev.gamesPlayed += 1;
  if (opts.won) prev.wins += 1;
  else prev.losses += 1;
  prev.longestSurvivalMs = Math.max(prev.longestSurvivalMs, opts.survivalMs);
  if (friend) prev.primaryFriend = friend;

  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(prev));
  }
  return prev;
}

export interface MemoryLine {
  emoji: string;
  text: string;
}

export function buildPartyMemoryLines(m: SnakeDayMemory): MemoryLine[] {
  const lines: MemoryLine[] = [];
  const friend = m.primaryFriend ?? "친구";

  lines.push({
    emoji: "👥",
    text: `오늘 ${friend}와 ${m.gamesPlayed}판 플레이`,
  });

  if (m.wins + m.losses > 0) {
    lines.push({ emoji: "🏆", text: `${m.wins}승 ${m.losses}패` });
  }

  if (m.longestSurvivalMs >= 60_000) {
    const sec = Math.floor(m.longestSurvivalMs / 1000);
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    lines.push({ emoji: "🔥", text: `가장 긴 생존 ${min}분 ${s}초` });
  }

  const topVictim = Object.entries(m.killsAgainst).sort((a, b) => b[1] - a[1])[0];
  if (topVictim && topVictim[1] > 0) {
    lines.push({ emoji: "💀", text: `${topVictim[0]}을(를) ${topVictim[1]}번 처치` });
  }

  const topKiller = Object.entries(m.deathsFrom).sort((a, b) => b[1] - a[1])[0];
  if (topKiller && topKiller[1] > 0) {
    lines.push({ emoji: "😂", text: `${topKiller[0]}에게 ${topKiller[1]}번 당함` });
    if (topKiller[1] >= 3) {
      lines.push({ emoji: "⚔️", text: `다음에는 ${topKiller[0]} 이겨보세요` });
    }
  }

  return lines;
}
