import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isFeedbackStatus, isWorkOrderPriority } from "@/lib/feedback-intelligence";
import { updateWorkOrder } from "@/lib/feedback-work-orders";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let body: {
    status?: string;
    priority?: string;
    problem?: string;
    acceptanceCriteria?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status && !isFeedbackStatus(body.status)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }
  if (body.priority && !isWorkOrderPriority(body.priority)) {
    return NextResponse.json({ ok: false, error: "Invalid priority" }, { status: 400 });
  }

  const result = await updateWorkOrder(id, {
    status: body.status as Parameters<typeof updateWorkOrder>[1]["status"],
    priority: body.priority as Parameters<typeof updateWorkOrder>[1]["priority"],
    problem: body.problem,
    acceptanceCriteria: body.acceptanceCriteria,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}
