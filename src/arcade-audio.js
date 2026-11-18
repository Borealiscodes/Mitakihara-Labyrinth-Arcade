/**
 * src/arcade-audio.js — Zero-Dependency WebAudio Symphonic Waltz & Techno Engine (v1.2.1)
 * Synthesizes an 8-bar D-minor Baroque chamber waltz (cello pedal, harpsichord
 * arpeggio, vibrato violin melody, and boss timpani) alongside a 138/150 BPM
 * dark-techno mode and retro arcade SFX strictly inside Ledger 2.
 *
 * Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
 */

// 8-Bar D-Minor Baroque Progression (3/4 Waltz: 24 beats total)
// Bars: Dm -> Gm6 -> A7 -> Dm -> BbMaj7 -> Edim7 -> A7sus4 -> Dm
const WALTZ_PROGRESSION = [
  { bass: 73.42, arp: [146.83, 220.0, 293.66], lead: [587.33, 659.25, 698.46] }, // Dm
  { bass: 98.0, arp: [196.0, 293.66, 392.0], lead: [783.99, 698.46, 659.25] },   // Gm6
  { bass: 110.0, arp: [220.0, 277.18, 329.63], lead: [554.37, 587.33, 659.25] }, // A7
  { bass: 73.42, arp: [146.83, 174.61, 220.0], lead: [587.33, 440.0, 587.33] },  // Dm
  { bass: 116.54, arp: [233.08, 293.66, 349.23], lead: [698.46, 783.99, 880.0] },// BbMaj7
  { bass: 82.41, arp: [164.81, 196.0, 233.08], lead: [932.33, 880.0, 783.99] },  // Edim7
  { bass: 110.0, arp: [220.0, 293.66, 329.63], lead: [659.25, 587.33, 554.37] }, // A7sus4 -> A7
  { bass: 73.42, arp: [146.83, 220.0, 349.23], lead: [587.33, 587.33, 440.0] },  // Dm
];

const TECHNO_BASS_NOTES = [
  73.42, 73.42, 146.83, 73.42,
  77.78, 73.42, 110.0, 98.0,
  73.42, 73.42, 146.83, 155.56,
  110.0, 98.0, 87.31, 77.78,
];

export function createArcadeAudio() {
  let mode = "muted"; // "muted" | "symphonic" | "techno"
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

  // --- Symphonic Baroque Voices ---
  const triggerCello = (time, freq, dur) => {
    if (!ctx || mode === "muted") return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(340, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.075, time + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  };

  const triggerHarpsichord = (time, freq, dur) => {
    if (!ctx || mode === "muted") return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq * 2.2, time);
    filter.Q.setValueAtTime(1.8, time);

    gain.gain.setValueAtTime(0.048, time);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur + 0.015);
  };

  const triggerViolinLead = (time, freq, dur) => {
    if (!ctx || mode === "muted") return;
    const osc = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    vibrato.type = "sine";
    vibrato.frequency.setValueAtTime(5.5, time);
    vibGain.gain.setValueAtTime(4.0, time);

    vibrato.connect(vibGain);
    vibGain.connect(osc.frequency);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.036, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    vibrato.start(time);
    osc.stop(time + dur + 0.02);
    vibrato.stop(time + dur + 0.02);
  };

  const triggerBossTimpani = (time) => {
    if (!ctx || mode === "muted") return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(115, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.22);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.26);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.28);
  };

  // --- Dark Techno Voices ---
  const triggerKick = (time) => {
    if (!ctx || mode === "muted") return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.11);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.15);
  };

  const triggerHat = (time, open = false) => {
    if (!ctx || mode === "muted") return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(open ? 6400 : 8800, time);

    filter.type = "highpass";
    filter.frequency.setValueAtTime(5500, time);

    const dur = open ? 0.09 : 0.032;
    gain.gain.setValueAtTime(open ? 0.022 : 0.015, time);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  };

  const triggerTechnoBass = (time, freq, stepDur) => {
    if (!ctx || mode === "muted") return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(bossMode ? freq * 1.122 : freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(bossMode ? 950 : 620, time);
    filter.frequency.exponentialRampToValueAtTime(160, time + stepDur * 0.9);

    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 0.92);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + stepDur);
  };

  const runScheduler = () => {
    if (!ctx || mode === "muted") return;

    if (mode === "symphonic") {
      // 3/4 Gothic Waltz: 126 BPM standard, 152 BPM during Boss Witch battles
      const bpm = bossMode ? 152 : 126;
      const beatSec = 60 / bpm;

      while (nextNoteTime < ctx.currentTime + 0.16) {
        const beatInMeasure = stepIndex % 3;
        const barIdx = Math.floor(stepIndex / 3) % WALTZ_PROGRESSION.length;
        const bar = WALTZ_PROGRESSION[barIdx];

        if (beatInMeasure === 0) {
          triggerCello(nextNoteTime, bar.bass, beatSec * 2.7);
          if (bossMode) triggerBossTimpani(nextNoteTime);
        }
        triggerHarpsichord(nextNoteTime, bar.arp[beatInMeasure], beatSec * 0.85);
        triggerViolinLead(nextNoteTime, bar.lead[beatInMeasure], beatSec * 0.95);

        nextNoteTime += beatSec;
        stepIndex++;
      }
    } else if (mode === "techno") {
      const bpm = bossMode ? 150 : 138;
      const sixteenthSec = 60 / bpm / 4;

      while (nextNoteTime < ctx.currentTime + 0.12) {
        const step = stepIndex & 15;
        if (step % 4 === 0) triggerKick(nextNoteTime);
        if (step % 4 === 2) triggerHat(nextNoteTime, true);
        else if (step % 2 === 1) triggerHat(nextNoteTime, false);

        triggerTechnoBass(nextNoteTime, TECHNO_BASS_NOTES[step], sixteenthSec);

        nextNoteTime += sixteenthSec;
        stepIndex++;
      }
    }
  };

  const startSequencer = () => {
    const ac = ensureCtx();
    if (!ac) return;
    if (schedulerTimer) clearInterval(schedulerTimer);
    stepIndex = 0;
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
    if (mode === "muted") return;
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
    getMode: () => mode,
    isMuted: () => mode === "muted",
    setBossMode: (active) => {
      bossMode = Boolean(active);
    },
    cycleMode: () => {
      if (mode === "muted") {
        mode = "symphonic";
        startSequencer();
      } else if (mode === "symphonic") {
        mode = "techno";
        startSequencer();
      } else {
        mode = "muted";
        stopSequencer();
      }
      return mode;
    },
    playShot: () => beep(720, 360, 0.06, "square", 0.015),
    playPop: () => beep(240, 75, 0.11, "sawtooth", 0.032),
playSeed: () => beep(587.33, 880, 0.14, "sine", 0.05),
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

