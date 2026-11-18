/**
 * src/arcade-entities.js — Playable Roster, Boss Witches, Familiars & Grief Seeds
 * Translates 4D Q16.16 channels [Hope, Despair, Purity, Entropy] into arcade stats,
 * deterministic 16-angle Q16.16 boss bullet patterns, and Grief Seed drops.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import { Q_ONE, qMul, toQ16 } from "./core.js";

// Precomputed 16-angle unit circle lookup table in Q16.16 (zero runtime floats)
const SIN_16_Q16 = Array.from({ length: 16 }, (_, i) => toQ16(Math.sin((i * Math.PI * 2) / 16)));
const COS_16_Q16 = Array.from({ length: 16 }, (_, i) => toQ16(Math.cos((i * Math.PI * 2) / 16)));

export const CHARACTER_ROSTER = {
  madoka: {
    id: "madoka",
    name: "Madoka Kaname",
    color: "#f472b6",
    shotColor: "#fbcfe8",
    speedQ16: toQ16(250.0),
    fireCooldownTicks: 10,
    shotSpeedQ16: toQ16(520.0),
    shotDamage: 14,
    spreadCount: 3,
    ultimateName: "Law of Cycles (Screen Purge)",
  },
  homura: {
    id: "homura",
    name: "Homura Akemi",
    color: "#a855f7",
    shotColor: "#e9d5ff",
    speedQ16: toQ16(280.0),
    fireCooldownTicks: 7,
    shotSpeedQ16: toQ16(620.0),
    shotDamage: 11,
    spreadCount: 1,
    ultimateName: "Shield Time-Stop (Freeze 4s)",
  },
  mami: {
    id: "mami",
    name: "Mami Tomoe",
    color: "#facc15",
    shotColor: "#fef08a",
    speedQ16: toQ16(220.0),
    fireCooldownTicks: 14,
    shotSpeedQ16: toQ16(560.0),
    shotDamage: 24,
    spreadCount: 2,
    ultimateName: "Tiro Finale (Heavy Cannon)",
  },
  kyoko: {
    id: "kyoko",
    name: "Kyoko Sakura",
    color: "#ef4444",
    shotColor: "#fecaca",
    speedQ16: toQ16(270.0),
    fireCooldownTicks: 11,
    shotSpeedQ16: toQ16(500.0),
    shotDamage: 18,
    spreadCount: 2,
    ultimateName: "Rosso Fantasma (Barrier Nova)",
  },
  sayaka: {
    id: "sayaka",
    name: "Sayaka Miki",
    color: "#38bdf8",
    shotColor: "#bae6fd",
    speedQ16: toQ16(290.0),
    fireCooldownTicks: 8,
    shotSpeedQ16: toQ16(540.0),
    shotDamage: 13,
    spreadCount: 2,
    ultimateName: "Fortissimo Surge (Rapid Regen)",
  },
};

export const BOSS_ROSTER = [
  {
    id: "charlotte",
    name: "Charlotte — Dessert Witch",
    color: "#f472b6",
    ringColor: "#fde047",
    baseHp: 900,
    radiusQ16: toQ16(28.0),
    sweepSpeedQ16: toQ16(95.0),
    fireInterval: 48,
    bulletSpeedQ16: toQ16(155.0),
    pattern: "ring",
    scoreValue: 5000,
  },
  {
    id: "oktavia",
    name: "Oktavia von Seckendorff — Mermaid Witch",
    color: "#38bdf8",
    ringColor: "#818cf8",
    baseHp: 1450,
    radiusQ16: toQ16(32.0),
    sweepSpeedQ16: toQ16(120.0),
    fireInterval: 22,
    bulletSpeedQ16: toQ16(175.0),
    pattern: "spiral",
    scoreValue: 8500,
  },
  {
    id: "walpurgisnacht",
    name: "Walpurgisnacht — Stage-Constructing Witch",
    color: "#c084fc",
    ringColor: "#f43f5e",
    baseHp: 2400,
    radiusQ16: toQ16(38.0),
    sweepSpeedQ16: toQ16(140.0),
    fireInterval: 34,
    bulletSpeedQ16: toQ16(195.0),
    pattern: "supercell",
    scoreValue: 15000,
  },
];

export const DIFFICULTY_MODES = {
  casual: {
    id: "casual",
    label: "Casual",
    enemySpeedMultQ16: toQ16(0.8),
    enemyHpMult: 0.85,
    spawnIntervalOffset: 10,
    despairTickInterval: 55,
    scoreMult: 1,
  },
  standard: {
    id: "standard",
    label: "Standard",
    enemySpeedMultQ16: toQ16(1.0),
    enemyHpMult: 1.0,
    spawnIntervalOffset: 0,
    despairTickInterval: 45,
    scoreMult: 1,
  },
  nightmare: {
    id: "nightmare",
    label: "Nightmare",
    enemySpeedMultQ16: toQ16(1.35),
    enemyHpMult: 1.35,
    spawnIntervalOffset: -10,
    despairTickInterval: 32,
    scoreMult: 2,
  },
  walpurgisnacht: {
    id: "walpurgisnacht",
    label: "Walpurgisnacht",
    enemySpeedMultQ16: toQ16(1.65),
    enemyHpMult: 1.75,
    spawnIntervalOffset: -16,
    despairTickInterval: 22,
    scoreMult: 3,
  },
};


export function createPlayerState(charId = "madoka", arenaWidth = 560, arenaHeight = 480) {
  const spec = CHARACTER_ROSTER[charId] || CHARACTER_ROSTER.madoka;
  return {
    charId: spec.id,
    xQ16: toQ16(arenaWidth / 2),
    yQ16: toQ16(arenaHeight - 56),
    vxQ16: 0,
    vyQ16: 0,
    radiusQ16: toQ16(10.0),
    purityHp: 100,
    maxPurityHp: 100,
    hopeMana: 60,
    maxHopeMana: 100,
    despairCorrupt: 0,
    cooldownTicks: 0,
    invulnTicks: 0,
    timeStopTicks: 0,
    rebellionOverdrive: false,
  };
}

export function spawnPlayerShots(player) {
  const spec = CHARACTER_ROSTER[player.charId] || CHARACTER_ROSTER.madoka;
  const shots = [];
  const baseVy = -spec.shotSpeedQ16;

  if (spec.spreadCount === 1) {
    shots.push({
      xQ16: player.xQ16,
      yQ16: player.yQ16 - toQ16(12.0),
      vxQ16: 0,
      vyQ16: baseVy,
      radiusQ16: toQ16(4.5),
      damage: player.rebellionOverdrive ? spec.shotDamage * 2 : spec.shotDamage,
      color: spec.shotColor,
    });
  } else if (spec.spreadCount === 2) {
    const offsets = [-10, 10];
    const vxAngles = [-35, 35];
    offsets.forEach((dx, i) => {
      shots.push({
        xQ16: player.xQ16 + toQ16(dx),
        yQ16: player.yQ16 - toQ16(10.0),
        vxQ16: toQ16(vxAngles[i]),
        vyQ16: baseVy,
        radiusQ16: toQ16(5.0),
        damage: player.rebellionOverdrive ? spec.shotDamage * 2 : spec.shotDamage,
        color: spec.shotColor,
      });
    });
  } else {
    const angles = [-75, 0, 75];
    angles.forEach((vx) => {
      shots.push({
        xQ16: player.xQ16,
        yQ16: player.yQ16 - toQ16(12.0),
        vxQ16: toQ16(vx),
        vyQ16: baseVy,
        radiusQ16: toQ16(5.0),
        damage: player.rebellionOverdrive ? spec.shotDamage * 2 : spec.shotDamage,
        color: spec.shotColor,
      });
    });
  }

  return shots;
}

export function spawnFamiliar(rngNext, waveNumber, arenaWidth = 560, diff = DIFFICULTY_MODES.standard) {
  const rollX = (rngNext() % (arenaWidth - 64)) + 32;
  const driftRoll = (rngNext() % 120) - 60;
  const fallSpeed = 65 + Math.min(110, waveNumber * 8);
  const isElite = waveNumber >= 2 && rngNext() % 5 === 0;
  const rawHp = isElite ? 55 + waveNumber * 10 : 22 + waveNumber * 4;
  const scaledHp = Math.max(10, Math.round(rawHp * diff.enemyHpMult));

  return {
    xQ16: toQ16(rollX),
    yQ16: toQ16(-16),
    vxQ16: qMul(toQ16(driftRoll), diff.enemySpeedMultQ16),
    vyQ16: qMul(toQ16(fallSpeed), diff.enemySpeedMultQ16),
    radiusQ16: toQ16(isElite ? 16.0 : 11.0),
    hp: scaledHp,
    maxHp: scaledHp,
    isElite,
    scoreValue: (isElite ? 350 : 100) * diff.scoreMult,
  };
}

export function spawnGriefSeed(xQ16, yQ16, isMajor = false) {
  return {
    xQ16,
    yQ16,
    vxQ16: 0,
    vyQ16: toQ16(75.0),
    radiusQ16: toQ16(isMajor ? 9.0 : 6.5),
    isMajor,
    despairClear: isMajor ? 35 : 15,
    hopeGain: isMajor ? 25 : 10,
  };
}

/**
 * Instantiate a Boss Witch encounter at waves 5, 10, 15, etc.
 */
export function spawnBossWitch(waveNumber, arenaWidth = 560, diff = DIFFICULTY_MODES.standard) {
  const tierIdx = Math.min(BOSS_ROSTER.length - 1, Math.floor(waveNumber / 5) - 1);
  const template = BOSS_ROSTER[Math.max(0, tierIdx)];
  const cycleScale = 1 + Math.floor(Math.max(0, waveNumber - 15) / 5);
  const totalHp = Math.round(template.baseHp * cycleScale * diff.enemyHpMult);

  return {
    ...template,
    xQ16: toQ16(arenaWidth / 2),
    yQ16: toQ16(78.0),
    vxQ16: qMul(template.sweepSpeedQ16, diff.enemySpeedMultQ16),
    vyQ16: 0,
    bulletSpeedQ16: qMul(template.bulletSpeedQ16, diff.enemySpeedMultQ16),
    fireInterval: Math.max(14, Math.round(template.fireInterval / (diff.id === "walpurgisnacht" ? 1.35 : 1.0))),
    hp: totalHp,
    maxHp: totalHp,
    scoreValue: template.scoreValue * diff.scoreMult,
    spiralAngleIdx: 0,
  };
                                        }

/**
 * Generate deterministic Q16.16 enemy projectiles from an active Boss Witch.
 */
export function spawnBossProjectiles(boss) {
  const bullets = [];
  const speed = boss.bulletSpeedQ16;

  if (boss.pattern === "ring") {
    // 12-way radial burst (every 1st/2nd step on 16-angle circle)
    for (let i = 0; i < 16; i += 2) {
      bullets.push({
        xQ16: boss.xQ16,
        yQ16: boss.yQ16,
        vxQ16: qMul(speed, COS_16_Q16[i]),
        vyQ16: qMul(speed, SIN_16_Q16[i]),
        radiusQ16: toQ16(5.5),
        damage: 14,
        color: boss.ringColor,
      });
    }
  } else if (boss.pattern === "spiral") {
    // 4-arm rotating spiral harmonic stream
    const base = boss.spiralAngleIdx & 15;
    boss.spiralAngleIdx = (boss.spiralAngleIdx + 1) & 15;
    for (let arm = 0; arm < 4; arm++) {
      const idx = (base + arm * 4) & 15;
      bullets.push({
        xQ16: boss.xQ16,
        yQ16: boss.yQ16,
        vxQ16: qMul(speed, COS_16_Q16[idx]),
        vyQ16: qMul(speed, SIN_16_Q16[idx]),
        radiusQ16: toQ16(5.0),
        damage: 15,
        color: boss.ringColor,
      });
    }
  } else {
    // Walpurgisnacht supercell: alternating full 16-ring and rotating spiral
    const step = (boss.spiralAngleIdx & 1) === 0 ? 1 : 2;
    const offset = boss.spiralAngleIdx & 15;
    boss.spiralAngleIdx = (boss.spiralAngleIdx + 1) & 15;
    for (let i = 0; i < 16; i += step) {
      const idx = (i + offset) & 15;
      bullets.push({
        xQ16: boss.xQ16,
        yQ16: boss.yQ16,
        vxQ16: qMul(speed, COS_16_Q16[idx]),
        vyQ16: qMul(speed, SIN_16_Q16[idx]),
        radiusQ16: toQ16(5.5),
        damage: 18,
        color: boss.ringColor,
      });
    }
  }

  return bullets;
}
