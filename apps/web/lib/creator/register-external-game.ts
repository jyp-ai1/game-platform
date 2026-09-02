/**
 * MP-CTO-022 — register external URL game into Supabase games catalog.
 */
import type { Game } from "@game-platform/shared";

import { getAdminSupabase } from "@/lib/supabase/admin-server";
import { getGameBySlug } from "@/lib/supabase/games";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = new Set(["admin", "api", "games", "studio", "creator", "profile", "search"]);

export type RegisterExternalGameInput = {
  title: string;
  slug: string;
  description?: string;
  playUrl: string;
  thumbnailUrl?: string | null;
  authorName?: string;
};

export type RegisterExternalGameResult =
  | { ok: true; game: Game }
  | { ok: false; error: string; field?: string };

export function slugifyTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Date.now().toString(36).slice(-4);
  return base ? `${base}-${suffix}` : `game-${suffix}`;
}

export function validatePlayUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "게임 URL을 입력하세요.";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "올바른 URL 형식이 아닙니다.";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "http 또는 https URL만 등록할 수 있습니다.";
  }
  return null;
}

export function validateRegisterInput(input: RegisterExternalGameInput): RegisterExternalGameResult | null {
  const title = input.title?.trim() ?? "";
  const slug = input.slug?.trim().toLowerCase() ?? "";
  const description = input.description?.trim() ?? "";
  const playUrl = input.playUrl?.trim() ?? "";

  if (!title) return { ok: false, error: "게임 제목을 입력하세요.", field: "title" };
  if (title.length < 2) return { ok: false, error: "제목은 2자 이상이어야 합니다.", field: "title" };
  if (!slug) return { ok: false, error: "slug를 입력하세요.", field: "slug" };
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: "slug는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.", field: "slug" };
  }
  if (RESERVED.has(slug)) {
    return { ok: false, error: "사용할 수 없는 slug입니다.", field: "slug" };
  }
  const urlError = validatePlayUrl(playUrl);
  if (urlError) return { ok: false, error: urlError, field: "playUrl" };

  if (!description) {
    return { ok: false, error: "게임 설명을 입력하세요.", field: "description" };
  }

  return null;
}

function mapInsertedRow(row: Record<string, unknown>): Game {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description ?? ""),
    thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
    difficulty: (row.difficulty as Game["difficulty"]) ?? "MEDIUM",
    status: (row.status as Game["status"]) ?? "ACTIVE",
    sortOrder: Number(row.sort_order ?? 900),
    categoryId: (row.category_id as string | null) ?? null,
    category: null,
    isFeatured: Boolean(row.is_featured ?? false),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : ["creator", "external"],
    howToPlay: (row.how_to_play as string | null) ?? null,
    playCount: Number(row.play_count ?? 0),
    nostalgiaNote: (row.nostalgia_note as string | null) ?? null,
    playUrl: (row.play_url as string | null) ?? null,
    sourceType: (row.source_type as Game["sourceType"]) ?? "external",
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function registerExternalGame(
  input: RegisterExternalGameInput
): Promise<RegisterExternalGameResult> {
  const validationError = validateRegisterInput(input);
  if (validationError) return validationError;

  const supabase = getAdminSupabase();
  if (!supabase) {
    return { ok: false, error: "서버 DB 연결을 사용할 수 없습니다. (Supabase env 확인)" };
  }

  const slug = input.slug.trim().toLowerCase();
  const existing = await getGameBySlug(slug);
  if (existing) {
    return { ok: false, error: "이미 사용 중인 slug입니다.", field: "slug" };
  }

  const tags = ["creator", "external"];
  const author = input.authorName?.trim();
  if (author) tags.push(`author:${author.slice(0, 32)}`);

  const { data, error } = await supabase
    .from("games")
    .insert({
      slug,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      difficulty: "MEDIUM",
      status: "ACTIVE",
      sort_order: 900,
      is_featured: false,
      tags,
      how_to_play: "외부 게임 — iframe으로 실행됩니다.",
      play_url: input.playUrl.trim(),
      source_type: "external",
    })
    .select(
      "id, slug, title, description, thumbnail_url, difficulty, status, sort_order, category_id, is_featured, tags, how_to_play, play_count, nostalgia_note, play_url, source_type, created_at, updated_at"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "이미 사용 중인 slug입니다.", field: "slug" };
    }
    if (error.message.includes("play_url") || error.message.includes("source_type")) {
      return {
        ok: false,
        error: "DB migration 0034가 적용되지 않았습니다. (play_url / source_type 컬럼 필요)",
      };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, game: mapInsertedRow(data as Record<string, unknown>) };
}
