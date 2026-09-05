/**
 * MP-CTO-023 — Supabase-backed game comments (server API).
 * Game Feedback & QA Operations — feedback type + daily aggregation.
 */
import {
  emptyTypeCounts,
  FEEDBACK_TYPES,
  isFeedbackType,
  normalizeFeedbackType,
  P0_FEEDBACK_GAMES,
  type FeedbackStatus,
  type FeedbackType,
} from "@/lib/game-feedback-types";
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
  feedbackType: FeedbackType;
  status: FeedbackStatus;
  createdAt: string;
};

export type GameFeedbackSummary = {
  gameSlug: string;
  total: number;
  byType: Record<FeedbackType, number>;
};

export type DailyFeedbackSummary = {
  date: string;
  total: number;
  byGame: Record<string, number>;
  byType: Record<FeedbackType, number>;
  games: GameFeedbackSummary[];
};

export type CommentValidationResult =
  | { ok: true; author: string; content: string; feedbackType: FeedbackType }
  | { ok: false; error: string; field?: "author" | "content" | "feedbackType" };

const COMMENT_COLUMNS =
  "id, game_slug, author, content, feedback_type, status, created_at";
const LEGACY_COMMENT_COLUMNS = "id, game_slug, author, content, created_at";

function mapRow(row: Record<string, unknown>): GameComment {
  const rawType = row.feedback_type;
  const feedbackType =
    typeof rawType === "string" && isFeedbackType(rawType) ? rawType : "opinion";
  const rawStatus = row.status;
  const status =
    typeof rawStatus === "string" &&
    ["NEW", "REVIEWING", "PLANNED", "IN_PROGRESS", "QA", "RELEASED"].includes(rawStatus)
      ? (rawStatus as FeedbackStatus)
      : "NEW";

  return {
    id: String(row.id),
    gameSlug: String(row.game_slug),
    author: String(row.author),
    content: String(row.content),
    feedbackType,
    status,
    createdAt: String(row.created_at),
  };
}

export function validateCommentInput(
  author: string,
  content: string,
  feedbackTypeInput?: unknown
): CommentValidationResult {
  const trimmedAuthor = author.trim();
  const trimmedContent = content.trim();
  const feedbackType = normalizeFeedbackType(feedbackTypeInput);

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

  return { ok: true, author: trimmedAuthor, content: trimmedContent, feedbackType };
}

async function selectComments(
  client: typeof supabase,
  slug: string,
  limit: number
): Promise<GameComment[]> {
  const full = await client
    .from("game_comments")
    .select(COMMENT_COLUMNS)
    .eq("game_slug", slug)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!full.error) {
    return (full.data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  }

  if (full.error.message.includes("feedback_type") || full.error.message.includes("status")) {
    const legacy = await client
      .from("game_comments")
      .select(LEGACY_COMMENT_COLUMNS)
      .eq("game_slug", slug)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (legacy.error) throw new Error(legacy.error.message);
    return (legacy.data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  }

  if (full.error.message.includes("game_comments")) return [];
  throw new Error(full.error.message);
}

export async function listGameComments(gameSlug: string, limit = 50): Promise<GameComment[]> {
  const slug = gameSlug.trim().toLowerCase();
  if (!slug) return [];

  return selectComments(supabase, slug, limit);
}

async function insertComment(
  admin: NonNullable<ReturnType<typeof getAdminSupabase>>,
  slug: string,
  validation: Extract<CommentValidationResult, { ok: true }>
): Promise<
  | { ok: true; comment: GameComment }
  | { ok: false; error: string; field?: "author" | "content" | "feedbackType" }
> {
  const withFeedback = await admin
    .from("game_comments")
    .insert({
      game_slug: slug,
      author: validation.author,
      content: validation.content,
      feedback_type: validation.feedbackType,
      status: "NEW",
    })
    .select(COMMENT_COLUMNS)
    .single();

  if (!withFeedback.error) {
    return { ok: true, comment: mapRow(withFeedback.data as Record<string, unknown>) };
  }

  if (
    withFeedback.error.message.includes("feedback_type") ||
    withFeedback.error.message.includes("status")
  ) {
    const legacy = await admin
      .from("game_comments")
      .insert({
        game_slug: slug,
        author: validation.author,
        content: validation.content,
      })
      .select(LEGACY_COMMENT_COLUMNS)
      .single();
    if (legacy.error) {
      if (legacy.error.message.includes("game_comments")) {
        return {
          ok: false,
          error: "DB migration 0035가 적용되지 않았습니다. (game_comments 테이블 필요)",
        };
      }
      return { ok: false, error: legacy.error.message };
    }
    return { ok: true, comment: mapRow(legacy.data as Record<string, unknown>) };
  }

  if (withFeedback.error.message.includes("game_comments")) {
    return {
      ok: false,
      error: "DB migration 0035가 적용되지 않았습니다. (game_comments 테이블 필요)",
    };
  }
  return { ok: false, error: withFeedback.error.message };
}

export async function createGameComment(
  gameSlug: string,
  author: string,
  content: string,
  feedbackTypeInput?: unknown
): Promise<
  | { ok: true; comment: GameComment }
  | { ok: false; error: string; field?: "author" | "content" | "feedbackType" }
> {
  const slug = gameSlug.trim().toLowerCase();
  if (!slug || !SLUG_RE.test(slug)) {
    return { ok: false, error: "Invalid game slug", field: "content" };
  }

  const validation = validateCommentInput(author, content, feedbackTypeInput);
  if (!validation.ok) return validation;

  const admin = getAdminSupabase();
  if (!admin) {
    return { ok: false, error: "서버 DB 연결을 사용할 수 없습니다." };
  }

  return insertComment(admin, slug, validation);
}

function utcDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function aggregateRows(rows: GameComment[]): {
  byGame: Record<string, number>;
  byType: Record<FeedbackType, number>;
  games: GameFeedbackSummary[];
} {
  const byGame: Record<string, number> = {};
  const byType = emptyTypeCounts();
  const perGame = new Map<string, Record<FeedbackType, number>>();

  for (const row of rows) {
    byGame[row.gameSlug] = (byGame[row.gameSlug] ?? 0) + 1;
    byType[row.feedbackType] += 1;

    const gameTypes = perGame.get(row.gameSlug) ?? emptyTypeCounts();
    gameTypes[row.feedbackType] += 1;
    perGame.set(row.gameSlug, gameTypes);
  }

  const games: GameFeedbackSummary[] = [...perGame.entries()]
    .map(([gameSlug, typeCounts]) => ({
      gameSlug,
      total: Object.values(typeCounts).reduce((a, b) => a + b, 0),
      byType: typeCounts,
    }))
    .sort((a, b) => b.total - a.total);

  return { byGame, byType, games };
}

/** Per-game feedback counts (P0 games only when slug omitted). */
export async function getGameFeedbackSummary(
  gameSlug?: string
): Promise<GameFeedbackSummary[]> {
  const admin = getAdminSupabase();
  if (!admin) return [];

  let query = admin.from("game_comments").select(COMMENT_COLUMNS);

  if (gameSlug) {
    query = query.eq("game_slug", gameSlug.trim().toLowerCase());
  } else {
    query = query.in("game_slug", [...P0_FEEDBACK_GAMES]);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(5000);

  if (error) {
    if (error.message.includes("game_comments")) return [];
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  return aggregateRows(rows).games;
}

/** Daily rollup — date in YYYY-MM-DD (UTC). Omit for today. */
export async function getDailyFeedbackSummary(dateInput?: string): Promise<DailyFeedbackSummary> {
  const admin = getAdminSupabase();
  const date =
    dateInput?.trim() ||
    new Date().toISOString().slice(0, 10);

  const empty: DailyFeedbackSummary = {
    date,
    total: 0,
    byGame: {},
    byType: emptyTypeCounts(),
    games: [],
  };

  if (!admin) return empty;

  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const { data, error } = await admin
    .from("game_comments")
    .select(COMMENT_COLUMNS)
    .in("game_slug", [...P0_FEEDBACK_GAMES])
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    if (error.message.includes("game_comments")) return empty;
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  const { byGame, byType, games } = aggregateRows(rows);

  return {
    date,
    total: rows.length,
    byGame,
    byType,
    games,
  };
}

/** List distinct dates (UTC) with feedback counts for P0 games. */
export async function listFeedbackDates(limit = 14): Promise<
  Array<{ date: string; total: number }>
> {
  const admin = getAdminSupabase();
  if (!admin) return [];

  const { data, error } = await admin
    .from("game_comments")
    .select("created_at")
    .in("game_slug", [...P0_FEEDBACK_GAMES])
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    if (error.message.includes("game_comments")) return [];
    throw new Error(error.message);
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = utcDateKey(String((row as { created_at: string }).created_at));
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export { FEEDBACK_TYPES, P0_FEEDBACK_GAMES };
