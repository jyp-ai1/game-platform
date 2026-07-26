/** Universal Party + Friends + Situation types (P0 Viral Platform). */

export interface PlayModes {
  solo: boolean;
  duo: boolean;
  party: boolean;
  tournament: boolean;
  spectator: boolean;
}

export interface PartyMember {
  deviceId: string;
  nickname: string;
  ready: boolean;
  isLeader: boolean;
  joinedAt: string;
}

export interface PartyChatMessage {
  id: string;
  deviceId: string;
  nickname: string;
  text: string;
  emoji?: string;
  at: string;
}

export interface PartyQueueItem {
  gameSlug: string;
  queuedAt: string;
}

export interface PartyHistoryEntry {
  gameSlug: string;
  roomCode: string;
  finishedAt: string;
  playerCount: number;
  winnerId?: string;
  scores?: Record<string, number>;
}

export interface PartyProgress {
  xp: number;
  level: number;
  streak: number;
  lastPlayedAt?: string;
  favoriteGame?: string;
  collection: string[];
  partyCoin: number;
}

export interface PartyMissionProgress {
  missionId: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface Party {
  id: string;
  leaderId: string;
  members: PartyMember[];
  chat: PartyChatMessage[];
  currentGameSlug?: string;
  currentRoomCode?: string;
  queue: PartyQueueItem[];
  history: PartyHistoryEntry[];
  progress: PartyProgress;
  missions: PartyMissionProgress[];
  createdAt: string;
  updatedAt: string;
}

export type FriendRelationKind =
  | "friend"
  | "frequent"
  | "rival"
  | "mentor"
  | "new"
  | "favorite";

export interface FriendPassport {
  title?: string;
  level: number;
  hoursPlayed7d: number;
  badges: string[];
  topPercentiles: Record<string, number>;
}

export interface FriendProfile {
  deviceId: string;
  nickname: string;
  coPlayCount: number;
  winsAgainst: number;
  lossesAgainst: number;
  lastCoPlayAt?: string;
  relation: FriendRelationKind;
  favorite: boolean;
  recentGames: string[];
  passport: FriendPassport;
}

export type SituationKind =
  | "join_friend"
  | "tournament_soon"
  | "mission_ready"
  | "genre_suggest"
  | "party_invite"
  | "quick_match";

export interface SituationRecommendation {
  id: string;
  kind: SituationKind;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
  priority: number;
  gameSlug?: string;
}

export type PartyReactionId = "fire" | "gg" | "rematch" | "go" | "ready" | "lol" | "ping";

export interface PartyJourneyEntry {
  id: string;
  kind: "game" | "achievement" | "mission" | "streak";
  title: string;
  at: string;
  gameSlug?: string;
}

export interface CrossGameRankingEntry {
  deviceId: string;
  nickname: string;
  totalScore: number;
  gamesPlayed: number;
}

/** Creator metadata — platform auto-attaches party/match/ranking/season. */
export interface CreatorMultiplayerMeta {
  multiplayer: boolean;
  minPlayers: number;
  maxPlayers: number;
  recommendedPlayers: number;
  party: boolean;
  spectator: boolean;
  tournament: boolean;
}
