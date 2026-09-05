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
export const RF_VICTORY_GOAL_PCT = 70;

export function createMissionState(): RfMissionState {
  return {
    phase: "expand",
    expandCount: 0,
    attackCount: 0,
    counterSeen: false,
    defended: false,
  };
}

export type RfMissionObjective = {
  step: number;
  stepLabel: string;
  title: string;
  detail: string;
  cta: string;
  nextAction: string;
  done: boolean;
};

export function missionObjective(state: RfMissionState): RfMissionObjective {
  switch (state.phase) {
    case "expand":
      if (state.expandCount === 0) {
        return {
          step: 1,
          stepLabel: "STEP 1 — START",
          title: "내 영토",
          detail: `🟢 초록 = 내 땅 · 🟡 노랑 = 빈 땅 · 🔴 빨강 = 적 영토 · 목표: 영토 ${RF_VICTORY_GOAL_PCT}%`,
          cta: "내 초록 영토 주변을 확인하세요",
          nextAction: "🎯 NEXT: 노란 땅을 확장하세요",
          done: false,
        };
      }
      return {
        step: 2,
        stepLabel: "STEP 2 — FIRST EXPAND",
        title: "첫 번째 미션",
        detail: `🟡 노란 땅 ${RF_EXPAND_GOAL}개를 차지하세요 (${state.expandCount}/${RF_EXPAND_GOAL})`,
        cta: "⭐ 깜빡이는 땅을 누르고 EXPAND",
        nextAction: "🎯 NEXT: 노란 땅을 선택하고 EXPAND",
        done: state.expandCount >= RF_EXPAND_GOAL,
      };
    case "grow":
      return {
        step: 3,
        stepLabel: "STEP 3 — GROW",
        title: "영토가 성장했습니다!",
        detail: "Territory ↑ → Gold ↑ → Population ↑ → Troops ↑",
        cta: "+1 TERRITORY · +GOLD · 병력 증가 중…",
        nextAction: "🎯 NEXT: 자원이 늘어나는 것을 확인하세요",
        done: true,
      };
    case "attack-prompt":
      return {
        step: 4,
        stepLabel: "STEP 4 — ENEMY APPEARS",
        title: "⚠️ 적국이 접근하고 있습니다",
        detail: "RED KINGDOM (AGGRESSOR) — 🔴 빨간 영토를 확인하세요",
        cta: "적 영토를 선택하세요",
        nextAction: "⚔️ NEXT: 빨간 영토를 공격하세요",
        done: false,
      };
    case "attack":
      return {
        step: 5,
        stepLabel: "STEP 5 — FIRST BATTLE",
        title: "첫 전투",
        detail: state.attackCount > 0 ? "⚔️ 승리! 적 영토를 점령했습니다" : "적 영토 선택 → ATTACK 50%",
        cta: state.attackCount > 0 ? "전투 완료!" : "ATTACK 50% 추천",
        nextAction: state.attackCount > 0 ? "🛡️ NEXT: 적의 반격을 준비하세요" : "⚔️ NEXT: ATTACK 버튼을 누르세요",
        done: state.attackCount > 0,
      };
    case "counter":
      return {
        step: 6,
        stepLabel: "STEP 6 — COUNTER ATTACK",
        title: "🔴 적의 반격!",
        detail: state.defended ? "방어 성공!" : "방어하거나 다시 공격하세요",
        cta: state.defended ? "계속 확장하세요" : "DEFEND 또는 ATTACK",
        nextAction: state.defended ? "👑 NEXT: 70% 영토를 확보하세요" : "🛡️ NEXT: 적의 반격을 방어하세요",
        done: state.defended,
      };
    case "free":
      return {
        step: 7,
        stepLabel: "EMPIRE MODE",
        title: "🌎 제국 확장",
        detail: `땅을 넓히고 적을 물리치세요 · 목표 ${RF_VICTORY_GOAL_PCT}%`,
        cta: "EXPAND · ATTACK · DEFEND",
        nextAction: "👑 NEXT: 70% 영토를 확보하세요",
        done: false,
      };
  }
}

export function showExpandUi(phase: RfMissionPhase): boolean {
  return phase === "expand" || phase === "grow" || phase === "free" || phase === "attack-prompt";
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
