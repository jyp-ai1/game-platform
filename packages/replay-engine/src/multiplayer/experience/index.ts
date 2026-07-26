/**
 * Flagship Experience Engine — why Replay beats Slither.io
 */
export { rollWorldEvent, expireEvents, eventLabel } from "./events";
export { TeamEngine, createTeams, joinTeam, scoreTeam, getTeams } from "./team";
export { createObjective, progressObjective, pickObjectiveForPlayers } from "./objectives";
export { PowerUpEngine, grantPowerUp, isPowerUpActive, rollTreasurePowerUp } from "./powerups";
export { getCurrentSeason, SEASON_PALETTE, seasonModifiers } from "./seasons";
export { DirectorEngine, runDirector } from "./director";
export { MomentsEngine, captureMoment, getRecentMoments, MOMENT_LABELS } from "./moments";
export { SpectatorEngine, createSpectatorState, resolveSpectatorTarget } from "./spectator";
export { TournamentEngine, getUpcomingTournaments, enrollTournament } from "./tournament";
export { ProgressionEngine, SNAKE_STAGES, getStageForScore } from "./progression";
export { UxEngine, UX_TIERS, getUxTier } from "./ux-tiers";
export { CertificationEngine, certifyGame } from "./certification";

import { rollWorldEvent, expireEvents, eventLabel } from "./events";
import { TeamEngine } from "./team";
import { createObjective, progressObjective, pickObjectiveForPlayers } from "./objectives";
import { PowerUpEngine } from "./powerups";
import { getCurrentSeason, SEASON_PALETTE, seasonModifiers } from "./seasons";
import { DirectorEngine } from "./director";
import { MomentsEngine } from "./moments";
import { SpectatorEngine } from "./spectator";
import { TournamentEngine } from "./tournament";
import { ProgressionEngine } from "./progression";
import { UxEngine } from "./ux-tiers";
import { CertificationEngine } from "./certification";

export const ExperienceEngine = {
  events: { roll: rollWorldEvent, expire: expireEvents, label: eventLabel },
  team: TeamEngine,
  objectives: { create: createObjective, progress: progressObjective, pick: pickObjectiveForPlayers },
  powerups: PowerUpEngine,
  season: { current: getCurrentSeason, palette: SEASON_PALETTE, mods: seasonModifiers },
  director: DirectorEngine,
  moments: MomentsEngine,
  spectator: SpectatorEngine,
  tournament: TournamentEngine,
  progression: ProgressionEngine,
  ux: UxEngine,
  certify: CertificationEngine,
};
