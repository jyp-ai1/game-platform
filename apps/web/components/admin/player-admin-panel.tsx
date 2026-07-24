"use client";

import { useState, useTransition } from "react";

import {
  suspendPlayer,
  unsuspendPlayer,
  updatePlayerMemo,
} from "@/app/admin/players/actions";
import type { PlayerCrmDetail } from "@/lib/supabase/ops-server";

export function PlayerAdminPanel({ detail }: { detail: PlayerCrmDetail }) {
  const player = detail.player;
  const [memo, setMemo] = useState(player?.admin_memo ?? "");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!player) return null;

  function run(action: () => Promise<void>) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage("저장되었습니다.");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">운영 액션</h2>

      <div>
        <label className="text-sm text-muted-foreground">Admin Memo</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => updatePlayerMemo(player.device_id, memo))}
          className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          메모 저장
        </button>
      </div>

      {player.status === "active" ? (
        <div>
          <label className="text-sm text-muted-foreground">정지 사유</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder="스팸, 어뷰징 등"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => suspendPlayer(player.device_id, reason))}
            className="mt-2 rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
          >
            플레이어 정지
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-destructive">
            정지됨 · {player.suspended_reason ?? "사유 없음"}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => unsuspendPlayer(player.device_id))}
            className="mt-2 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            정지 해제
          </button>
        </div>
      )}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
