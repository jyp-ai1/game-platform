export const FIELD_WIDTH = 400;
export const FIELD_HEIGHT = 400;
export const HOOK_ORIGIN_X = FIELD_WIDTH / 2;
export const HOOK_ORIGIN_Y = 20;
export const HOOK_MAX_LENGTH = 370;
export const HOOK_MAX_ANGLE = 1.3; // radians (~74°) either side of vertical
export const HOOK_SWING_SPEED = 1.6; // oscillation rate factor
export const HOOK_EXTEND_SPEED = 480; // px/sec
export const HOOK_EMPTY_RETRACT_SPEED = 420; // px/sec, nothing attached
export const ITEM_SIZE = 28;
export const ITEM_COUNT = 9;
export const ROUND_DURATION_S = 45;
export const CATCH_RADIUS = ITEM_SIZE / 2 + 6;

export type HookState = "swinging" | "extending" | "retracting";
export type Status = "playing" | "over";
export type ItemType = "gold" | "rock" | "diamond";

export interface Item {
  x: number;
  y: number;
  value: number;
  /** Higher weight retracts more slowly — heavier catches cost more time. */
  weight: number;
  type: ItemType;
  collected: boolean;
}

export interface GoldMinerState {
  hookAngle: number;
  hookLength: number;
  hookState: HookState;
  swingTime: number;
  attachedItemIndex: number | null;
  items: Item[];
  score: number;
  timeLeft: number;
  status: Status;
}

const ITEM_TEMPLATES: { type: ItemType; value: number; weight: number }[] = [
  { type: "gold", value: 50, weight: 1 },
  { type: "gold", value: 80, weight: 1.4 },
  { type: "rock", value: 10, weight: 2.2 },
  { type: "diamond", value: 200, weight: 1.8 },
];

function randomItems(): Item[] {
  const items: Item[] = [];
  let attempts = 0;
  while (items.length < ITEM_COUNT && attempts < ITEM_COUNT * 20) {
    attempts++;
    const x = 30 + Math.random() * (FIELD_WIDTH - 60);
    const y = 110 + Math.random() * (FIELD_HEIGHT - 140);
    const tooClose = items.some(
      (item) => Math.hypot(item.x - x, item.y - y) < ITEM_SIZE * 1.1
    );
    if (tooClose) {
      continue;
    }
    const template =
      ITEM_TEMPLATES[Math.floor(Math.random() * ITEM_TEMPLATES.length)]!;
    items.push({ x, y, ...template, collected: false });
  }
  return items;
}

export function createInitialState(): GoldMinerState {
  return {
    hookAngle: 0,
    hookLength: 0,
    hookState: "swinging",
    swingTime: 0,
    attachedItemIndex: null,
    items: randomItems(),
    score: 0,
    timeLeft: ROUND_DURATION_S,
    status: "playing",
  };
}

export function hookTip(
  angle: number,
  length: number
): { x: number; y: number } {
  return {
    x: HOOK_ORIGIN_X + Math.sin(angle) * length,
    y: HOOK_ORIGIN_Y + Math.cos(angle) * length,
  };
}

export function fireHook(state: GoldMinerState): GoldMinerState {
  if (state.status !== "playing" || state.hookState !== "swinging") {
    return state;
  }
  return { ...state, hookState: "extending" };
}

export function step(state: GoldMinerState, dtSeconds: number): GoldMinerState {
  if (state.status !== "playing") {
    return state;
  }

  const timeLeft = Math.max(0, state.timeLeft - dtSeconds);
  const status: Status = timeLeft <= 0 ? "over" : "playing";

  if (state.hookState === "swinging") {
    const swingTime = state.swingTime + dtSeconds;
    const hookAngle = Math.sin(swingTime * HOOK_SWING_SPEED) * HOOK_MAX_ANGLE;
    return { ...state, swingTime, hookAngle, timeLeft, status };
  }

  if (state.hookState === "extending") {
    const hookLength = state.hookLength + HOOK_EXTEND_SPEED * dtSeconds;
    const tip = hookTip(state.hookAngle, hookLength);

    let attachedItemIndex: number | null = null;
    for (let i = 0; i < state.items.length; i++) {
      const item = state.items[i]!;
      if (item.collected) {
        continue;
      }
      if (Math.hypot(item.x - tip.x, item.y - tip.y) <= CATCH_RADIUS) {
        attachedItemIndex = i;
        break;
      }
    }

    if (attachedItemIndex !== null || hookLength >= HOOK_MAX_LENGTH) {
      return {
        ...state,
        hookLength: Math.min(hookLength, HOOK_MAX_LENGTH),
        attachedItemIndex,
        hookState: "retracting",
        timeLeft,
        status,
      };
    }
    return { ...state, hookLength, timeLeft, status };
  }

  // retracting
  const attached =
    state.attachedItemIndex !== null
      ? (state.items[state.attachedItemIndex] ?? null)
      : null;
  const retractSpeed = attached
    ? HOOK_EMPTY_RETRACT_SPEED / attached.weight
    : HOOK_EMPTY_RETRACT_SPEED;
  const hookLength = Math.max(0, state.hookLength - retractSpeed * dtSeconds);

  let items = state.items;
  if (attached && state.attachedItemIndex !== null) {
    const tip = hookTip(state.hookAngle, hookLength);
    items = state.items.map((item, index) =>
      index === state.attachedItemIndex ? { ...item, x: tip.x, y: tip.y } : item
    );
  }

  if (hookLength <= 0) {
    let score = state.score;
    if (attached && state.attachedItemIndex !== null) {
      score += attached.value;
      items = items.map((item, index) =>
        index === state.attachedItemIndex ? { ...item, collected: true } : item
      );
    }
    return {
      ...state,
      hookLength: 0,
      hookState: "swinging",
      attachedItemIndex: null,
      items,
      score,
      timeLeft,
      status,
    };
  }

  return { ...state, hookLength, items, timeLeft, status };
}
