"use client";

import Link from "next/link";

import { GAME_TEMPLATES } from "@/lib/creator/template-marketplace";

export function TemplateMarketplacePanel() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Template Marketplace</h1>
        <p className="text-sm text-muted-foreground">템플릿 복제 → 색만 변경 → 새 게임 → 업로드</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_TEMPLATES.map((t) => (
          <Link
            key={t.id}
            href={`/studio/upload?template=${t.id}`}
            className="rounded-2xl border border-white/10 bg-card/50 p-5 transition hover:border-violet-500/30"
          >
            <p className="font-semibold">{t.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {t.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{tag}</span>
              ))}
            </div>
            <p className="mt-3 text-xs text-violet-400">
              {t.downloads > 0 ? `${t.downloads} clones · ${t.estimatedTime}` : "Start blank"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
