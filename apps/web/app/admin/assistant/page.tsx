import Link from "next/link";

import { OpsAssistantPanel } from "@/components/admin/ops-assistant-panel";
import { fetchDashboardKpisExtended } from "@/lib/supabase/admin-server";
import { isAiAssistantConfigured } from "@/lib/ops/assistant-generate";
import { fetchOpsErrorSummary, fetchOpsRealtimeStats } from "@/lib/supabase/ops-server";

export const metadata = { title: "AI Assistant" };

function insight(text: string, severity: "info" | "warn" = "info") {
  return { text, severity };
}

export default async function AdminAssistantPage() {
  const [realtime, errors, kpis, aiConfigured] = await Promise.all([
    fetchOpsRealtimeStats(),
    fetchOpsErrorSummary(24),
    fetchDashboardKpisExtended("today"),
    Promise.resolve(isAiAssistantConfigured()),
  ]);

  const insights: Array<{ text: string; severity: "info" | "warn" }> = [];

  if (realtime) {
    if (realtime.errors_1h > 5) {
      insights.push(
        insight(
          `최근 1시간 에러 ${realtime.errors_1h}건 — Error Center에서 게임별 원인을 확인하세요.`,
          "warn"
        )
      );
    }
    if (realtime.online_users === 0 && realtime.today_plays > 0) {
      insights.push(
        insight("현재 접속자는 없지만 오늘 플레이 기록이 있습니다. 피크 시간대 배너를 검토해 보세요.")
      );
    }
    if (realtime.active_games.length > 0) {
      const top = realtime.active_games[0]!;
      insights.push(
        insight(`지금 가장 많이 플레이되는 게임: ${top.game_slug} (${top.plays} sessions/5min)`)
      );
    }
  }

  if (errors && errors.total > 0) {
    const topType = Object.entries(errors.by_type).sort((a, b) => b[1] - a[1])[0];
    if (topType) {
      insights.push(
        insight(`24h 에러 유형 1위: ${topType[0]} (${topType[1]}건)`, "warn")
      );
    }
  }

  if (kpis) {
    if (kpis.dau > 0 && kpis.returning_users / Math.max(kpis.dau, 1) < 0.3) {
      insights.push(
        insight("복귀 유저 비율이 낮습니다. 공지/이벤트로 재방문 유도를 검토하세요.", "warn")
      );
    }
    if (kpis.stickiness && kpis.stickiness < 10) {
      insights.push(insight(`Stickiness ${kpis.stickiness}% — DAU/MAU 개선 여지가 있습니다.`));
    }
  }

  if (!insights.length) {
    insights.push(insight("현재 특이 이상 징후가 없습니다. Monitoring 대시보드를 주기적으로 확인하세요."));
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">AI Operation Assistant</h1>
        <p className="text-sm text-muted-foreground">
          운영 데이터 기반 인사이트 · 공지/배너/이벤트 초안 생성
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">자동 감지 (Rules)</h2>
        {insights.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 text-sm ${
              item.severity === "warn"
                ? "border-amber-500/40 bg-amber-500/10"
                : "bg-card"
            }`}
          >
            {item.text}
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-4 font-semibold">AI 생성 도구</h2>
        <OpsAssistantPanel aiConfigured={aiConfigured} />
      </section>

      <section className="grid gap-4 sm:grid-cols-3 print:hidden">
        <Link href="/admin/monitoring" className="rounded-xl border bg-card p-4 hover:bg-muted/50">
          Monitoring →
        </Link>
        <Link href="/admin/errors" className="rounded-xl border bg-card p-4 hover:bg-muted/50">
          Error Center →
        </Link>
        <Link href="/admin/reports" className="rounded-xl border bg-card p-4 hover:bg-muted/50">
          Reports →
        </Link>
      </section>
    </div>
  );
}
