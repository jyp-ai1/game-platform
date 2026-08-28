"use client";

/**
 * Sprint 21 / CTO P0-2 — pin invite room on Detail from ?invite= or ?room= on play links.
 */
import { useEffect } from "react";

import { usePlayerAuth } from "@/components/auth-provider";
import { pinActiveRoom } from "@/lib/invite-link";

export function InviteDetailPin({
  invite,
  gameSlug,
}: {
  invite: string | null;
  gameSlug: string;
}) {
  const { isAuthenticated, signIn, loading } = usePlayerAuth();

  useEffect(() => {
    if (!invite) return;
    const code = invite.trim().toUpperCase();
    if (!code) return;
    pinActiveRoom(code);
  }, [invite, gameSlug]);

  if (!invite) return null;

  return (
    <div
      className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm"
      data-testid="invite-detail-banner"
    >
      <p className="font-semibold text-cyan-100">친구 초대 링크</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Room <span className="font-mono text-cyan-200">{invite.toUpperCase()}</span> — WORLD PLAY로
        같은 월드에 입장하세요.
      </p>
      {!loading && !isAuthenticated ? (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-primary underline"
          onClick={() => void signIn()}
          data-testid="invite-optional-login"
        >
          선택: Google 로그인 후 기록 저장 (LIVE OAuth: CEO HOLD)
        </button>
      ) : null}
    </div>
  );
}
