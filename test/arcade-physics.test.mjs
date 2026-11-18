/**
 * test/arcade-physics.test.mjs — Deterministic Arcade Physics & Hitbox Tests
 * Run: node --test test/arcade-physics.test.mjs
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import test from "node:test";
import assert from "node:assert/strict";

import { toQ16, fromQ16, createSeededRng } from "../src/core.js";
import {
  clampQ16,
  stepPositionQ16,
  velocityFromInputQ16,
  checkCircleCollisionQ16,
} from "../src/arcade-physics.js";

test("1. 60 Hz Symplectic Step & Diagonal Speed Normalization", () => {
  const speed = toQ16(240.0); // 240 px/sec -> 4 px/tick
  const cardinal = velocityFromInputQ16(1, 0, speed);
  assert.equal(cardinal.vxQ16, speed);
  assert.equal(cardinal.vyQ16, 0);

  const player = stepPositionQ16({
    xQ16: toQ16(100.0),
    yQ16: toQ16(100.0),
    vxQ16: cardinal.vxQ16,
    vyQ16: cardinal.vyQ16,
  });
  assert.ok(Math.abs(fromQ16(player.xQ16) - 104.0) < 0.02);

  // Diagonal movement scales by 1/sqrt(2) so diagonal speed does not exceed cardinal speed
  const diag = velocityFromInputQ16(1, 1, speed);
  assert.ok(diag.vxQ16 < speed && diag.vxQ16 > toQ16(169.0));
});

test("2. Zero-Float Circle-Circle Hitbox Collision", () => {
  const shot = { xQ16: toQ16(50.0), yQ16: toQ16(50.0), radiusQ16: toQ16(4.0) };
  const familiarHit = { xQ16: toQ16(58.0), yQ16: toQ16(50.0), radiusQ16: toQ16(6.0) };
  const familiarMiss = { xQ16: toQ16(65.0), yQ16: toQ16(50.0), radiusQ16: toQ16(6.0) };

  assert.equal(checkCircleCollisionQ16(shot, familiarHit), true);
  assert.equal(checkCircleCollisionQ16(shot, familiarMiss), false);
});

test("3. Arena Clamping & Deterministic Spawn RNG", () => {
  assert.equal(clampQ16(toQ16(-10), toQ16(16), toQ16(544)), toQ16(16));
  assert.equal(clampQ16(toQ16(600), toQ16(16), toQ16(544)), toQ16(544));

  const rng1 = createSeededRng(0xabc123);
  const rng2 = createSeededRng(0xabc123);
  assert.equal(rng1(), rng2());
});
