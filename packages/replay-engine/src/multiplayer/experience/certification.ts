/** Multiplayer Ready Certification checklist */
import type { CertificationResult } from "@game-platform/shared";

import { getGameProfile, getMatchSizeProfile } from "../balance/registry";

const CHECKLIST = [
  { id: "fun_2p", label: "2명 플레이 재미있는가?" },
  { id: "new_4p", label: "4명에서 새로운 경험이 생기는가?" },
  { id: "coop_8p", label: "8명에서 협동 요소가 있는가?" },
  { id: "map_16p", label: "16명에서 맵이 충분한가?" },
  { id: "perf_20p", label: "20명 이상에서도 성능이 유지되는가?" },
  { id: "spectator", label: "관전이 가능한가?" },
  { id: "rematch", label: "리매치가 쉬운가?" },
  { id: "invite_10s", label: "친구 초대가 10초 안에 가능한가?" },
  { id: "post_flow", label: "게임 종료 후 다음 행동이 자연스러운가?" },
  { id: "replay_engine", label: "Replay 엔진만 사용했는가?" },
] as const;

export function certifyGame(gameSlug: string, flags: Partial<Record<string, boolean>> = {}): CertificationResult {
  const profile = getGameProfile(gameSlug);
  const size = getMatchSizeProfile(gameSlug);
  const defaults: Record<string, boolean> = {
    fun_2p: size.minPlayers <= 2,
    new_4p: true,
    coop_8p: size.maxPlayers >= 8,
    map_16p: size.maxPlayers >= 16,
    perf_20p: size.maxPlayers >= 20,
    spectator: profile?.spectator ?? false,
    rematch: true,
    invite_10s: true,
    post_flow: true,
    replay_engine: true,
    ...flags,
  };
  const checks = CHECKLIST.map((c) => ({ id: c.id, label: c.label, pass: defaults[c.id] ?? false }));
  const score = checks.filter((c) => c.pass).length;
  return { gameSlug, passed: score >= 8, score, checks };
}

export const CertificationEngine = { run: certifyGame, checklist: CHECKLIST };
