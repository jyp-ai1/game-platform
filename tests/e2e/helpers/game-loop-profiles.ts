import type { Page } from "@playwright/test";

export type GameLoopProfile = {
  /** Skip — Sprint 14 multiplayer path */
  multiplayer?: boolean;
  /** Max wait for game-over overlay / result modal */
  gameOverTimeoutMs?: number;
  /** Drive gameplay until game ends */
  playUntilGameOver: (page: Page) => Promise<void>;
};

const STAGE = ".game-detail-stage";

async function spamInputs(page: Page, rounds: number, delayMs: number): Promise<void> {
  const stage = page.locator(STAGE);
  for (let i = 0; i < rounds; i++) {
    await stage.click({ position: { x: 120, y: 120 }, force: true }).catch(() => {});
    await page.keyboard.press("ArrowLeft").catch(() => {});
    await page.keyboard.press("ArrowRight").catch(() => {});
    await page.keyboard.press("ArrowDown").catch(() => {});
    await page.keyboard.press("ArrowUp").catch(() => {});
    await page.keyboard.press("Space").catch(() => {});
    await page.waitForTimeout(delayMs);
  }
}

async function playColorMatch(page: Page): Promise<void> {
  // Let round timers expire — 3 lives × ~3s rounds
  await page.waitForTimeout(12_000);
}

async function playBubblePop(page: Page): Promise<void> {
  const field = page.locator(`${STAGE} .touch-none`).first();
  await spamInputs(page, 40, 150);
  for (let i = 0; i < 30; i++) {
    await field.click({ position: { x: 160, y: 200 }, force: true }).catch(() => {});
    await page.keyboard.press("Space").catch(() => {});
    await page.waitForTimeout(120);
  }
}

async function playMemory(page: Page): Promise<void> {
  for (let round = 0; round < 80; round++) {
    if (await page.getByRole("button", { name: /^Retry$/i }).isVisible().catch(() => false)) {
      return;
    }

    const movesLabel = page.locator(`${STAGE}`).locator("text=Moves").locator("xpath=..");
    const movesText = await movesLabel.textContent().catch(() => "0");
    const moves = Number((movesText ?? "0").replace(/[^\d]/g, "")) || 0;
    if (moves >= 50) {
      await page.waitForTimeout(1_500);
      return;
    }

    const cards = page.locator(`${STAGE} .grid.grid-cols-4 > button:not([disabled])`);
    const open = await cards.count();
    if (open >= 2) {
      await cards.nth(0).click();
      await page.waitForTimeout(320);
      const remaining = page.locator(`${STAGE} .grid.grid-cols-4 > button:not([disabled])`);
      if ((await remaining.count()) > 0) {
        await remaining.nth(0).click();
      }
      await page.waitForTimeout(900);
    } else if (open === 1) {
      await cards.nth(0).click();
      await page.waitForTimeout(900);
    } else {
      await page.waitForTimeout(400);
    }
  }
}

async function playTicTacToe(page: Page): Promise<void> {
  // Lose quickly so the round ends; score only saves on player win (known gap).
  const cells = page.locator(`${STAGE} button[aria-label^="칸"]`);
  const losing = [0, 3, 1, 4, 2];
  for (const idx of losing) {
    const cell = cells.nth(idx);
    if (await cell.isEnabled().catch(() => false)) {
      await cell.click();
      await page.waitForTimeout(700);
    }
  }
}

async function playAirHockey(page: Page): Promise<void> {
  const field = page.locator(`${STAGE} .touch-none`).first();
  await field.waitFor({ state: "visible" });

  // Try to hit the puck; if the match stays scoreless, the 3-minute limit ends it.
  for (let i = 0; i < 80; i++) {
    if (await page.getByRole("button", { name: /^Retry$/i }).isVisible().catch(() => false)) {
      return;
    }

    const hitting = i % 8 < 4;
    await field.hover({
      position: { x: hitting ? 200 : 60, y: hitting ? 420 : 540 },
      force: true,
    });
    await page.waitForTimeout(120);
  }

  const deadline = Date.now() + 185_000;
  while (Date.now() < deadline) {
    if (await page.getByRole("button", { name: /^Retry$/i }).isVisible().catch(() => false)) {
      return;
    }
    await page.waitForTimeout(1_000);
  }
}

async function play2048OrTetris(page: Page): Promise<void> {
  await spamInputs(page, 120, 100);
}

export const TIER_B_FULL_LOOP_SLUGS = [
  "bubble-pop",
  "tetris",
  "2048",
  "memory",
  "color-match",
  "air-hockey",
] as const;

export type TierBFullLoopSlug = (typeof TIER_B_FULL_LOOP_SLUGS)[number];

export const GAME_LOOP_PROFILES: Record<string, GameLoopProfile> = {
  snake: {
    multiplayer: true,
    playUntilGameOver: async () => {
      /* Sprint 14 */
    },
  },
  "bubble-pop": {
    gameOverTimeoutMs: 45_000,
    playUntilGameOver: playBubblePop,
  },
  "color-match": {
    gameOverTimeoutMs: 20_000,
    playUntilGameOver: playColorMatch,
  },
  memory: {
    gameOverTimeoutMs: 90_000,
    playUntilGameOver: playMemory,
  },
  "tic-tac-toe": {
    gameOverTimeoutMs: 25_000,
    playUntilGameOver: playTicTacToe,
  },
  "air-hockey": {
    gameOverTimeoutMs: 190_000,
    playUntilGameOver: playAirHockey,
  },
  "2048": {
    gameOverTimeoutMs: 90_000,
    playUntilGameOver: play2048OrTetris,
  },
  tetris: {
    gameOverTimeoutMs: 90_000,
    playUntilGameOver: play2048OrTetris,
  },
};

export function getGameLoopProfile(slug: string): GameLoopProfile {
  return (
    GAME_LOOP_PROFILES[slug] ?? {
      gameOverTimeoutMs: 60_000,
      playUntilGameOver: (page) => spamInputs(page, 80, 120),
    }
  );
}
