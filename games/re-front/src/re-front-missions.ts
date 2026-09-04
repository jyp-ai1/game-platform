/** Re:Front P0 — first-3-minute mission tracker (client-side). */

export type RfMissionPhase =
  | "how-to-play"
  | "expand"
  | "grow"
  | "attack-prompt"
  | "attack"
  | "counter"
  | "free";

export type RfMissionState = {
  phase: RfMissionPhase;
  expandCount: number;
  attackCount: number;
  counterSeen: boolean;
  defended: boolean;
};

export const RF_EXPAND_GOAL = 3;

export function createMissionState(): RfMissionState {
  return {
    phase: "how-to-play",
    expandCount: 0,
    attackCount: 0,
    counterSeen: false,
    defended: false,
  };
}

export function missionObjective(state: RfMissionState): { title: string; detail: string; done: boolean } {
  switch (state.phase) {
    case "how-to-play":
      return { title: "HOW TO PLAY", detail: "Read the guide, then start expanding.", done: false };
    case "expand":
      return {
        title: "MISSION 1",
        detail: `Expand ${RF_EXPAND_GOAL} neutral lands (${state.expandCount}/${RF_EXPAND_GOAL})`,
        done: state.expandCount >= RF_EXPAND_GOAL,
      };
    case "grow":
      return {
        title: "MISSION 1 ✓",
        detail: "Your empire is growing. Gold & Population rise with territory.",
        done: true,
      };
    case "attack-prompt":
      return { title: "MISSION 2", detail: "Attack a nearby enemy kingdom.", done: false };
    case "attack":
      return {
        title: "MISSION 2",
        detail: state.attackCount > 0 ? "First strike complete!" : "Select enemy land → ATTACK",
        done: state.attackCount > 0,
      };
    case "counter":
      return {
        title: "MISSION 3",
        detail: state.defended ? "Border held!" : "Enemy counter-attack! DEFEND or fight back.",
        done: state.defended,
      };
    case "free":
      return { title: "EMPIRE MODE", detail: "Expand, attack, build — reach 70% world control.", done: false };
  }
}

export function advanceMissionAfterExpand(state: RfMissionState): RfMissionState {
  if (state.phase !== "expand") return state;
  const expandCount = state.expandCount + 1;
  if (expandCount >= RF_EXPAND_GOAL) {
    return { ...state, expandCount, phase: "grow" };
  }
  return { ...state, expandCount };
}

export function advanceMissionAfterGrowTimer(state: RfMissionState): RfMissionState {
  if (state.phase !== "grow") return state;
  return { ...state, phase: "attack-prompt" };
}

export function advanceMissionAfterAttack(state: RfMissionState): RfMissionState {
  if (state.phase === "attack-prompt" || state.phase === "attack") {
    return { ...state, phase: "counter", attackCount: state.attackCount + 1 };
  }
  if (state.phase === "counter" && state.attackCount === 0) {
    return { ...state, attackCount: 1 };
  }
  return { ...state, attackCount: state.attackCount + 1 };
}

export function advanceMissionAfterDefend(state: RfMissionState): RfMissionState {
  if (state.phase !== "counter") return state;
  return { ...state, defended: true, phase: "free" };
}

export function advanceMissionAfterCounterSeen(state: RfMissionState): RfMissionState {
  if (state.phase !== "counter" || state.counterSeen) return state;
  return { ...state, counterSeen: true };
}
