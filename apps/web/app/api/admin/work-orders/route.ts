import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  createWorkOrder,
  defaultAcceptanceCriteria,
  listWorkOrders,
} from "@/lib/feedback-work-orders";
import { isFeedbackType } from "@/lib/game-feedback-types";
import { isWorkOrderPriority } from "@/lib/feedback-intelligence";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const workOrders = await listWorkOrders();
    return NextResponse.json({ ok: true, workOrders });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list work orders";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: {
    gameSlug?: string;
    feedbackType?: string;
    problem?: string;
    priority?: string;
    acceptanceCriteria?: string;
    evidenceFeedbackIds?: string[];
    sampleContent?: string;
    patternKey?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const gameSlug = body.gameSlug?.trim().toLowerCase();
  const feedbackType = body.feedbackType;
  const problem = body.problem?.trim();

  if (!gameSlug || !problem || !feedbackType || !isFeedbackType(feedbackType)) {
    return NextResponse.json({ ok: false, error: "gameSlug, feedbackType, problem required" }, {
      status: 400,
    });
  }

  const priority =
    body.priority && isWorkOrderPriority(body.priority) ? body.priority : undefined;

  const acceptanceCriteria =
    body.acceptanceCriteria?.trim() ||
    defaultAcceptanceCriteria(gameSlug, feedbackType, problem);

  const result = await createWorkOrder({
    gameSlug,
    feedbackType,
    problem,
    priority,
    acceptanceCriteria,
    evidenceFeedbackIds: body.evidenceFeedbackIds ?? [],
    sampleContent: body.sampleContent,
    patternKey: body.patternKey,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 503 });
  }

  return NextResponse.json(result, { status: 201 });
}
