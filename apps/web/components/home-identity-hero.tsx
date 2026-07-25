"use client";

import {
  getLastNickname,
  getLevelProgress,
  getServerLevelProgressSnapshot,
  getServerNicknameSnapshot,
  subscribeEngagement,
  subscribeNickname,
} from "@game-platform/game-sdk";
import { Button, Container } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { siteConfig } from "@/lib/site-config";
import { useMounted } from "@/lib/use-mounted";

export function HomeIdentityHero() {
  const mounted = useMounted();
  const nickname = useSyncExternalStore(
    subscribeNickname,
    getLastNickname,
    getServerNicknameSnapshot
  );
  const level = useSyncExternalStore(
    subscribeEngagement,
    getLevelProgress,
    getServerLevelProgressSnapshot
  );

  const greeting = nickname ? `${nickname}님, 다시 플레이할 시간` : "내 게임 생활을 시작하세요";

  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-background py-10 sm:py-14">
      <Container className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Re:Play 2.0 · Game Life Platform
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{greeting}</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {siteConfig.subTagline}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {mounted ? (
            <div className="rounded-xl border bg-card/80 px-4 py-3 text-sm backdrop-blur">
              <p className="text-xs text-muted-foreground">내 레벨</p>
              <p className="text-xl font-bold tabular-nums">Lv.{level.level}</p>
            </div>
          ) : null}
          <Button nativeButton={false} render={<Link href="/journey">내 여정 보기</Link>} />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/games">게임 탐색</Link>}
          />
        </div>
      </Container>
    </section>
  );
}
