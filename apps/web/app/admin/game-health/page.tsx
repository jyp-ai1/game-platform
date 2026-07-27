import Link from "next/link";

import { GameHealthBoard } from "@/components/admin/game-health-board";
import { getGameHealthSnapshot } from "@/lib/game-health-data";

export const metadata = { title: "Game Health — Operator Center" };

export default function AdminGameHealthPage() {
  const snapshot = getGameHealthSnapshot();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Game Health Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            30초 안에 망가진 게임 확인 · QA 리포트{" "}
            {snapshot.reportDate ? snapshot.reportDate : "없음"}
          </p>
        </div>
        <Link
          href="/admin/health"
          className="text-sm text-primary hover:underline"
        >
          Operator Health →
        </Link>
      </div>

      <GameHealthBoard snapshot={snapshot} />

      <section className="rounded-2xl border border-white/10 bg-card/40 p-5 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Release Gate (Sprint 13.6)</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Rule PASS — <code className="text-xs">docs/game-rules/*.md</code></li>
          <li>Stage PASS</li>
          <li>Retry PASS</li>
          <li>Save PASS</li>
          <li>QA PASS — full-loop</li>
          <li>Preview 배포</li>
          <li>PM 실기기 검증</li>
          <li>Merge Production</li>
        </ol>
      </section>
    </div>
  );
}
