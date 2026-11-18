/**
 * src/arcade-audio.js — Zero-Dependency WebAudio Techno Sequencer & Retro SFX (v1.1.0)
 * Synthesizes a procedural 138 BPM (150 BPM Boss) dark-techno bass/percussion loop
 * alongside retro arcade sound effects inside Ledger 2.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

// D Phrygian / Harmonic Minor arpeggio frequencies (Hz)
const TECHNO_BASS_NOTES = [
  73.42, 73.42, 146.83, 73.42,
  77.78, 73.42, 110.00, 98.00,
  73.42, 73.42, 146.83, 155.56,
  110.00, 98.00, 87.31, 77.78,
];

export function createArcadeAudio() {
  let muted = true;
  let ctx = null;
  let stepIndex = 0;
  let nextNoteTime = 0;
  let schedulerTimer = null;
  let bossMode = false;

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

  const triggerKick = (time) => {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.11);

    gain.gain.setValueAtTime(0.16, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.15);
  };

  const triggerHat = (time, open = false) => {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(open ? 6400 : 8800, time);

    filter.type = "highpass";
    filter.frequency.setValueAtTime(5500, time);

    const dur = open ? 0.09 : 0.032;
    gain.gain.setValueAtTime(open ? 0.025 : 0.018, time);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  };

  const triggerBass = (time, freq, stepDur) => {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(bossMode ? freq * 1.122 : freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(bossMode ? 950 : 620, time);
    filter.frequency.exponentialRampToValueAtTime(160, time + stepDur * 0.9);

    gain.gain.setValueAtTime(0.055, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 0.92);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + stepDur);
  };

  const runScheduler = () => {
    if (!ctx || muted) return;
    const bpm = bossMode ? 150 : 138;
    const sixteenthSec = 60 / bpm / 4;

    while (nextNoteTime < ctx.currentTime + 0.12) {
      const step = stepIndex & 15;
      // 4-on-the-floor techno kick on steps 0, 4, 8, 12
      if (step % 4 === 0) triggerKick(nextNoteTime);
      // Off-beat open hats on 2, 6, 10, 14; closed hats on odd steps
      if (step % 4 === 2) triggerHat(nextNoteTime, true);
      else if (step % 2 === 1) triggerHat(nextNoteTime, false);

      // Driving acid bass arpeggio
      triggerBass(nextNoteTime, TECHNO_BASS_NOTES[step], sixteenthSec);

      nextNoteTime += sixteenthSec;
      stepIndex++;
    }
  };

  const startSequencer = () => {
    const ac = ensureCtx();
    if (!ac) return;
    if (schedulerTimer) clearInterval(schedulerTimer);
    nextNoteTime = ac.currentTime + 0.02;
    schedulerTimer = setInterval(runScheduler, 25);
  };

  const stopSequencer = () => {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  };

  const beep = (freqStart, freqEnd, durationSec, type = "triangle", gainPeak = 0.045) => {
    if (muted) return;
    const ac = ensureCtx();
    if (!ac) return;

    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ctx.createGain();

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
    setBossMode: (active) => {
      bossMode = Boolean(active);
    },
    toggleMute: () => {
      muted = !muted;
      if (!muted) {
        startSequencer();
      } else {
        stopSequencer();
      }
      return muted;
    },
    playShot: () => beep(720, 360, 0.06, "square", 0.016),
    playPop: () => beep(240, 75, 0.11, "sawtooth", 0.035),
    playSeed: () => beep(587.33, 880, 0.14, "sine", 0.055),
    playHit: () => beep(150, 55, 0.22, "sawtooth", 0.065),
    playBossWarning: () => {
      beep(220, 196, 0.25, "sawtooth", 0.06);
      setTimeout(() => beep(220, 196, 0.25, "sawtooth", 0.06), 280);
    },
    playUltimate: () => {
      beep(440, 880, 0.32, "triangle", 0.065);
      setTimeout(() => beep(659.25, 1318.5, 0.35, "sine", 0.055), 100);
    },
  };
}
