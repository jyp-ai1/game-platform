"use client";

import { Button } from "@game-platform/ui";
import { useState } from "react";

import {
  getGuestAssetSummary,
  getGuestIdentity,
  linkGoogleAccount,
  mergeGuestToAccount,
} from "@/lib/guest-identity";

export function GuestIdentityPanel() {
  const [identity, setIdentity] = useState(getGuestIdentity);
  const assets = getGuestAssetSummary();

  function handleGoogleLink() {
    linkGoogleAccount("player@gmail.com");
    setIdentity(getGuestIdentity());
  }

  function handleMerge() {
    mergeGuestToAccount();
    setIdentity(getGuestIdentity());
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Replay Account</p>
      <p className="mt-1 font-mono text-sm text-muted-foreground">Guest · {identity.guestId.slice(0, 12)}…</p>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        <li>Journey {assets.hasJourney ? "✓" : "—"}</li>
        <li>Collection {assets.hasCollection ? "✓" : "—"}</li>
        <li>Missions {assets.hasMissions ? "✓" : "—"}</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {!identity.linkedGoogle ? (
          <Button size="sm" variant="outline" onClick={handleGoogleLink}>
            Link Google
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={handleMerge} disabled={!!identity.mergedAt}>
            {identity.mergedAt ? "Merged ✓" : "Merge Account"}
          </Button>
        )}
      </div>
    </section>
  );
}
