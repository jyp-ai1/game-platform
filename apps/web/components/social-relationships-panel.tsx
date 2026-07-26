"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { buildSocialRelationships } from "@/lib/social-relationship-engine";
import { subscribeSocial } from "@/lib/social-store";
import { useMounted } from "@/lib/use-mounted";

export function SocialRelationshipsPanel() {
  const mounted = useMounted();
  useSyncExternalStore(subscribeSocial, () => 0, () => 0);

  const data = useMemo(() => {
    if (!mounted) return null;
    return buildSocialRelationships();
  }, [mounted]);

  if (!mounted || !data) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5">
      <h2 className="font-bold">친구 관계</h2>
      <p className="mt-1 text-sm text-muted-foreground">{data.weeklyHeadline}</p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">라이벌</p>
        <ul className="mt-2 space-y-2">
          {data.rivals.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-sm">
              <span>
                {r.nickname} <span className="text-muted-foreground">Lv.{r.level}</span>
              </span>
              <span className="tabular-nums text-amber-400">
                {r.weeklyWins}승 {r.weeklyLosses}패
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">자주 같이 하는 친구</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {data.coPlayFriends.map((f) => (
            <span
              key={f.id}
              className={`rounded-full border px-3 py-1 text-xs ${
                f.online ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10"
              }`}
            >
              {f.online ? "● " : ""}{f.nickname}
            </span>
          ))}
        </div>
      </div>

      <Link
        href="/community#challenge"
        className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
      >
        도전장 보내기 →
      </Link>
    </section>
  );
}
