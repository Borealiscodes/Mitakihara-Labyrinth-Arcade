/**
 * src/arcade-audio.js — Zero-Dependency WebAudio Retro Arcade Synthesizer (Ledger 2)
 * Mute-by-default presentation audio generator for magic shots, Familiar pops,
 * Grief Seed pickups, Boss Witch alerts, and Ultimate fanfares.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

export function createArcadeAudio() {
  let muted = true;
  let ctx = null;

  const ensureCtx = () => {
    if (!ctx && typeof window !== "undefined") {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) ctx = new Ctor();
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  };

  const beep = (freqStart, freqEnd, durationSec, type = "triangle", gainPeak = 0.045) => {
    if (muted) return;
    const ac = ensureCtx();
    if (!ac) return;

    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + durationSec);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.015);
  };

  return {
    isMuted: () => muted,
    toggleMute: () => {
      muted = !muted;
      if (!muted) ensureCtx();
      return muted;
    },
    playShot: () => beep(720, 360, 0.06, "square", 0.018),
    playPop: () => beep(240, 75, 0.11, "sawtooth", 0.035),
    playSeed: () => {
      beep(587.33, 880, 0.14, "sine", 0.05);
    },
    playHit: () => beep(150, 55, 0.22, "sawtooth", 0.06),
    playBossWarning: () => {
      beep(220, 196, 0.25, "sawtooth", 0.055);
      setTimeout(() => beep(220, 196, 0.25, "sawtooth", 0.055), 280);
    },
    playUltimate: () => {
      beep(440, 880, 0.32, "triangle", 0.06);
      setTimeout(() => beep(659.25, 1318.5, 0.35, "sine", 0.05), 100);
    },
  };
}
