import { Container } from "@game-platform/ui";
import { MP_AI_DIFFICULTIES, DEFAULT_MP_AI_DIFFICULTY } from "@game-platform/game-sdk";
import type { Game, GameStatus } from "@game-platform/shared";
import Link from "next/link";

import { GameDetailComments, GameDetailShare } from "@/components/game-detail-extras";
import { GameDetailFriendRecord } from "@/components/game-detail-friend-record";
import { GameDetailHero } from "@/components/game-detail-hero";
import { GameDetailRecentStrip } from "@/components/game-detail-recent-strip";
import { GameDetailGlobalRanking } from "@/components/game-detail-global-ranking";
import { GameDetailPatchNotes } from "@/components/game-detail-patch-notes";
import { GameStatusBlock } from "@/components/game-status-block";
import { MpWorldPlayLink } from "@/components/snake-world-play-link";
import { playHrefForCatalogSlug } from "@/lib/game-catalog";

function shortDescription(game: Game, slug: string): string {
  if (slug === "snake") {
    return "다른 플레이어와 경쟁하며 가장 긴 뱀이 되어보세요. 보석을 먹고 성장하며 살아남으세요.";
  }
  if (slug === "agar") {
    return "세포를 키우고 분열·방출로 싸우세요. 작은 세포를 먹고, 큰 세포는 피하세요.";
  }
  if (slug === "bomber") {
    return "폭탄을 설치하고 장애물을 뚫어 최후의 1인이 되세요. 라운드마다 난이도가 올라갑니다.";
  }
  const raw = game.description?.trim();
  if (!raw) return "방향키와 버튼으로 플레이하세요.";
  const first = raw.split(/[.!?]\s/)[0] ?? raw;
  return first.length > 120 ? `${first.slice(0, 117)}…` : first;
}

function isMultiplayerSlug(slug: string): boolean {
  return slug === "snake" || slug === "agar" || slug === "bomber";
}

function creatorStub(slug: string): string {
  if (slug === "snake") return "Replay Studio";
  if (slug === "agar") return "Replay Studio";
  if (slug === "bomber") return "Replay Studio";
  return "Community";
}

function popularityLabel(game: Game, slug: string): string {
  const plays = game.playCount ?? 0;
  if (isMultiplayerSlug(slug)) {
    return `🔥 LIVE · ${(plays > 0 ? plays : 12_400).toLocaleString()} plays`;
  }
  return `Play count · ${plays.toLocaleString()}`;
}

export function GameDetailTemplate({
  game,
  slug,
  isPlayable,
  rankingEnabled = true,
  related: _related = [],
  allGames = [],
}: {
  game: Game;
  slug: string;
  isPlayable: boolean;
  rankingEnabled?: boolean;
  related?: Game[];
  allGames?: Game[];
}) {
  const desc = shortDescription(game, slug);
  const playHref = playHrefForCatalogSlug(slug);
  const mp = isMultiplayerSlug(slug);

  return (
    <main className="flex flex-1 flex-col" data-testid="game-detail-page">
      <Container className="max-w-3xl space-y-5 py-5 sm:py-6">
        <GameDetailHero game={game} />

        {isPlayable ? (
          <>
            <section className="space-y-4 text-center" data-testid="game-detail-meta">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {mp ? (
                  <span
                    data-testid="game-detail-mp-badge"
                    className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-200"
                  >
                    👥 Multiplayer
                  </span>
                ) : null}
                <span
                  data-testid="game-detail-creator"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground"
                >
                  Creator · {creatorStub(slug)}
                </span>
              </div>

              <p
                data-testid="game-detail-description"
                className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground"
              >
                {desc}
              </p>
              <p
                data-testid="game-detail-popularity"
                className="text-xs text-muted-foreground tabular-nums"
              >
                {popularityLabel(game, slug)}
              </p>

              {mp ? (
                <div
                  className="flex flex-wrap items-center justify-center gap-2"
                  data-testid="game-detail-difficulty"
                  aria-label="Difficulty"
                >
                  {MP_AI_DIFFICULTIES.map((d) => {
                    const isDefault = d.id === DEFAULT_MP_AI_DIFFICULTY;
                    return (
                      <span
                        key={d.id}
                        data-testid={`game-detail-diff-${d.id}`}
                        className={
                          isDefault
                            ? "inline-flex items-center rounded-full border border-cyan-400/50 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-100"
                            : "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground"
                        }
                      >
                        <span aria-hidden>{d.emoji}</span> {d.label}
                        {isDefault ? (
                          <span className="ml-1 text-[10px] font-normal text-cyan-200/80">
                            default
                          </span>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
              ) : null}

              <div className="flex flex-col items-center gap-2">
                {mp && (slug === "snake" || slug === "agar" || slug === "bomber") ? (
                  <MpWorldPlayLink
                    slug={slug as "snake" | "agar" | "bomber"}
                    data-testid="game-detail-play-cta"
                    className="inline-flex min-h-12 min-w-[220px] items-center justify-center rounded-xl bg-primary px-10 py-3 text-base font-bold text-primary-foreground shadow-lg transition hover:brightness-110"
                  >
                    WORLD PLAY
                  </MpWorldPlayLink>
                ) : (
                  <Link
                    href={playHref}
                    data-testid="game-detail-play-cta"
                    className="inline-flex min-h-12 min-w-[220px] items-center justify-center rounded-xl bg-primary px-10 py-3 text-base font-bold text-primary-foreground shadow-lg transition hover:brightness-110"
                  >
                    PLAY
                  </Link>
                )}
                {mp ? (
                  <p className="text-xs text-muted-foreground">
                    Character · Color · Difficulty → ENTER WORLD
                  </p>
                ) : null}
              </div>

              <div className="mx-auto w-full max-w-sm" data-testid="game-detail-share">
                <GameDetailShare gameSlug={slug} title={game.title} />
              </div>
            </section>

            <hr className="border-white/10" />

            {allGames.length > 0 ? (
              <GameDetailRecentStrip games={allGames} currentSlug={slug} />
            ) : null}

            {rankingEnabled ? <GameDetailGlobalRanking gameSlug={slug} /> : null}
            <GameDetailFriendRecord gameSlug={slug} />
            <GameDetailComments gameSlug={slug} />
            <GameDetailPatchNotes game={game} />
          </>
        ) : game.status !== "ACTIVE" ? (
          <GameStatusBlock status={game.status as Exclude<GameStatus, "ACTIVE">} />
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </Container>
    </main>
  );
}
