/**
 * MP-CTO-023 — Supabase-backed game comments (server API).
 */
import { getAdminSupabase } from "@/lib/supabase/admin-server";
import { supabase } from "@/lib/supabase/client";

export const MAX_COMMENT_LENGTH = 500;
export const MAX_AUTHOR_LENGTH = 32;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type GameComment = {
  id: string;
  gameSlug: string;
  author: string;
  content: string;
  createdAt: string;
};

export type CommentValidationResult =
  | { ok: true; author: string; content: string }
  | { ok: false; error: string; field?: "author" | "content" };

function mapRow(row: Record<string, unknown>): GameComment {
  return {
    id: String(row.id),
    gameSlug: String(row.game_slug),
    author: String(row.author),
    content: String(row.content),
    createdAt: String(row.created_at),
  };
}

export function validateCommentInput(
  author: string,
  content: string
): CommentValidationResult {
  const trimmedAuthor = author.trim();
  const trimmedContent = content.trim();

  if (!trimmedAuthor) {
    return { ok: false, error: "작성자 이름을 입력하세요.", field: "author" };
  }
  if (trimmedAuthor.length > MAX_AUTHOR_LENGTH) {
    return {
      ok: false,
      error: `작성자 이름은 ${MAX_AUTHOR_LENGTH}자 이내입니다.`,
      field: "author",
    };
  }
  if (!trimmedContent) {
    return { ok: false, error: "빈 댓글은 등록할 수 없습니다.", field: "content" };
  }
  if (trimmedContent.length > MAX_COMMENT_LENGTH) {
    return {
      ok: false,
      error: `댓글은 ${MAX_COMMENT_LENGTH}자 이내로 작성해 주세요.`,
      field: "content",
    };
  }
  const banned = ["http://malware", "<script"];
  if (banned.some((b) => trimmedContent.toLowerCase().includes(b))) {
    return { ok: false, error: "허용되지 않는 내용입니다.", field: "content" };
  }

  return { ok: true, author: trimmedAuthor, content: trimmedContent };
}

export async function listGameComments(gameSlug: string, limit = 50): Promise<GameComment[]> {
  const slug = gameSlug.trim().toLowerCase();
  if (!slug) return [];

  const { data, error } = await supabase
    .from("game_comments")
    .select("id, game_slug, author, content, created_at")
    .eq("game_slug", slug)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.includes("game_comments")) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function createGameComment(
  gameSlug: string,
  author: string,
  content: string
): Promise<
  | { ok: true; comment: GameComment }
  | { ok: false; error: string; field?: "author" | "content" }
> {
  const slug = gameSlug.trim().toLowerCase();
  if (!slug || !SLUG_RE.test(slug)) {
    return { ok: false, error: "Invalid game slug", field: "content" };
  }

  const validation = validateCommentInput(author, content);
  if (!validation.ok) return validation;

  const admin = getAdminSupabase();
  if (!admin) {
    return { ok: false, error: "서버 DB 연결을 사용할 수 없습니다." };
  }

  const { data, error } = await admin
    .from("game_comments")
    .insert({
      game_slug: slug,
      author: validation.author,
      content: validation.content,
    })
    .select("id, game_slug, author, content, created_at")
    .single();

  if (error) {
    if (error.message.includes("game_comments")) {
      return {
        ok: false,
        error: "DB migration 0035가 적용되지 않았습니다. (game_comments 테이블 필요)",
      };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, comment: mapRow(data as Record<string, unknown>) };
}
