/** Team Mode — party, guild, 1v1..5v5 */
import type { Team, TeamMode } from "@game-platform/shared";

const teams = new Map<string, Team[]>();

function teamId(mode: TeamMode, index: number): string {
  return `${mode}-team-${index}`;
}

export function createTeams(
  roomCode: string,
  mode: TeamMode,
  playerIds: string[],
  nicknames: Record<string, string> = {}
): Team[] {
  if (mode === "ffa") {
    teams.set(roomCode, []);
    return [];
  }

  const sizeMap: Record<TeamMode, number> = {
    ffa: 1,
    "1v1": 1,
    "2v2": 2,
    "3v3": 3,
    "5v5": 5,
    party: Math.ceil(playerIds.length / 2),
    guild: Math.ceil(playerIds.length / 2),
  };
  const perTeam = sizeMap[mode];
  const teamCount = mode === "1v1" ? 2 : Math.max(2, Math.ceil(playerIds.length / perTeam));
  const result: Team[] = [];

  for (let t = 0; t < teamCount; t++) {
    result.push({
      id: teamId(mode, t),
      name: t === 0 ? "Alpha" : t === 1 ? "Beta" : `Team ${t + 1}`,
      mode,
      memberIds: [],
      score: 0,
    });
  }

  playerIds.forEach((id, i) => {
    result[i % result.length]!.memberIds.push(id);
  });

  teams.set(roomCode, result);
  return result;
}

export function joinTeam(roomCode: string, teamId: string, deviceId: string): Team[] {
  const list = teams.get(roomCode) ?? [];
  for (const t of list) {
    t.memberIds = t.memberIds.filter((id) => id !== deviceId);
  }
  const target = list.find((t) => t.id === teamId);
  if (target && !target.memberIds.includes(deviceId)) target.memberIds.push(deviceId);
  teams.set(roomCode, list);
  return list;
}

export function scoreTeam(roomCode: string, deviceId: string, points: number): Team[] {
  const list = teams.get(roomCode) ?? [];
  for (const t of list) {
    if (t.memberIds.includes(deviceId)) t.score += points;
  }
  return list;
}

export function getTeams(roomCode: string): Team[] {
  return teams.get(roomCode) ?? [];
}

export const TeamEngine = { create: createTeams, join: joinTeam, score: scoreTeam, get: getTeams };
