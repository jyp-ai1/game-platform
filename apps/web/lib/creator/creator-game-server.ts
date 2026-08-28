/**
 * Sprint 23 — server-side creator registry (JSON file).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CreatorGameRecord, CreatorPipelineStatus } from "@/lib/creator/creator-game-registry";
import {
  approvePublish,
  buildCreatorGameDraft,
  enforceCreatorContract,
  rejectReview,
  stubGeneratePreview,
  submitForReview,
  unpublish,
} from "@/lib/creator/creator-game-registry";

const DATA_PATH = join(process.cwd(), "data", "creator-games.json");

function readRegistryFile(): CreatorGameRecord[] {
  try {
    const raw = readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as CreatorGameRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRegistryFile(games: CreatorGameRecord[]): void {
  writeFileSync(DATA_PATH, `${JSON.stringify(games, null, 2)}\n`, "utf8");
}

export function listServerCreatorGames(): CreatorGameRecord[] {
  return readRegistryFile();
}

export function getServerCreatorGame(slug: string): CreatorGameRecord | null {
  return readRegistryFile().find((g) => g.slug === slug) ?? null;
}

export function getServerCreatorGameById(id: string): CreatorGameRecord | null {
  return readRegistryFile().find((g) => g.id === id) ?? null;
}

export function listPublishedCreatorGames(): CreatorGameRecord[] {
  return readRegistryFile().filter((g) => g.status === "published");
}

export function listReviewCreatorGames(): CreatorGameRecord[] {
  return readRegistryFile().filter((g) => g.status === "review");
}

function upsert(record: CreatorGameRecord): CreatorGameRecord {
  const games = readRegistryFile();
  const idx = games.findIndex((g) => g.id === record.id);
  if (idx >= 0) games[idx] = record;
  else games.unshift(record);
  writeRegistryFile(games);
  return record;
}

export function createServerCreatorGame(input: {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  gameType: "multiplayer" | "singleplayer";
  creatorId: string;
  creatorName: string;
}): CreatorGameRecord {
  const draft = buildCreatorGameDraft(input);
  return upsert(draft);
}

export function transitionCreatorGame(
  id: string,
  action: "preview" | "review" | "publish" | "reject" | "unpublish"
): CreatorGameRecord | null {
  const current = getServerCreatorGameById(id);
  if (!current) return null;

  let next: CreatorGameRecord;
  switch (action) {
    case "preview":
      next = stubGeneratePreview(current);
      break;
    case "review":
      next = submitForReview(current);
      break;
    case "publish":
      next = approvePublish(current);
      break;
    case "reject":
      next = rejectReview(current);
      break;
    case "unpublish":
      next = unpublish(current);
      break;
    default:
      return current;
  }
  return upsert(enforceCreatorContract(next));
}

export function patchCreatorGameStatus(
  id: string,
  status: CreatorPipelineStatus
): CreatorGameRecord | null {
  const current = getServerCreatorGameById(id);
  if (!current) return null;
  const next = enforceCreatorContract({ ...current, status, updatedAt: new Date().toISOString() });
  return upsert(next);
}

export function syncServerRegistry(games: CreatorGameRecord[]): CreatorGameRecord[] {
  writeRegistryFile(games.map((g) => enforceCreatorContract(g)));
  return readRegistryFile();
}
