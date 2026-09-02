import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  registerExternalGame,
  type RegisterExternalGameInput,
} from "@/lib/creator/register-external-game";

export async function POST(request: Request) {
  let body: RegisterExternalGameInput;
  try {
    body = (await request.json()) as RegisterExternalGameInput;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const result = await registerExternalGame(body);
  if (!result.ok) {
    const status = result.field ? 400 : 503;
    return NextResponse.json(result, { status });
  }

  revalidatePath("/games");
  revalidatePath(`/games/${result.game.slug}`);
  revalidatePath(`/games/${result.game.slug}/play`);

  return NextResponse.json(result, { status: 201 });
}
