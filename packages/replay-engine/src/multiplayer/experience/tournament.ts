/** Tournament Engine — hourly auto brackets */
import type { TournamentSlot } from "@game-platform/shared";

function nextHour(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}

export function getUpcomingTournaments(now = new Date()): TournamentSlot[] {
  const slots: TournamentSlot[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + i);
    const max = i === 0 ? 8 : i === 1 ? 16 : 32;
    slots.push({
      id: `t-${d.getTime()}`,
      startsAt: d.toISOString(),
      maxPlayers: max,
      enrolled: Math.floor(Math.random() * max * 0.6),
      status: i === 0 ? "live" : "open",
    });
  }
  return slots;
}

export function enrollTournament(slotId: string): { ok: boolean; slotId: string } {
  return { ok: true, slotId };
}

export const TournamentEngine = {
  upcoming: getUpcomingTournaments,
  enroll: enrollTournament,
};
