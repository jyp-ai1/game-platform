"use client";

/**
 * Sprint 19 — Header login → profile when logged in (Google OAuth path).
 * LIVE device OAuth PASS = CEO HOLD — UI/session code only.
 */
import { Button } from "@game-platform/ui";
import Link from "next/link";
import { useState } from "react";

import { usePlayerAuth } from "@/components/auth-provider";

export function AuthHeaderControls() {
  const { isAuthenticated, displayName, avatarUrl, loading, signIn, signOut } =
    usePlayerAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    const err = await signIn();
    if (err) setError(err);
    setBusy(false);
  }

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    setBusy(false);
  }

  if (loading) {
    return <span className="hidden text-xs text-muted-foreground sm:inline">…</span>;
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-1" data-testid="auth-header-profile">
        <Button
          variant="ghost"
          size="sm"
          className="inline-flex max-w-[11rem] items-center gap-1.5 truncate text-xs"
          nativeButton={false}
          render={<Link href="/profile" />}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              width={20}
              height={20}
              className="size-5 shrink-0 rounded-full object-cover"
              data-testid="auth-header-avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold"
              aria-hidden
            >
              {(displayName[0] ?? "P").toUpperCase()}
            </span>
          )}
          <span className="hidden truncate sm:inline">{displayName}</span>
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleSignOut()}>
          로그아웃
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" data-testid="auth-header-login">
      <Button size="sm" disabled={busy} onClick={() => void handleSignIn()}>
        {busy ? "연결 중…" : "로그인"}
      </Button>
      {error ? (
        <span className="hidden max-w-[8rem] truncate text-[10px] text-red-400 sm:inline" title={error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
