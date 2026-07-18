"use client";

import { Button } from "@game-platform/ui";
import { useState } from "react";

interface NicknameModalProps {
  score: number;
  defaultNickname: string;
  onSubmit: (nickname: string) => void;
  onDismiss: () => void;
}

export function NicknameModal({
  score,
  defaultNickname,
  onSubmit,
  onDismiss,
}: NicknameModalProps) {
  const [nickname, setNickname] = useState(defaultNickname);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs rounded-xl border bg-background p-6 text-center shadow-lg">
        <p className="text-lg font-semibold">🎉 최고 기록!</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {score.toLocaleString()}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          닉네임을 입력하세요
        </p>

        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(nickname);
          }}
        >
          <input
            autoFocus
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={20}
            placeholder="닉네임"
            aria-label="닉네임 입력"
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <Button type="submit">등록하기</Button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-muted-foreground underline"
          >
            나중에
          </button>
        </form>
      </div>
    </div>
  );
}
