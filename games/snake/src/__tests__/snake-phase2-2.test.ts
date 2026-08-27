import assert from "node:assert/strict";
import test from "node:test";

import {
  botHasCharacter,
  ensureBotReady,
  purgeCharacterlessBots,
  syncSnakePopulation,
  tickBotBrains,
} from "../snake-ai-fill";
import {
  createSnakeAt,
  tickWorld,
  type SnakeIoWorld,
} from "../snake-io-engine";

function stubWorld(): SnakeIoWorld {
  return {
    tick: 0,
    config: {
      worldSize: 100,
      foodCount: 50,
      respawnMs: 100,
      spawnShieldMs: 500,
      rewardRate: 1,
    } as SnakeIoWorld["config"],
    snakes: {},
    food: [],
    features: [],
    rankings: [],
    events: [],
    objective: { kind: "score_race", target: 500, progress: {}, label: "test" },
    moments: [],
    deathZones: [],
    killFeed: [],
  };
}

test("P2.2: character-less bot is excluded — ensureBotReady does not invent face", () => {
  const world = stubWorld();
  const bot = createSnakeAt("bot:7", "BOT", 1, world, { x: 40, y: 40 }, 3, { isBot: true });
  bot.headCharacter = undefined;
  world.snakes[bot.deviceId] = bot;

  const ok = ensureBotReady(bot);
  assert.equal(ok, false);
  assert.equal(bot.headCharacter, undefined);
  assert.equal(botHasCharacter(bot), false);
});

test("P2.2: purgeCharacterlessBots removes face-less bots from world", () => {
  const world = stubWorld();
  const bare = createSnakeAt("bot:1", "Bare", 0, world, { x: 10, y: 10 }, 3, { isBot: true });
  bare.headCharacter = undefined;
  world.snakes[bare.deviceId] = bare;

  const removed = purgeCharacterlessBots(world);
  assert.equal(removed, 1);
  assert.equal(world.snakes[bare.deviceId], undefined);
});

test("P2.2: syncSnakePopulation only keeps bots with character", () => {
  const world = stubWorld();
  const bare = createSnakeAt("bot:99", "Ghost", 0, world, { x: 20, y: 20 }, 3, { isBot: true });
  bare.headCharacter = undefined;
  world.snakes[bare.deviceId] = bare;

  syncSnakePopulation(world, [{ deviceId: "p1", nickname: "You" }], 8, "p1");

  assert.equal(world.snakes["bot:99"], undefined);
  for (const s of Object.values(world.snakes)) {
    if (!s.isBot && !s.deviceId.startsWith("bot:")) continue;
    assert.ok(botHasCharacter(s), `${s.deviceId} must have character`);
  }
});

test("P2.2: bots with character keep moving over 30s-equivalent ticks (no stuck)", () => {
  const world = stubWorld();
  syncSnakePopulation(world, [{ deviceId: "p1", nickname: "You" }], 12, "p1");

  // Keep bots invincible so combat deaths do not skew the movement sample
  for (const s of Object.values(world.snakes)) {
    if (s.isBot || s.deviceId.startsWith("bot:")) {
      s.invincibleUntil = Date.now() + 3_600_000;
    }
  }

  const samples = new Map<string, { x: number; y: number; maxDist: number }>();
  for (const b of Object.values(world.snakes)) {
    if (!(b.isBot || b.deviceId.startsWith("bot:")) || !b.alive) continue;
    samples.set(b.deviceId, {
      x: b.headX ?? b.segments[0]?.x ?? 0,
      y: b.headY ?? b.segments[0]?.y ?? 0,
      maxDist: 0,
    });
  }
  assert.ok(samples.size >= 4, "need several bots");

  // ~30s at 20tps ≈ 600 ticks
  for (let t = 0; t < 600; t++) {
    tickBotBrains(world);
    tickWorld(world, Date.now() + t * 50);
    if (t % 30 !== 0) continue;
    for (const [id, sample] of samples) {
      const bot = world.snakes[id];
      if (!bot || !bot.alive) continue;
      const x = bot.headX ?? bot.segments[0]?.x ?? 0;
      const y = bot.headY ?? bot.segments[0]?.y ?? 0;
      sample.maxDist = Math.max(sample.maxDist, Math.hypot(x - sample.x, y - sample.y));
    }
  }

  let living = 0;
  let moved = 0;
  let stuck = 0;
  for (const [id, sample] of samples) {
    const bot = world.snakes[id];
    if (!bot || !bot.alive) continue;
    living += 1;
    assert.ok(botHasCharacter(bot), `${id} must keep character`);
    if (sample.maxDist > 1) moved += 1;
    else stuck += 1;
  }
  assert.ok(living >= 4, `expected living bots, got ${living}`);
  assert.equal(stuck, 0, `stuck bots: ${stuck}; moved ${moved}/${living}`);
});

test("P2.2: respawn despawns character-less bot instead of inventing face", () => {
  const world = stubWorld();
  const bot = createSnakeAt("bot:3", "NoFace", 0, world, { x: 30, y: 30 }, 3, { isBot: true });
  bot.headCharacter = undefined;
  bot.alive = false;
  bot.respawnAt = Date.now() - 1;
  world.snakes[bot.deviceId] = bot;

  tickWorld(world, Date.now());
  assert.equal(world.snakes[bot.deviceId], undefined);
});
