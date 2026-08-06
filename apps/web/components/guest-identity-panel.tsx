"use client";

import { Button } from "@game-platform/ui";
import { useState } from "react";

import { usePlayerAuth } from "@/components/auth-provider";
import {
  getGuestAssetSummary,
  getGuestIdentity,
} from "@/lib/guest-identity";

export function GuestIdentityPanel() {
  const { isAuthenticated, displayName, user, signIn, signOut, loading } = usePlayerAuth();
  const [identity, setIdentity] = useState(getGuestIdentity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assets = getGuestAssetSummary();

  async function handleGoogleLink() {
    setBusy(true);
    setError(null);
    const err = await signIn();
    if (err) setError(err);
    setIdentity(getGuestIdentity());
    setBusy(false);
  }

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    setIdentity(getGuestIdentity());
    setBusy(false);
  }

  const linked = isAuthenticated || identity.linkedGoogle;

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Replay Account</p>
      <p className="mt-1 font-mono text-sm text-muted-foreground">
        {linked
          ? `Signed in · ${displayName}`
          : `Guest · ${identity.guestId.slice(0, 12)}…`}
      </p>
      {user?.email ? (
        <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
      ) : null}
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        <li>Journey {assets.hasJourney ? "✓" : "—"}</li>
        <li>Collection {assets.hasCollection ? "✓" : "—"}</li>
        <li>Missions {assets.hasMissions ? "✓" : "—"}</li>
        <li>Auth {linked ? "✓" : "—"}</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {!linked ? (
          <Button size="sm" variant="outline" disabled={busy || loading} onClick={() => void handleGoogleLink()}>
            {busy ? "연결 중…" : "Google로 로그인"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void handleSignOut()}>
            로그아웃
          </Button>
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      {!linked ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Google 로그인 후 게스트 진행 기록이 계정에 연결됩니다.
        </p>
      ) : null}
    </section>
  );
}
