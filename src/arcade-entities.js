/**
 * src/arcade-entities.js — Playable Roster, Familiar Waves & Grief Seed Drops
 * Translates 4D Q16.16 channels [Hope, Despair, Purity, Entropy] into arcade stats,
 * character-specific projectile bursts, and Witch Familiar wave spawning.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

import { Q_ONE, toQ16 } from "./core.js";

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
    spreadCount: 3, // Rosebud triple-arrow spread
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
    spreadCount: 1, // Rapid precision rounds + Time-Stop ultimate
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
    spreadCount: 2, // Twin flintlock volley + Tiro Finale beam
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
    spreadCount: 2, // Chain-spear twin arc
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
    spreadCount: 2, // Twin blade crescent waves
    ultimateName: "Fortissimo Surge (Rapid Regen)",
  },
};

/**
 * Create initial player state in Q16.16 coordinates.
 */
export function createPlayerState(charId = "madoka", arenaWidth = 560, arenaHeight = 480) {
  const spec = CHARACTER_ROSTER[charId] || CHARACTER_ROSTER.madoka;
  return {
    charId: spec.id,
    xQ16: toQ16(arenaWidth / 2),
    yQ16: toQ16(arenaHeight - 56),
    vxQ16: 0,
    vyQ16: 0,
    radiusQ16: toQ16(10.0),
    purityHp: 100,       // Soul Gem Purity (0..100 HP)
    maxPurityHp: 100,
    hopeMana: 60,        // Hope Energy (0..100, powers Ultimate)
    maxHopeMana: 100,
    despairCorrupt: 0,   // Despair Corruption (0..100, vented by Grief Seeds)
    cooldownTicks: 0,
    invulnTicks: 0,
    timeStopTicks: 0,
    rebellionOverdrive: false,
  };
}

/**
 * Spawn player projectiles based on active character spread pattern.
 */
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

/**
 * Spawn a Witch Familiar enemy using the deterministic Mulberry32 PRNG.
 */
export function spawnFamiliar(rngNext, waveNumber, arenaWidth = 560) {
  const rollX = (rngNext() % (arenaWidth - 64)) + 32;
  const driftRoll = ((rngNext() % 120) - 60);
  const fallSpeed = 65 + Math.min(110, waveNumber * 8);
  const isElite = waveNumber >= 2 && (rngNext() % 5 === 0);

  return {
    xQ16: toQ16(rollX),
    yQ16: toQ16(-16),
    vxQ16: toQ16(driftRoll),
    vyQ16: toQ16(fallSpeed),
    radiusQ16: toQ16(isElite ? 16.0 : 11.0),
    hp: isElite ? 55 + waveNumber * 10 : 22 + waveNumber * 4,
    maxHp: isElite ? 55 + waveNumber * 10 : 22 + waveNumber * 4,
    isElite,
    scoreValue: isElite ? 350 : 100,
  };
}

/**
 * Spawn a collectible Grief Seed pickup when a Familiar is purified.
 */
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
