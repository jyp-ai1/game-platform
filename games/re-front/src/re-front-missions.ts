/** Re:Front P0 — first-3-minute mission tracker (client-side). */

export type RfMissionPhase =
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
    phase: "expand",
    expandCount: 0,
    attackCount: 0,
    counterSeen: false,
    defended: false,
  };
}

export function missionObjective(state: RfMissionState): {
  title: string;
  detail: string;
  cta: string;
  done: boolean;
} {
  switch (state.phase) {
    case "expand":
      return {
        title: "🎯 MISSION 1",
        detail: `주변의 빈 땅 ${RF_EXPAND_GOAL}개를 차지하세요 (${state.expandCount}/${RF_EXPAND_GOAL})`,
        cta: "깜빡이는 땅을 누르고 EXPAND",
        done: state.expandCount >= RF_EXPAND_GOAL,
      };
    case "grow":
      return {
        title: "🌎 YOUR EMPIRE IS GROWING",
        detail: "땅이 늘어나면 Gold · Population · Troops가 함께 증가합니다.",
        cta: "잠시 후 적을 공격합니다…",
        done: true,
      };
    case "attack-prompt":
      return {
        title: "⚔️ MISSION 2",
        detail: "RED KINGDOM을 공격하세요. 빨간 땅을 선택하세요.",
        cta: "적 영토 클릭 → ATTACK",
        done: false,
      };
    case "attack":
      return {
        title: "⚔️ MISSION 2",
        detail: state.attackCount > 0 ? "첫 공격 완료!" : "적 영토를 선택하고 ATTACK (50% 추천)",
        cta: "ATTACK",
        done: state.attackCount > 0,
      };
    case "counter":
      return {
        title: "🚨 MISSION 3",
        detail: state.defended ? "국경 방어 성공!" : "RED KINGDOM이 반격합니다! DEFEND 또는 재공격",
        cta: state.defended ? "계속 확장하세요" : "DEFEND",
        done: state.defended,
      };
    case "free":
      return {
        title: "🌎 EMPIRE MODE",
        detail: "땅을 넓히고 적을 물리치세요. 70% 지배가 목표입니다.",
        cta: "EXPAND · ATTACK · DEFEND",
        done: false,
      };
  }
}

export function showAttackUi(phase: RfMissionPhase): boolean {
  return phase === "attack-prompt" || phase === "attack" || phase === "counter" || phase === "free";
}

export function showDefendUi(phase: RfMissionPhase): boolean {
  return phase === "counter" || phase === "free";
}

export function showBuildUi(phase: RfMissionPhase): boolean {
  return phase === "free";
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
  if (state.phase === "attack-prompt") {
    return { ...state, phase: "attack", attackCount: 1 };
  }
  if (state.phase === "attack") {
    return { ...state, phase: "counter", attackCount: state.attackCount + 1 };
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
