/**
 * AI Daily Ops Summary — Today's Wins / Risks / Opportunities for /admin/os
 */
import { getEngineDoDProgress } from "@/lib/replay-os/layer-definitions";
import { buildAiOpsSummary } from "@/lib/ai-ops-summary";
import { getReleaseDashboardData } from "@/lib/get-release-dashboard";

export interface DailyOpsBrief {
  wins: string[];
  risks: string[];
  opportunities: string[];
  generatedAt: string;
}

export function buildDailyOpsBrief(): DailyOpsBrief {
  const ops = buildAiOpsSummary();
  const rc = getReleaseDashboardData();
  const engine = getEngineDoDProgress();

  const wins: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];

  if (ops.health === "good") wins.push("Replay Loop 안정 — 플레이 사이클 정상");
  if (rc.rc1Score >= 90) wins.push(`RC Score ${rc.rc1Score}% — release gate 양호`);
  wins.push(`Engine DoD ${engine.done}/${engine.total} — Runtime/Plugin/CLI 완료`);
  wins.push("Layer architecture + RFC/ADR 정착");

  if (engine.done < engine.total) {
    risks.push(`L2 Engine DoD 미완 ${engine.total - engine.done}项 — Multiplayer(cross-device) · AI Production`);
  }
  if (ops.health !== "good") risks.push(ops.headline);
  ops.bullets.filter((b) => b.includes("버그") || b.includes("실패")).forEach((b) => risks.push(b));

  opportunities.push("Flagship Snake.io — 친구 초대 → 실시간 → 재방문 루프");
  opportunities.push("Notification refresh on home — streak/mission/friend hooks");
  if (engine.done < engine.total) {
    opportunities.push("Cross-tab multiplayer bridge → Supabase Realtime (ADR-003)");
  }
  opportunities.push("Labs 실험 → Tournament / Ghost Replay 승격 검토");

  return {
    wins: wins.slice(0, 5),
    risks: risks.slice(0, 5),
    opportunities: opportunities.slice(0, 5),
    generatedAt: new Date().toISOString(),
  };
}
