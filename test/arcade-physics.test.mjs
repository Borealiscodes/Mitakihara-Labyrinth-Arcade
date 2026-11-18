/**
 * test/arcade-physics.test.mjs — Deterministic Arcade Physics, Hitbox & Boss Tests (v1.0.0)
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
import {
  spawnBossWitch,
  spawnBossProjectiles,
} from "../src/arcade-entities.js";

test("1. 60 Hz Symplectic Step & Diagonal Speed Normalization", () => {
  const speed = toQ16(240.0);
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

test("4. Boss Witch Roster & Deterministic Q16.16 Bullet Rings (v1.0.0)", () => {
  const charlotte = spawnBossWitch(5, 560);
  assert.equal(charlotte.id, "charlotte");
  assert.equal(charlotte.hp, 900);

  const ringBullets = spawnBossProjectiles(charlotte);
  assert.equal(ringBullets.length, 8);
  assert.ok(Number.isInteger(ringBullets[0].vxQ16));
  assert.ok(Number.isInteger(ringBullets[0].vyQ16));

  const oktavia = spawnBossWitch(10, 560);
  assert.equal(oktavia.id, "oktavia");
  assert.equal(spawnBossProjectiles(oktavia).length, 4);

  const walpurgis = spawnBossWitch(15, 560);
  assert.equal(walpurgis.id, "walpurgisnacht");
  assert.equal(spawnBossProjectiles(walpurgis).length, 16);
});
