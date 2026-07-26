/** Party group missions — play together, earn together. */
import type { Party, PartyMissionProgress } from "@game-platform/shared";

const MISSION_DEFS = [
  { id: "co-play-5", title: "친구랑 5판", target: 5, reward: "Party Badge" },
  { id: "co-win-3", title: "같이 3승", target: 3, reward: "Party Coin" },
  { id: "daily-score", title: "오늘 100000점", target: 100_000, reward: "Party XP" },
] as const;

function defaultMissions(): PartyMissionProgress[] {
  return MISSION_DEFS.map((m) => ({
    missionId: m.id,
    current: 0,
    target: m.target,
    completed: false,
  }));
}

export function ensurePartyMissions(party: Party): Party {
  if (!party.missions?.length) party.missions = defaultMissions();
  return party;
}

export function getActivePartyMission(party: Party): PartyMissionProgress | null {
  ensurePartyMissions(party);
  return party.missions.find((m) => !m.completed) ?? null;
}

/** Advance missions after a match — returns updated party missions. */
export function advancePartyMissions(
  party: Party,
  ctx: { gameSlug: string; totalScore: number; won: boolean }
): PartyMissionProgress[] {
  ensurePartyMissions(party);
  for (const m of party.missions) {
    if (m.completed) continue;
    if (m.missionId === "co-play-5") m.current += 1;
    if (m.missionId === "co-win-3" && ctx.won) m.current += 1;
    if (m.missionId === "daily-score") m.current += ctx.totalScore;
    if (m.current >= m.target) m.completed = true;
  }
  return party.missions;
}

export function missionLabel(missionId: string): string {
  return MISSION_DEFS.find((m) => m.id === missionId)?.title ?? missionId;
}

export const PartyMissionEngine = {
  ensure: ensurePartyMissions,
  active: getActivePartyMission,
  advance: advancePartyMissions,
  label: missionLabel,
  defs: MISSION_DEFS,
};
