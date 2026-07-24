export type PlatformFlags = {
  save: boolean;
  ranking: boolean;
  weeklyMission: boolean;
};

const DEFAULT_FLAGS: PlatformFlags = {
  save: true,
  ranking: true,
  weeklyMission: true,
};

let flags: PlatformFlags = { ...DEFAULT_FLAGS };

export function configurePlatformFlags(partial: Partial<PlatformFlags>): void {
  flags = { ...flags, ...partial };
}

export function getPlatformFlags(): PlatformFlags {
  return flags;
}

export function isSaveEnabled(): boolean {
  return flags.save;
}

export function isRankingEnabled(): boolean {
  return flags.ranking;
}

export function isWeeklyMissionEnabled(): boolean {
  return flags.weeklyMission;
}
