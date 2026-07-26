/**
 * Social reactions — 👍 🔥 축하 도전 (Replay SNS).
 */
import { trackChallengeMetric } from "@/components/product-metrics-bridge";

const REACTIONS_KEY = "play29:feed-reactions";
const FEED_EVENTS_KEY = "play29:social-feed-events";

export type ReactionType = "like" | "fire" | "cheer" | "challenge";

export interface FeedReactionCounts {
  like: number;
  fire: number;
  cheer: number;
  challenge: number;
}

export interface SocialFeedEvent {
  id: string;
  actor: string;
  headline: string;
  detail: string;
  gameSlug?: string;
  score?: number;
  createdAt: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

function readReactions(): Record<string, Partial<Record<ReactionType, number>>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(REACTIONS_KEY) ?? "{}") as Record<
      string,
      Partial<Record<ReactionType, number>>
    >;
  } catch {
    return {};
  }
}

function writeReactions(data: Record<string, Partial<Record<ReactionType, number>>>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REACTIONS_KEY, JSON.stringify(data));
  notify();
}

function readFeedEvents(): SocialFeedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(FEED_EVENTS_KEY) ?? "[]") as SocialFeedEvent[];
  } catch {
    return [];
  }
}

function writeFeedEvents(events: SocialFeedEvent[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FEED_EVENTS_KEY, JSON.stringify(events.slice(0, 30)));
  notify();
}

export function subscribeSocialReactions(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getReactionCounts(itemId: string): FeedReactionCounts {
  const row = readReactions()[itemId] ?? {};
  return {
    like: row.like ?? 0,
    fire: row.fire ?? 0,
    cheer: row.cheer ?? 0,
    challenge: row.challenge ?? 0,
  };
}

export function addReaction(itemId: string, type: ReactionType): FeedReactionCounts {
  const all = readReactions();
  const row = { ...all[itemId] };
  row[type] = (row[type] ?? 0) + 1;
  all[itemId] = row;
  writeReactions(all);
  if (type === "challenge") trackChallengeMetric();
  return getReactionCounts(itemId);
}

/** Push friend beat / new record to social feed immediately. */
export function recordSocialBeatEvent(opts: {
  actor: string;
  headline: string;
  detail: string;
  gameSlug?: string;
  score?: number;
}): void {
  const events = readFeedEvents();
  events.unshift({
    id: `beat-${Date.now()}`,
    actor: opts.actor,
    headline: opts.headline,
    detail: opts.detail,
    gameSlug: opts.gameSlug,
    score: opts.score,
    createdAt: new Date().toISOString(),
  });
  writeFeedEvents(events);
}

export function listSocialFeedEvents(limit = 10): SocialFeedEvent[] {
  return readFeedEvents().slice(0, limit);
}
