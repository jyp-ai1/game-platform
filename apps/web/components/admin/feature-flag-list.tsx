"use client";

import { useTransition } from "react";

import { toggleFeatureFlag } from "@/app/admin/flags/actions";
import type { FeatureFlagRow } from "@/lib/supabase/ops-server";

export function FeatureFlagList({ flags }: { flags: FeatureFlagRow[] }) {
  const [pending, startTransition] = useTransition();

  function onToggle(key: string, enabled: boolean) {
    startTransition(async () => {
      await toggleFeatureFlag(key, enabled);
    });
  }

  if (!flags.length) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
        `0018_sprint12.sql` 마이그레이션 적용 후 Feature Flag가 활성화됩니다.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {flags.map((flag) => (
        <li
          key={flag.key}
          className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4"
        >
          <div>
            <p className="font-medium">{flag.label}</p>
            <p className="text-sm text-muted-foreground">{flag.description}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{flag.key}</p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => onToggle(flag.key, !flag.enabled)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              flag.enabled
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {flag.enabled ? "ON" : "OFF"}
          </button>
        </li>
      ))}
    </ul>
  );
}
