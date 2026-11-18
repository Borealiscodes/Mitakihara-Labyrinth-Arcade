/**
 * src/arcade-app.js — 60 Hz Arcade Loop, Difficulty Modes, Boss Witches & Techno Audio (v1.1.0)
 * Connects zero-float Q16.16 kinematics and collision checks with touch/keyboard
 * controls, 4-tier difficulty scaling, every-5-wave Boss Witch fights, Grief Seed
 * drops, and procedural dark-techno + retro SFX audio.
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
  DIFFICULTY_MODES,
  createPlayerState,
  spawnPlayerShots,
  spawnFamiliar,
  spawnGriefSeed,
  spawnBossWitch,
  spawnBossProjectiles,
} from "./arcade-entities.js";
import { renderArcadeFrame } from "./arcade-renderer.js";
import { updateArcadeHud } from "./arcade-ui.js";
import { createArcadeAudio } from "./arcade-audio.js";

const FIXED_DT_MS = 1000 / 60;
const ARENA_W = 560;
const ARENA_H = 480;

function initArcade() {
  const canvas = document.getElementById("arcade-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const audio = createArcadeAudio();

  const hudEls = {
    scoreLabel: document.getElementById("hud-score"),
    waveLabel: document.getElementById("hud-wave"),
    charLabel: document.getElementById("hud-char"),
    diffLabel: document.getElementById("hud-diff"),
    purityBar: document.getElementById("bar-purity"),
    purityText: document.getElementById("val-purity"),
    hopeBar: document.getElementById("bar-hope"),
    hopeText: document.getElementById("val-hope"),
    despairBar: document.getElementById("bar-despair"),
    despairText: document.getElementById("val-despair"),
    ultBtn: document.getElementById("btn-ultimate"),
  };

  let activeCharId = "madoka";
  let activeDiffId = "standard";
  let rng = createSeededRng(0x20261118);
  let state = null;

  const getDiff = () => DIFFICULTY_MODES[activeDiffId] || DIFFICULTY_MODES.standard;

  const resetRun = (charId = activeCharId, diffId = activeDiffId) => {
    activeCharId = charId;
    activeDiffId = diffId;
    rng = createSeededRng(0x20261118);
    audio.setBossMode(false);

    const diff = getDiff();
    if (hudEls.diffLabel) {
      hudEls.diffLabel.textContent = `Mode: ${diff.label} (${diff.scoreMult}x)`;
    }

    state = {
      tick: 0,
      wave: 1,
      score: 0,
      killsInWave: 0,
      gameOver: false,
      player: createPlayerState(charId, ARENA_W, ARENA_H),
      shots: [],
      familiars: [],
      enemyBullets: [],
      griefSeeds: [],
      boss: null,
    };
  };

  resetRun("madoka", "standard");

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

  document.querySelectorAll("[data-roster]").forEach((btn) => {
    btn.addEventListener("click", () => {
      resetRun(btn.getAttribute("data-roster"), activeDiffId);
    });
  });

  document.querySelectorAll("[data-difficulty]").forEach((btn) => {
    btn.addEventListener("click", () => {
      resetRun(activeCharId, btn.getAttribute("data-difficulty"));
    });
  });

  const triggerUltimate = () => {
    const p = state.player;
    if (state.gameOver || p.hopeMana < 100) return;
    p.hopeMana = 0;
    audio.playUltimate();

    state.enemyBullets = [];

    if (p.charId === "madoka") {
      for (const fam of state.familiars) {
        state.score += fam.scoreValue;
        state.griefSeeds.push(spawnGriefSeed(fam.xQ16, fam.yQ16, fam.isElite));
      }
      state.familiars = [];
      if (state.boss) state.boss.hp -= 350;
      p.despairCorrupt = Math.max(0, p.despairCorrupt - 40);
    } else if (p.charId === "homura") {
      p.timeStopTicks = 240;
    } else if (p.charId === "mami") {
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
      p.invulnTicks = 180;
      if (state.boss) state.boss.hp -= 260;
      state.familiars = state.familiars.filter((fam) => {
        const dist = Math.hypot(fromQ16(fam.xQ16 - p.xQ16), fromQ16(fam.yQ16 - p.yQ16));
        if (dist < 190) {
          state.score += fam.scoreValue;
          return false;
        }
        return true;
      });
    } else if (p.charId === "sayaka") {
      p.purityHp = Math.min(p.maxPurityHp, p.purityHp + 50);
      p.despairCorrupt = Math.max(0, p.despairCorrupt - 30);
    }
  };

  document.getElementById("btn-ultimate")?.addEventListener("click", triggerUltimate);

  document.getElementById("btn-overdrive")?.addEventListener("click", () => {
    if (state.gameOver) return;
    state.player.rebellionOverdrive = !state.player.rebellionOverdrive;
  });

  document.getElementById("btn-restart")?.addEventListener("click", () => {
    resetRun(activeCharId, activeDiffId);
  });

  const audioBtn = document.getElementById("btn-audio");
  audioBtn?.addEventListener("click", () => {
    const mode = audio.cycleMode();
    audioBtn.textContent = mode === "symphonic" ? "Audio: Symphonic Waltz" : mode === "techno" ? "Audio: Dark Techno" : "Audio: Muted";
  });

  function stepSimulation() {
    if (state.gameOver) return;
    state.tick++;

    const p = state.player;
    const spec = CHARACTER_ROSTER[p.charId] || CHARACTER_ROSTER.madoka;
    const diff = getDiff();

    if (p.invulnTicks > 0) p.invulnTicks--;
    if (p.timeStopTicks > 0) p.timeStopTicks--;
    if (p.cooldownTicks > 0) p.cooldownTicks--;

    let dirX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let dirY = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);

    if (pointerActive && dirX === 0 && dirY === 0) {
      const dx = pointerTargetX - fromQ16(p.xQ16);
      const dy = pointerTargetY - fromQ16(p.yQ16);
      if (Math.abs(dx) > 4) dirX = Math.sign(dx);
      if (Math.abs(dy) > 4) dirY = Math.sign(dy);
    }

    const vel = velocityFromInputQ16(dirX, dirY, spec.speedQ16);
    p.vxQ16 = vel.vxQ16;
    p.vyQ16 = vel.vyQ16;

    const movedPlayer = stepPositionQ16(p);
    p.xQ16 = clampQ16(movedPlayer.xQ16, toQ16(18), toQ16(ARENA_W - 18));
    p.yQ16 = clampQ16(movedPlayer.yQ16, toQ16(24), toQ16(ARENA_H - 18));

    if (p.cooldownTicks === 0) {
      state.shots.push(...spawnPlayerShots(p));
      p.cooldownTicks = spec.fireCooldownTicks;
      if (state.tick % (spec.fireCooldownTicks * 2) === 0) {
        audio.playShot();
      }
    }

    if (state.boss) {
      if (p.timeStopTicks === 0) {
        const nextBoss = stepPositionQ16(state.boss);
        const bx = fromQ16(nextBoss.xQ16);
        if (bx < 56 || bx > ARENA_W - 56) {
          nextBoss.vxQ16 = -nextBoss.vxQ16;
        }
        state.boss = nextBoss;

        if (state.tick % state.boss.fireInterval === 0) {
          state.enemyBullets.push(...spawnBossProjectiles(state.boss));
        }
      }
    } else {
      const rawInterval = 52 - state.wave * 4 + diff.spawnIntervalOffset;
      const spawnInterval = Math.max(12, rawInterval);
      if (state.tick % spawnInterval === 0) {
        state.familiars.push(spawnFamiliar(rng, state.wave, ARENA_W, diff));
      }
    }

    if (state.tick % diff.despairTickInterval === 0) {
      p.despairCorrupt = Math.min(100, p.despairCorrupt + (p.rebellionOverdrive ? 2 : 1));
      if (p.despairCorrupt >= 100) {
        p.purityHp = Math.max(0, p.purityHp - 4);
      }
    }

    state.shots = state.shots
      .map(stepPositionQ16)
      .filter((s) => {
        const sx = fromQ16(s.xQ16);
        const sy = fromQ16(s.yQ16);
        return sy > -20 && sx > -20 && sx < ARENA_W + 20;
      });

    if (p.timeStopTicks === 0) {
      state.familiars = state.familiars
        .map((fam) => {
          const next = stepPositionQ16(fam);
          const fx = fromQ16(next.xQ16);
          if (fx < 20 || fx > ARENA_W - 20) next.vxQ16 = -next.vxQ16;
          return next;
        })
        .filter((fam) => fromQ16(fam.yQ16) < ARENA_H + 30);

      state.enemyBullets = state.enemyBullets
        .map(stepPositionQ16)
        .filter((eb) => {
          const ex = fromQ16(eb.xQ16);
          const ey = fromQ16(eb.yQ16);
          return ey > -20 && ey < ARENA_H + 20 && ex > -20 && ex < ARENA_W + 20;
        });
    }

    state.griefSeeds = state.griefSeeds
      .map(stepPositionQ16)

.filter((seed) => fromQ16(seed.yQ16) < ARENA_H + 20);
const survivingShots = [];
for (const shot of state.shots) {
let hit = false;
if (state.boss && state.boss.hp > 0 && checkCircleCollisionQ16(shot, state.boss)) {
state.boss.hp -= shot.damage;
hit = true;
p.hopeMana = Math.min(p.maxHopeMana, p.hopeMana + 1);
}
if (!hit) {
for (const fam of state.familiars) {
if (fam.hp > 0 && checkCircleCollisionQ16(shot, fam)) {
fam.hp -= shot.damage;
hit = true;
if (fam.hp <= 0) {
audio.playPop();
state.score += fam.scoreValue;
state.killsInWave++;
p.hopeMana = Math.min(p.maxHopeMana, p.hopeMana + (fam.isElite ? 16 : 6));
if (fam.isElite || rng() % 3 === 0) {
state.griefSeeds.push(spawnGriefSeed(fam.xQ16, fam.yQ16, fam.isElite));
}
}
break;
}
}
}
if (!hit) survivingShots.push(shot);
}
state.shots = survivingShots;
state.familiars = state.familiars.filter((f) => f.hp > 0);
if (!state.boss && state.killsInWave >= 8 + state.wave * 3) {
state.wave++;
state.killsInWave = 0;
if (state.wave % 5 === 0) {
state.boss = spawnBossWitch(state.wave, ARENA_W, diff);
state.familiars = [];
audio.setBossMode(true);
audio.playBossWarning();
}
}
if (state.boss && state.boss.hp <= 0) {
const defeated = state.boss;
state.score += defeated.scoreValue;
audio.setBossMode(false);
audio.playUltimate();
for (let i = -2; i <= 2; i++) {
state.griefSeeds.push(
spawnGriefSeed(defeated.xQ16 + toQ16(i * 22), defeated.yQ16, true)
);
}
state.boss = null;
state.enemyBullets = [];
state.wave++;
state.killsInWave = 0;
}
state.griefSeeds = state.griefSeeds.filter((seed) => {
if (checkCircleCollisionQ16(p, seed)) {
audio.playSeed();
p.despairCorrupt = Math.max(0, p.despairCorrupt - seed.despairClear);
p.hopeMana = Math.min(p.maxHopeMana, p.hopeMana + seed.hopeGain);
p.purityHp = Math.min(p.maxPurityHp, p.purityHp + 5);
state.score += 50 * diff.scoreMult;
return false;
}
return true;
});
if (p.invulnTicks === 0 && p.timeStopTicks === 0) {
for (const fam of state.familiars) {
if (checkCircleCollisionQ16(p, fam)) {
audio.playHit();
p.purityHp = Math.max(0, p.purityHp - (fam.isElite ? 28 : 16));
p.despairCorrupt = Math.min(100, p.despairCorrupt + 10);
p.invulnTicks = 60;
break;
}
}
}
if (p.invulnTicks === 0 && p.timeStopTicks === 0) {
state.enemyBullets = state.enemyBullets.filter((eb) => {
if (checkCircleCollisionQ16(p, eb)) {
audio.playHit();
p.purityHp = Math.max(0, p.purityHp - eb.damage);
p.despairCorrupt = Math.min(100, p.despairCorrupt + 8);
p.invulnTicks = 45;
return false;
}
return true;
});
}
if (p.purityHp <= 0) {
state.gameOver = true;
audio.setBossMode(false);
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
