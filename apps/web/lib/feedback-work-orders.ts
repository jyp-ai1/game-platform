/**
 * Feedback Work Orders — CPO review queue (no auto dev/deploy).
 */
import {
  isFeedbackStatus,
  isWorkOrderPriority,
  normalizeContentKey,
  type WorkOrderPriority,
} from "@/lib/feedback-intelligence";
import { isFeedbackType, type FeedbackStatus, type FeedbackType } from "@/lib/game-feedback-types";
import { getAdminSupabase } from "@/lib/supabase/admin-server";
import { linkFeedbackToWorkOrder } from "@/lib/supabase/game-comments";

export type FeedbackWorkOrder = {
  id: string;
  gameSlug: string;
  feedbackType: FeedbackType;
  priority: WorkOrderPriority;
  status: FeedbackStatus;
  problem: string;
  acceptanceCriteria: string | null;
  evidenceCount: number;
  evidenceFeedbackIds: string[];
  sampleContent: string | null;
  patternKey: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapWorkOrder(row: Record<string, unknown>): FeedbackWorkOrder {
  const ft = row.feedback_type;
  const feedbackType =
    typeof ft === "string" && isFeedbackType(ft) ? ft : "opinion";
  const pr = row.priority;
  const priority =
    typeof pr === "string" && isWorkOrderPriority(pr) ? pr : "P2";
  const st = row.status;
  const status =
    typeof st === "string" && isFeedbackStatus(st) ? st : "NEW";

  return {
    id: String(row.id),
    gameSlug: String(row.game_slug),
    feedbackType,
    priority,
    status,
    problem: String(row.problem),
    acceptanceCriteria: row.acceptance_criteria ? String(row.acceptance_criteria) : null,
    evidenceCount: Number(row.evidence_count ?? 0),
    evidenceFeedbackIds: Array.isArray(row.evidence_feedback_ids)
      ? row.evidence_feedback_ids.map(String)
      : [],
    sampleContent: row.sample_content ? String(row.sample_content) : null,
    patternKey: row.pattern_key ? String(row.pattern_key) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export type CreateWorkOrderInput = {
  gameSlug: string;
  feedbackType: FeedbackType;
  problem: string;
  priority?: WorkOrderPriority;
  acceptanceCriteria?: string;
  evidenceFeedbackIds: string[];
  sampleContent?: string;
  patternKey?: string;
};

export async function listWorkOrders(limit = 100): Promise<FeedbackWorkOrder[]> {
  const admin = getAdminSupabase();
  if (!admin) return [];

  const { data, error } = await admin
    .from("feedback_work_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.includes("feedback_work_orders")) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapWorkOrder(row as Record<string, unknown>));
}

export async function createWorkOrder(
  input: CreateWorkOrderInput
): Promise<
  { ok: true; workOrder: FeedbackWorkOrder } | { ok: false; error: string }
> {
  const admin = getAdminSupabase();
  if (!admin) return { ok: false, error: "DB unavailable" };

  const priority = input.priority ?? "P2";
  const evidenceIds = input.evidenceFeedbackIds.filter(Boolean);
  const patternKey =
    input.patternKey ??
    `${input.gameSlug}:${input.feedbackType}:${normalizeContentKey(input.sampleContent ?? input.problem)}`;

  const { data, error } = await admin
    .from("feedback_work_orders")
    .insert({
      game_slug: input.gameSlug.trim().toLowerCase(),
      feedback_type: input.feedbackType,
      priority,
      status: "NEW",
      problem: input.problem.trim(),
      acceptance_criteria: input.acceptanceCriteria?.trim() || null,
      evidence_count: evidenceIds.length,
      evidence_feedback_ids: evidenceIds,
      sample_content: input.sampleContent?.trim() || null,
      pattern_key: patternKey,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("feedback_work_orders")) {
      return {
        ok: false,
        error: "Migration 0037 required (feedback_work_orders table)",
      };
    }
    return { ok: false, error: error.message };
  }

  const workOrder = mapWorkOrder(data as Record<string, unknown>);

  try {
    await linkFeedbackToWorkOrder(evidenceIds, workOrder.id);
  } catch {
    /* optional link — table may lack work_order_id until 0037 */
  }

  return { ok: true, workOrder };
}

export async function updateWorkOrder(
  id: string,
  patch: Partial<{
    priority: WorkOrderPriority;
    status: FeedbackStatus;
    problem: string;
    acceptanceCriteria: string;
  }>
): Promise<
  { ok: true; workOrder: FeedbackWorkOrder } | { ok: false; error: string }
> {
  const admin = getAdminSupabase();
  if (!admin) return { ok: false, error: "DB unavailable" };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.priority) update.priority = patch.priority;
  if (patch.status) update.status = patch.status;
  if (patch.problem) update.problem = patch.problem.trim();
  if (patch.acceptanceCriteria !== undefined) {
    update.acceptance_criteria = patch.acceptanceCriteria.trim() || null;
  }

  const { data, error } = await admin
    .from("feedback_work_orders")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Not found" };
  }
  return { ok: true, workOrder: mapWorkOrder(data as Record<string, unknown>) };
}

export function defaultAcceptanceCriteria(
  gameSlug: string,
  feedbackType: FeedbackType,
  problem: string
): string {
  return [
    `Game: ${gameSlug}`,
    `Type: ${feedbackType}`,
    `Problem: ${problem}`,
    "Fix verified on Preview",
    "No regression on 4 P0 games feedback",
    "CPO Product PASS before Production",
  ].join("\n");
}
