/**
 * src/arcade-renderer.js — 2D Canvas Arcade Viewport Renderer (v1.0.0)
 * Draws warped labyrinth backdrop rings, Magical Girl avatar + Soul Gem core,
 * player magic projectiles, Witch Familiars, Boss Witch barrier core + HP bar,
 * enemy projectiles, and Grief Seed pickups.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import { fromQ16 } from "./core.js";
import { CHARACTER_ROSTER } from "./arcade-entities.js";

export function renderArcadeFrame(ctx, state) {
  const { width, height } = ctx.canvas;
  const player = state.player;
  const spec = CHARACTER_ROSTER[player.charId] || CHARACTER_ROSTER.madoka;
  const inverted = Boolean(player.rebellionOverdrive);
  const frozen = player.timeStopTicks > 0;

  // 1. Background & Warped Labyrinth Barrier Rings
  ctx.fillStyle = frozen ? "#181326" : inverted ? "#1b0b1e" : "#080d1a";
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  ctx.strokeStyle = frozen
    ? "rgba(192, 132, 252, 0.22)"
    : inverted
    ? "rgba(244, 63, 94, 0.22)"
    : "rgba(56, 189, 248, 0.16)";
  ctx.lineWidth = 1.25;

  const pulse = Math.sin(state.tick * 0.04) * 8;
  for (let i = 1; i <= 6; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, i * 48 + pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 2. Render Grief Seed Pickups
  for (const seed of state.griefSeeds) {
    const sx = fromQ16(seed.xQ16);
    const sy = fromQ16(seed.yQ16);
    const r = fromQ16(seed.radiusQ16);

    ctx.fillStyle = seed.isMajor ? "#c084fc" : "#34d399";
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * 0.75, r * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 3. Render Player Projectiles
  for (const shot of state.shots) {
    const x = fromQ16(shot.xQ16);
    const y = fromQ16(shot.yQ16);
    const r = fromQ16(shot.radiusQ16);

    ctx.fillStyle = shot.color || spec.shotColor;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Render Witch Familiars
  for (const fam of state.familiars) {
    const fx = fromQ16(fam.xQ16);
    const fy = fromQ16(fam.yQ16);
    const fr = fromQ16(fam.radiusQ16);

    ctx.fillStyle = fam.isElite ? "#f43f5e" : "#fb923c";
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = frozen ? "#c084fc" : "#fef08a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fx, fy, fr * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 5. Render Boss Witch Encounter & Top Health Bar
  if (state.boss) {
    const b = state.boss;
    const bx = fromQ16(b.xQ16);
    const by = fromQ16(b.yQ16);
    const br = fromQ16(b.radiusQ16);

    // Outer rotating labyrinth sigil ring
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(state.tick * 0.03);
    ctx.strokeStyle = b.ringColor;
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-br * 0.85, -br * 0.85, br * 1.7, br * 1.7);
    ctx.restore();

    // Inner Witch core
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(bx, by, br * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    // Top Boss HP Bar
    const barW = width - 48;
    const hpRatio = Math.max(0, Math.min(1, b.hp / b.maxHp));
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(24, 14, barW, 18);
    ctx.fillStyle = b.color;
    ctx.fillRect(24, 14, barW * hpRatio, 18);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 14, barW, 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`${b.name} (${Math.max(0, b.hp)} / ${b.maxHp})`, 30, 27);
  }

  // 6. Render Enemy Projectiles
  for (const eb of state.enemyBullets) {
    const ex = fromQ16(eb.xQ16);
    const ey = fromQ16(eb.yQ16);
    const er = fromQ16(eb.radiusQ16);

    ctx.fillStyle = eb.color || "#f43f5e";
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ex, ey, er * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Render Player Avatar & Soul Gem Core Hitbox
  const px = fromQ16(player.xQ16);
  const py = fromQ16(player.yQ16);
  const pr = fromQ16(player.radiusQ16);

  if (player.invulnTicks === 0 || player.invulnTicks % 6 < 3) {
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.moveTo(px, py - pr - 6);
    ctx.lineTo(px + pr + 4, py + pr + 4);
    ctx.lineTo(px - pr - 4, py + pr + 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px, py + 1, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (inverted) {
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, pr + 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 8. Game Over Overlay
  if (state.gameOver) {
    ctx.fillStyle = "rgba(5, 8, 18, 0.78)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SOUL GEM SHATTERED", cx, cy - 18);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px monospace";
    ctx.fillText(`Final Score: ${state.score} | Wave ${state.wave}`, cx, cy + 12);
    ctx.fillText("Tap 'Restart Run' to enter a new timeline", cx, cy + 38);
    ctx.textAlign = "left";
  }
}
