/**
 * src/arcade-app.js — 60 Hz Arcade Game Loop, Touch-Drag Steering & Input Dispatcher
 * Connects zero-float Q16.16 kinematics and collision checks with touch/keyboard
 * controls, character roster switching, Grief Seed pickups, and Ultimate abilities.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import { toQ16, fromQ16, createSeededRng } from "./core.js";
import {
  clampQ16,
  stepPositionQ16,
  velocityFromInputQ16,
  checkCircleCollisionQ16,
} from "./arcade-physics.js";
import {
  CHARACTER_ROSTER,
  createPlayerState,
  spawnPlayerShots,
  spawnFamiliar,
  spawnGriefSeed,
} from "./arcade-entities.js";
import { renderArcadeFrame } from "./arcade-renderer.js";
import { updateArcadeHud } from "./arcade-ui.js";

const FIXED_DT_MS = 1000 / 60;
const ARENA_W = 560;
const ARENA_H = 480;

function initArcade() {
  const canvas = document.getElementById("arcade-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;

  const hudEls = {
    scoreLabel: document.getElementById("hud-score"),
    waveLabel: document.getElementById("hud-wave"),
    charLabel: document.getElementById("hud-char"),
    purityBar: document.getElementById("bar-purity"),
    purityText: document.getElementById("val-purity"),
    hopeBar: document.getElementById("bar-hope"),
    hopeText: document.getElementById("val-hope"),
    despairBar: document.getElementById("bar-despair"),
    despairText: document.getElementById("val-despair"),
    ultBtn: document.getElementById("btn-ultimate"),
  };

  let activeCharId = "madoka";
  let rng = createSeededRng(0x20261118);

  let state = null;

  const resetRun = (charId = activeCharId) => {
    activeCharId = charId;
    rng = createSeededRng(0x20261118);
    state = {
      tick: 0,
      wave: 1,
      score: 0,
      killsInWave: 0,
      gameOver: false,
      player: createPlayerState(charId, ARENA_W, ARENA_H),
      shots: [],
      familiars: [],
      griefSeeds: [],
    };
  };

  resetRun("madoka");

  // Input state: Keyboard + Direct Canvas Touch/Pointer Drag
  const keys = { up: false, down: false, left: false, right: false };
  let pointerActive = false;
  let pointerTargetX = ARENA_W / 2;
  let pointerTargetY = ARENA_H - 56;

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "w" || ev.key === "W" || ev.key === "ArrowUp") keys.up = true;
    if (ev.key === "s" || ev.key === "S" || ev.key === "ArrowDown") keys.down = true;
    if (ev.key === "a" || ev.key === "A" || ev.key === "ArrowLeft") keys.left = true;
    if (ev.key === "d" || ev.key === "D" || ev.key === "ArrowRight") keys.right = true;
    if (ev.key === " ") triggerUltimate();
  });

  window.addEventListener("keyup", (ev) => {
    if (ev.key === "w" || ev.key === "W" || ev.key === "ArrowUp") keys.up = false;
    if (ev.key === "s" || ev.key === "S" || ev.key === "ArrowDown") keys.down = false;
    if (ev.key === "a" || ev.key === "A" || ev.key === "ArrowLeft") keys.left = false;
    if (ev.key === "d" || ev.key === "D" || ev.key === "ArrowRight") keys.right = false;
  });

  const updatePointerCoords = (ev) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    pointerTargetX = ((ev.clientX - rect.left) / rect.width) * ARENA_W;
    pointerTargetY = ((ev.clientY - rect.top) / rect.height) * ARENA_H;
  };

  canvas?.addEventListener("pointerdown", (ev) => {
    pointerActive = true;
    updatePointerCoords(ev);
  });

  canvas?.addEventListener("pointermove", (ev) => {
    if (!pointerActive) return;
    updatePointerCoords(ev);
  });

  window.addEventListener("pointerup", () => {
    pointerActive = false;
  });

  // Character Roster Switcher Buttons
  document.querySelectorAll("[data-roster]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const charId = btn.getAttribute("data-roster");
      resetRun(charId);
    });
  });

  // Character-Specific Ultimate Abilities (Costs 100 Hope Mana)
  const triggerUltimate = () => {
    const p = state.player;
    if (state.gameOver || p.hopeMana < 100) return;
    p.hopeMana = 0;

    if (p.charId === "madoka") {
      // Law of Cycles: Purifies all active familiars on screen into Grief Seeds
      for (const fam of state.familiars) {
        state.score += fam.scoreValue;
        state.griefSeeds.push(spawnGriefSeed(fam.xQ16, fam.yQ16, fam.isElite));
      }
      state.familiars = [];
      p.despairCorrupt = Math.max(0, p.despairCorrupt - 40);
    } else if (p.charId === "homura") {
      // Shield Time-Stop: Freezes all familiars for 240 ticks (4 seconds)
      p.timeStopTicks = 240;
    } else if (p.charId === "mami") {
      // Tiro Finale: Fires a wide horizontal wall of 11 heavy cannon rounds
      for (let i = -5; i <= 5; i++) {
        state.shots.push({
          xQ16: p.xQ16 + toQ16(i * 18),
          yQ16: p.yQ16 - toQ16(16),
          vxQ16: toQ16(i * 12),
          vyQ16: -toQ16(640),
          radiusQ16: toQ16(8.0),
          damage: 65,
          color: "#fef08a",
        });
      }
    } else if (p.charId === "kyoko") {
      // Rosso Fantasma: Clears nearby enemies + grants 3 seconds of barrier invulnerability
      p.invulnTicks = 180;
      state.familiars = state.familiars.filter((fam) => {
        const dist = Math.hypot(fromQ16(fam.xQ16 - p.xQ16), fromQ16(fam.yQ16 - p.yQ16));
        if (dist < 190) {
          state.score += fam.scoreValue;
          return false;
        }
        return true;
      });
    } else if (p.charId === "sayaka") {
      // Fortissimo Surge: Restores +50 Soul Gem Purity HP and vents 30% Despair
      p.purityHp = Math.min(p.maxPurityHp, p.purityHp + 50);
      p.despairCorrupt = Math.max(0, p.despairCorrupt - 30);
    }
  };

  document.getElementById("btn-ultimate")?.addEventListener("click", triggerUltimate);

  // Rebellion Overdrive Toggle (2x Damage, 2x Despair Corruption Rate)
  document.getElementById("btn-overdrive")?.addEventListener("click", () => {
    if (state.gameOver) return;
    state.player.rebellionOverdrive = !state.player.rebellionOverdrive;
  });

  document.getElementById("btn-restart")?.addEventListener("click", () => {
    resetRun(activeCharId);
  });

  // Single 60 Hz Simulation Step
  function stepSimulation() {
    if (state.gameOver) return;
    state.tick++;

    const p = state.player;
    const spec = CHARACTER_ROSTER[p.charId] || CHARACTER_ROSTER.madoka;

    if (p.invulnTicks > 0) p.invulnTicks--;
    if (p.timeStopTicks > 0) p.timeStopTicks--;
    if (p.cooldownTicks > 0) p.cooldownTicks--;

    // 1. Compute Player Velocity from Touch Drag or Keyboard
    let dirX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let dirY = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);

    if (pointerActive && dirX === 0 && dirY === 0) {
      const curX = fromQ16(p.xQ16);
      const curY = fromQ16(p.yQ16);
      const dx = pointerTargetX - curX;
      const dy = pointerTargetY - curY;
      if (Math.abs(dx) > 4) dirX = Math.sign(dx);
      if (Math.abs(dy) > 4) dirY = Math.sign(dy);
    }

    const vel = velocityFromInputQ16(dirX, dirY, spec.speedQ16);
    p.vxQ16 = vel.vxQ16;
    p.vyQ16 = vel.vyQ16;

    const movedPlayer = stepPositionQ16(p);
    p.xQ16 = clampQ16(movedPlayer.xQ16, toQ16(18), toQ16(ARENA_W - 18));
    p.yQ16 = clampQ16(movedPlayer.yQ16, toQ16(24), toQ16(ARENA_H - 18));

    // 2. Continuous Auto-Fire
    if (p.cooldownTicks === 0) {
      state.shots.push(...spawnPlayerShots(p));
      p.cooldownTicks = spec.fireCooldownTicks;
    }

    // 3. Spawn Witch Familiar Waves
    const spawnInterval = Math.max(18, 52 - state.wave * 4);
    if (state.tick % spawnInterval === 0) {
      state.familiars.push(spawnFamiliar(rng, state.wave, ARENA_W));
    }

    // Passive Despair accumulation (doubled under Rebellion Overdrive)
    if (state.tick % 45 === 0) {
      p.despairCorrupt = Math.min(100, p.despairCorrupt + (p.rebellionOverdrive ? 2 : 1));
      if (p.despairCorrupt >= 100) {
        p.purityHp = Math.max(0, p.purityHp - 4);
      }
    }

    // 4. Advance Projectiles & Filter Off-Screen
    state.shots = state.shots
      .map(stepPositionQ16)
      .filter((s) => fromQ16(s.yQ16) > -20 && fromQ16(s.xQ16) > -20 && fromQ16(s.xQ16) < ARENA_W + 20);

    // 5. Advance Familiars (Frozen during Homura Time-Stop)
    if (p.timeStopTicks === 0) {
      state.familiars = state.familiars
        .map((fam) => {
          const next = stepPositionQ16(fam);
          const fx = fromQ16(next.xQ16);
          if (fx < 20 || fx > ARENA_W - 20) {
            next.vxQ16 = -next.vxQ16;
          }
          return next;
        })
        .filter((fam) => fromQ16(fam.yQ16) < ARENA_H + 30);
    }

    // 6. Advance Grief Seeds
    state.griefSeeds = state.griefSeeds
      .map(stepPositionQ16)
      .filter((seed) => fromQ16(seed.yQ16) < ARENA_H + 20);

    // 7. Shot vs Familiar Collisions
    const survivingShots = [];
    for (const shot of state.shots) {
      let hit = false;
      for (const fam of state.familiars) {
        if (fam.hp > 0 && checkCircleCollisionQ16(shot, fam)) {
          fam.hp -= shot.damage;
          hit = true;
          if (fam.hp <= 0) {
            state.score += fam.scoreValue;
            state.killsInWave++;
            p.hopeMana = Math.min(p.maxHopeMana, p.hopeMana + (fam.isElite ? 16 : 6));
            if (fam.isElite || (rng() % 3 === 0)) {
              state.griefSeeds.push(spawnGriefSeed(fam.xQ16, fam.yQ16, fam.isElite));
            }
            if (state.killsInWave >= 8 + state.wave * 3) {
              state.wave++;
              state.killsInWave = 0;
            }
          }
          break;
        }
      }
      if (!hit) survivingShots.push(shot);
    }
    state.shots = survivingShots;
    state.familiars = state.familiars.filter((f) => f.hp > 0);

    // 8. Player vs Grief Seed Pickups
    state.griefSeeds = state.griefSeeds.filter((seed) => {
      if (checkCircleCollisionQ16(p, seed)) {

p.despairCorrupt = Math.max(0, p.despairCorrupt - seed.despairClear);
p.hopeMana = Math.min(p.maxHopeMana, p.hopeMana + seed.hopeGain);
p.purityHp = Math.min(p.maxPurityHp, p.purityHp + 5);
state.score += 50;
return false;
}
return true;
});
// 9. Player vs Familiar Collisions
if (p.invulnTicks === 0 && p.timeStopTicks === 0) {
for (const fam of state.familiars) {
if (checkCircleCollisionQ16(p, fam)) {
p.purityHp = Math.max(0, p.purityHp - (fam.isElite ? 28 : 16));
p.despairCorrupt = Math.min(100, p.despairCorrupt + 10);
p.invulnTicks = 60;
break;
}
}
}
if (p.purityHp <= 0) {
state.gameOver = true;
}
}
let lastTime = performance.now();
let accumulator = 0;
function loop(now) {
accumulator += Math.min(100, now - lastTime);
lastTime = now;
while (accumulator >= FIXED_DT_MS) {
stepSimulation();
accumulator -= FIXED_DT_MS;
}
if (ctx) renderArcadeFrame(ctx, state);
updateArcadeHud(hudEls, state);
requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
}
window.addEventListener("DOMContentLoaded", initArcade);
