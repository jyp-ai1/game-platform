/** Party day social memory — cross-game SNS feed (web only, no Engine change) */

export interface PartyGameRecord {
  slug: string;
  label: string;
  wins: number;
  losses: number;
  minutes: number;
}

export interface PartyDaySocial {
  date: string;
  primaryFriend: string | null;
  games: PartyGameRecord[];
  totalMinutes: number;
}

const KEY = "play29:party-day-social";

const GAME_LABELS: Record<string, string> = {
  snake: "Snake",
  "mini-golf": "Golf",
  uno: "UNO",
  bomber: "Bomber",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function labelFor(slug: string): string {
  return GAME_LABELS[slug] ?? slug.replace(/-/g, " ");
}

export function loadPartyDaySocial(): PartyDaySocial | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as PartyDaySocial;
    return m.date === today() ? m : null;
  } catch {
    return null;
  }
}

export function recordPartyGameSession(opts: {
  gameSlug: string;
  won: boolean;
  durationMs: number;
  coPlayers: string[];
  myNickname?: string;
}): PartyDaySocial {
  const prev = loadPartyDaySocial() ?? {
    date: today(),
    primaryFriend: null,
    games: [],
    totalMinutes: 0,
  };

  const friend =
    opts.coPlayers.find((n) => n !== opts.myNickname && n !== "Player" && n !== "Guest") ??
    opts.coPlayers[0] ??
    null;

  let game = prev.games.find((g) => g.slug === opts.gameSlug);
  if (!game) {
    game = { slug: opts.gameSlug, label: labelFor(opts.gameSlug), wins: 0, losses: 0, minutes: 0 };
    prev.games.push(game);
  }
  if (opts.won) game.wins += 1;
  else game.losses += 1;
  game.minutes += Math.max(1, Math.round(opts.durationMs / 60_000));

  prev.totalMinutes += Math.max(1, Math.round(opts.durationMs / 60_000));
  if (friend) prev.primaryFriend = friend;

  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(prev));
  }
  return prev;
}

export interface JourneyLine {
  emoji: string;
  text: string;
}

export function buildPartyJourneyFeed(m: PartyDaySocial): JourneyLine[] {
  const lines: JourneyLine[] = [];
  const friend = m.primaryFriend ?? "친구";

  lines.push({ emoji: "👥", text: `${friend}와` });

  for (const g of m.games) {
    if (g.wins + g.losses === 0) continue;
    lines.push({
      emoji: g.slug === "snake" ? "🐍" : "🎮",
      text: `${g.label} ${g.wins}승${g.losses > 0 ? ` ${g.losses}패` : ""}`,
    });
  }

  if (m.totalMinutes >= 1) {
    lines.push({ emoji: "⏱️", text: `오늘 총 ${m.totalMinutes}분 같이 플레이` });
  }

  return lines;
}
