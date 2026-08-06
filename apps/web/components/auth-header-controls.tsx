"use client";

/**
 * RC-AUTH-001 — Header login / session controls.
 */
import { Button } from "@game-platform/ui";
import Link from "next/link";
import { useState } from "react";

import { usePlayerAuth } from "@/components/auth-provider";

export function AuthHeaderControls() {
  const { isAuthenticated, displayName, loading, signIn, signOut } = usePlayerAuth();
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
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="hidden max-w-[9rem] truncate text-xs sm:inline-flex"
          nativeButton={false}
          render={<Link href="/profile">{displayName}</Link>}
        />
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleSignOut()}>
          로그아웃
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
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
