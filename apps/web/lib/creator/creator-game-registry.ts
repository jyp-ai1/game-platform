/**
 * Sprint 23 — Creator game registry (JSON file + localStorage sync).
 * Pipeline: draft → preview → review → publish (admin in Sprint 24).
 */
import type { GameType } from "@game-platform/game-sdk/src/game-metadata";
import { buildPlatformGameContract } from "@/lib/platform-game-contract";

import type { PlayableSlug } from "@/lib/playable-games";

export type CreatorPipelineStatus = "draft" | "preview" | "review" | "published";

export interface CreatorGameRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  /** User-facing Solo / Multiplayer selection. */
  gameType: GameType;
  /** Stub engine — maps to existing playable slug (no new game code). */
  templateSlug: PlayableSlug;
  status: CreatorPipelineStatus;
  contractCompliant: boolean;
  creatorId: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  playCount: number;
}

const REGISTRY_KEY = "play29:creator-game-registry";
const CREATOR_SLUG_PREFIX = "creator-";
const DEFAULT_TEMPLATE: PlayableSlug = "2048";

export function isCreatorGameSlug(slug: string): boolean {
  return slug.startsWith(CREATOR_SLUG_PREFIX);
}

export function slugifyCreatorTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const suffix = Date.now().toString(36).slice(-4);
  return `${CREATOR_SLUG_PREFIX}${base || "game"}-${suffix}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/** Client-side registry (mirrors server JSON via API). */
export function getClientCreatorGames(): CreatorGameRecord[] {
  return readJson<CreatorGameRecord[]>(REGISTRY_KEY, []);
}

export function saveClientCreatorGames(games: CreatorGameRecord[]): void {
  writeJson(REGISTRY_KEY, games);
}

export function getClientCreatorGame(slug: string): CreatorGameRecord | null {
  return getClientCreatorGames().find((g) => g.slug === slug) ?? null;
}

/** Enforce platform contract metadata on every creator game. */
export function enforceCreatorContract(record: CreatorGameRecord): CreatorGameRecord {
  const contract = buildPlatformGameContract(record.slug);
  const mp = record.gameType === "multiplayer";
  const compliant =
    contract.entrySteps.character &&
    contract.entrySteps.color &&
    contract.deathOverlay &&
    (mp ? !contract.entrySteps.difficulty : contract.entrySteps.difficulty);
  return { ...record, contractCompliant: compliant };
}

export function buildCreatorGameDraft(input: {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  gameType: GameType;
  creatorId: string;
  creatorName: string;
}): CreatorGameRecord {
  const now = new Date().toISOString();
  const slug = slugifyCreatorTitle(input.title);
  const draft: CreatorGameRecord = {
    id: `cg-${Date.now()}`,
    slug,
    title: input.title.trim() || "Untitled",
    description: input.description.trim(),
    thumbnailUrl: input.thumbnailUrl,
    gameType: input.gameType,
    templateSlug: DEFAULT_TEMPLATE,
    status: "draft",
    contractCompliant: false,
    creatorId: input.creatorId,
    creatorName: input.creatorName,
    createdAt: now,
    updatedAt: now,
    playCount: 0,
  };
  return enforceCreatorContract(draft);
}

/** Stub generate — registers metadata pointing to template (no AI engine). */
export function stubGeneratePreview(record: CreatorGameRecord): CreatorGameRecord {
  const next = enforceCreatorContract({
    ...record,
    status: "preview",
    templateSlug: DEFAULT_TEMPLATE,
    updatedAt: new Date().toISOString(),
  });
  return next;
}

export function submitForReview(record: CreatorGameRecord): CreatorGameRecord {
  if (record.status !== "preview") return record;
  return { ...record, status: "review", updatedAt: new Date().toISOString() };
}

export function approvePublish(record: CreatorGameRecord): CreatorGameRecord {
  if (record.status !== "review") return record;
  return enforceCreatorContract({
    ...record,
    status: "published",
    updatedAt: new Date().toISOString(),
  });
}

export function rejectReview(record: CreatorGameRecord): CreatorGameRecord {
  return { ...record, status: "draft", updatedAt: new Date().toISOString() };
}

export function unpublish(record: CreatorGameRecord): CreatorGameRecord {
  return { ...record, status: "draft", updatedAt: new Date().toISOString() };
}

export const CREATOR_PIPELINE_STEPS: CreatorPipelineStatus[] = [
  "draft",
  "preview",
  "review",
  "published",
];

export function pipelineStepIndex(status: CreatorPipelineStatus): number {
  return CREATOR_PIPELINE_STEPS.indexOf(status);
}
