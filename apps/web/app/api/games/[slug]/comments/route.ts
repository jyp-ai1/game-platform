import { NextResponse } from "next/server";

import { createGameComment, listGameComments } from "@/lib/supabase/game-comments";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const comments = await listGameComments(slug);
    return NextResponse.json({ ok: true, comments });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load comments";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  let body: { author?: string; content?: string };
  try {
    body = (await request.json()) as { author?: string; content?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const result = await createGameComment(slug, body.author ?? "", body.content ?? "");
  if (!result.ok) {
    const status = result.field ? 400 : 503;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
