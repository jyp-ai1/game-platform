import assert from "node:assert/strict";
import test from "node:test";

import { ensureBotReady } from "../snake-ai-fill";
import { createSnakeAt, setInput, type SnakeEntity, type SnakeIoWorld } from "../snake-io-engine";
import { directionToAngle, isReverseTurn } from "../snake-path-movement";

function stubWorld(): SnakeIoWorld {
  return {
    tick: 0,
    config: { worldSize: 100, foodCount: 50 } as SnakeIoWorld["config"],
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

test("P0-1: left input accepted after full circle (no discrete opposite block)", () => {
  const world = stubWorld();
  const snake = createSnakeAt("p1", "Player", 0, world, { x: 50, y: 50 }, 3);
  snake.angle = 0;
  snake.direction = "right";
  snake.pendingDirection = "right";
  world.snakes.p1 = snake;

  setInput(world, "p1", "left");
  assert.equal(world.snakes.p1!.pendingDirection, "left");
  assert.equal(world.snakes.p1!.desiredAngle, directionToAngle("left"));
});

test("P0-1: isReverseTurn detects 180deg for AI (humans use smooth turn)", () => {
  const snake: SnakeEntity = {
    deviceId: "p1",
    nickname: "P",
    segments: [{ x: 1, y: 1 }],
    direction: "right",
    pendingDirection: "right",
    score: 0,
    alive: true,
    color: "#fff",
    angle: 0,
  };
  assert.equal(isReverseTurn(snake, "left"), true);
});

test("P0-2: character-less bot gets direction + character defaults", () => {
  const world = stubWorld();
  const bot = createSnakeAt("bot:7", "BOT", 1, world, { x: 40, y: 40 }, 3, { isBot: true });
  bot.headCharacter = undefined;
  bot.awaitingInput = true;
  bot.desiredAngle = undefined;
  bot.pendingDirection = undefined as unknown as typeof bot.pendingDirection;
  world.snakes[bot.deviceId] = bot;

  ensureBotReady(bot);

  assert.equal(bot.awaitingInput, false);
  assert.ok(bot.headCharacter, "bot should receive head character");
  assert.ok(bot.desiredAngle != null, "bot should have desiredAngle");
  assert.ok(bot.pendingDirection, "bot should have pendingDirection");
});
