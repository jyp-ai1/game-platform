"use client";

import { useCallback, useEffect, useState } from "react";

import {
  FEEDBACK_STATUSES,
  FEEDBACK_TYPE_LABELS,
  type FeedbackStatus,
} from "@/lib/game-feedback-types";
import type { FeedbackDashboardData, RepeatPattern } from "@/lib/feedback-intelligence";
import { formatGameLabel } from "@/lib/feedback-intelligence";
import type { FeedbackWorkOrder } from "@/lib/feedback-work-orders";
import type { GameComment } from "@/lib/supabase/game-comments";

type DashboardResponse = {
  ok: boolean;
  dashboard?: FeedbackDashboardData;
  workOrders?: FeedbackWorkOrder[];
  error?: string;
};

export function FeedbackOpsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<FeedbackDashboardData | null>(null);
  const [workOrders, setWorkOrders] = useState<FeedbackWorkOrder[]>([]);
  const [items, setItems] = useState<GameComment[]>([]);
  const [selected, setSelected] = useState<GameComment | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [dashRes, itemsRes] = await Promise.all([
        fetch("/api/admin/feedback/dashboard"),
        fetch("/api/admin/feedback/items?limit=100"),
      ]);
      const dashJson = (await dashRes.json()) as DashboardResponse;
      const itemsJson = (await itemsRes.json()) as { ok: boolean; items?: GameComment[] };

      if (!dashJson.ok || !dashJson.dashboard) {
        setError(dashJson.error ?? "Dashboard load failed");
        return;
      }
      setDashboard(dashJson.dashboard);
      setWorkOrders(dashJson.workOrders ?? []);
      setItems(itemsJson.items ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateItemStatus(id: string, status: FeedbackStatus) {
    const res = await fetch(`/api/admin/feedback/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = (await res.json()) as { ok: boolean; comment?: GameComment };
    if (json.ok && json.comment) {
      setItems((prev) => prev.map((i) => (i.id === id ? json.comment! : i)));
      if (selected?.id === id) setSelected(json.comment);
      await load();
    }
  }

  async function createWorkOrderFromPattern(pattern: RepeatPattern) {
    setCreating(pattern.normalizedKey);
    try {
      const res = await fetch("/api/admin/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameSlug: pattern.gameSlug,
          feedbackType: pattern.feedbackType,
          problem: pattern.sampleContent,
          priority: pattern.suggestedPriority,
          evidenceFeedbackIds: pattern.feedbackIds,
          sampleContent: pattern.sampleContent,
          patternKey: pattern.normalizedKey,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        alert(json.error ?? "Work Order 생성 실패");
        return;
      }
      await load();
    } finally {
      setCreating(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading feedback ops…</p>;
  }

  if (error || !dashboard) {
    return <p className="text-sm text-amber-300">{error ?? "No data"}</p>;
  }

  return (
    <div className="space-y-8" data-testid="feedback-ops-dashboard">
      <header>
        <h1 className="text-2xl font-bold">Feedback Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          피드백 → 패턴 → Work Order · AI 자동 수정/배포 없음 · Territory War 제외 ·{" "}
          <span className="text-primary">REAL_PLAYER만 표시 (QA/Automation 제외)</span>
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="전체 feedback" value={dashboard.total} />
        <StatCard label="오늘 신규" value={dashboard.todayNew} />
        <StatCard label="status NEW" value={dashboard.newStatusCount} />
      </section>

      <section className="overflow-x-auto rounded-2xl border border-white/10">
        <h2 className="border-b border-white/10 px-4 py-3 text-sm font-semibold">게임별</h2>
        <table className="w-full min-w-[640px] text-sm" data-testid="feedback-game-table">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Game</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">NEW</th>
              <th className="px-4 py-2">Bug</th>
              <th className="px-4 py-2">Mobile</th>
              <th className="px-4 py-2">Fun</th>
              <th className="px-4 py-2">Idea</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.games.map((g) => (
              <tr key={g.gameSlug} className="border-t border-white/5">
                <td className="px-4 py-2 font-medium">{formatGameLabel(g.gameSlug)}</td>
                <td className="px-4 py-2">{g.total}</td>
                <td className="px-4 py-2">{g.newCount}</td>
                <td className="px-4 py-2">{g.bug}</td>
                <td className="px-4 py-2">{g.mobile}</td>
                <td className="px-4 py-2">{g.fun}</td>
                <td className="px-4 py-2">{g.idea}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-white/10">
        <h2 className="border-b border-white/10 px-4 py-3 text-sm font-semibold">
          Daily Operations (최근 7일 UTC)
        </h2>
        <table className="w-full min-w-[520px] text-sm" data-testid="feedback-daily-table">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2">DATE</th>
              <th className="px-4 py-2">BUG</th>
              <th className="px-4 py-2">MOBILE</th>
              <th className="px-4 py-2">FUN</th>
              <th className="px-4 py-2">IDEA</th>
              <th className="px-4 py-2">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.dailyLast7.map((d) => (
              <tr key={d.date} className="border-t border-white/5">
                <td className="px-4 py-2">{d.displayDate}</td>
                <td className="px-4 py-2">{d.bug}</td>
                <td className="px-4 py-2">{d.mobile}</td>
                <td className="px-4 py-2">{d.fun}</td>
                <td className="px-4 py-2">{d.idea}</td>
                <td className="px-4 py-2 font-medium">{d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">반복 패턴 (normalized match · CPO 확인)</h2>
        {dashboard.patterns.length === 0 ? (
          <p className="text-xs text-muted-foreground">반복 패턴 없음 (min 2건)</p>
        ) : (
          <ul className="space-y-3">
            {dashboard.patterns.slice(0, 12).map((p) => (
              <li
                key={p.normalizedKey}
                className="rounded-xl border border-white/10 bg-card/40 p-4"
                data-testid="feedback-pattern"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-primary">
                      {formatGameLabel(p.gameSlug)} / {FEEDBACK_TYPE_LABELS[p.feedbackType].label}{" "}
                      · {p.suggestedPriority} 제안
                    </p>
                    <p className="mt-2 text-sm">&ldquo;{p.sampleContent}&rdquo;</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      반복 {p.count}건 · 최근 {new Date(p.latestAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    disabled={creating === p.normalizedKey}
                    data-testid="create-work-order-btn"
                    onClick={() => void createWorkOrderFromPattern(p)}
                  >
                    {creating === p.normalizedKey ? "Creating…" : "Work Order 후보 만들기"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10">
          <h2 className="border-b border-white/10 px-4 py-3 text-sm font-semibold">
            Feedback 목록 (원문)
          </h2>
          <ul className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {items.slice(0, 50).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-white/5 ${
                    selected?.id === item.id ? "bg-primary/10" : ""
                  }`}
                  onClick={() => setSelected(item)}
                  data-testid="feedback-list-item"
                >
                  <span className="text-xs text-muted-foreground">
                    {formatGameLabel(item.gameSlug)}{" "}
                    {FEEDBACK_TYPE_LABELS[item.feedbackType].emoji} · {item.status}
                  </span>
                  <p className="mt-1 line-clamp-2">{item.content}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 p-4" data-testid="feedback-detail">
          <h2 className="text-sm font-semibold">Feedback Detail</h2>
          {selected ? (
            <div className="mt-3 space-y-3 text-sm">
              <Row label="Game" value={formatGameLabel(selected.gameSlug)} />
              <Row label="Type" value={FEEDBACK_TYPE_LABELS[selected.feedbackType].label} />
              <Row label="Author" value={selected.author} />
              <Row label="Created" value={new Date(selected.createdAt).toLocaleString()} />
              <Row label="Status" value={selected.status} />
              {selected.releaseVersion ? (
                <Row label="Release" value={selected.releaseVersion} />
              ) : null}
              {selected.workOrderId ? (
                <Row label="Work Order" value={selected.workOrderId} />
              ) : null}
              <div>
                <p className="text-xs text-muted-foreground">Content (원문)</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-white/10 bg-background/40 p-3">
                  {selected.content}
                </p>
              </div>
              <label className="block text-xs text-muted-foreground">
                Status 변경
                <select
                  className="mt-1 w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
                  value={selected.status}
                  onChange={(e) =>
                    void updateItemStatus(selected.id, e.target.value as FeedbackStatus)
                  }
                  data-testid="feedback-status-select"
                >
                  {FEEDBACK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">목록에서 feedback을 선택하세요.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10">
        <h2 className="border-b border-white/10 px-4 py-3 text-sm font-semibold">
          Work Orders (CPO Review)
        </h2>
        {workOrders.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">Work Order 없음</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {workOrders.map((wo) => (
              <li key={wo.id} className="px-4 py-3 text-sm" data-testid="work-order-item">
                <p className="font-medium">
                  {wo.priority} · {formatGameLabel(wo.gameSlug)} ·{" "}
                  {FEEDBACK_TYPE_LABELS[wo.feedbackType].label} · {wo.status}
                </p>
                <p className="mt-1">{wo.problem}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Evidence: {wo.evidenceCount} feedbacks
                </p>
                {wo.acceptanceCriteria ? (
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-background/40 p-2 text-xs text-muted-foreground">
                    {wo.acceptanceCriteria}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
