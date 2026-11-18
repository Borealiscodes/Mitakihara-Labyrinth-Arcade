/**
 * src/arcade-physics.js — Zero-Float Q16.16 2D Arcade Kinematics & Hitboxes
 * Handles 60 Hz player movement, projectile integration, arena clamping,
 * and integer squared-distance circle collision checks.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import { Q_ONE, qAdd, qSub, qMul, toQ16 } from "./core.js";

export const DT_60HZ_Q16 = toQ16(1.0 / 60.0); // ~1092 in Q16.16
export const DIAG_NORM_Q16 = 46341; // ~0.7071 (1 / sqrt(2)) in Q16.16

/**
 * Clamp a Q16.16 coordinate inside [minQ16, maxQ16].
 */
export function clampQ16(valQ16, minQ16, maxQ16) {
  if (valQ16 < minQ16) return minQ16 | 0;
  if (valQ16 > maxQ16) return maxQ16 | 0;
  return valQ16 | 0;
}

/**
 * Step a 2D entity by velocity (vxQ16, vyQ16) over one 60 Hz tick.
 */
export function stepPositionQ16(entity) {
  return {
    ...entity,
    xQ16: qAdd(entity.xQ16, qMul(entity.vxQ16, DT_60HZ_Q16)),
    yQ16: qAdd(entity.yQ16, qMul(entity.vyQ16, DT_60HZ_Q16)),
  };
}

/**
 * Compute normalized Q16.16 velocity vector from directional input (-1, 0, +1)
 * and a scalar speed in pixels/sec (Q16.16).
 */
export function velocityFromInputQ16(dirX, dirY, speedQ16) {
  const dx = Math.sign(dirX | 0);
  const dy = Math.sign(dirY | 0);
  if (dx === 0 && dy === 0) {
    return { vxQ16: 0, vyQ16: 0 };
  }
  const scale = dx !== 0 && dy !== 0 ? DIAG_NORM_Q16 : Q_ONE;
  const effSpeed = qMul(speedQ16, scale);
  return {
    vxQ16: dx * effSpeed,
    vyQ16: dy * effSpeed,
  };
}

/**
 * Exact 64-bit integer circle-circle collision check (no square roots or floats).
 * Returns true if distance between (ax, ay) and (bx, by) <= (rA + rB).
 */
export function checkCircleCollisionQ16(a, b) {
  const dx = BigInt(qSub(a.xQ16, b.xQ16));
  const dy = BigInt(qSub(a.yQ16, b.yQ16));
  const distSq = dx * dx + dy * dy;

  const rSum = BigInt(qAdd(a.radiusQ16, b.radiusQ16));
  const rSumSq = rSum * rSum;
  return distSq <= rSumSq;
}
