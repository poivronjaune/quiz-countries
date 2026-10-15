// Sound effects (PRD 6.5). Everything is synthesized with the Web Audio API: no audio files, no network.
// SOUND_DEFS is plain data so it can be unit-tested; the engine below only runs in a browser.
import { store, KEYS } from "./util.js";

// A note: f = frequency (Hz), t = start offset (s), d = duration (s), type = oscillator wave.
export const SOUND_DEFS = {
  // Rising C5 - E5 - G5 arpeggio (correct answer)
  success: { level: 0.3, voice: true, notes: [
    { f: 523.25, t: 0.0, d: 0.16, type: "triangle" },
    { f: 659.25, t: 0.12, d: 0.16, type: "triangle" },
    { f: 783.99, t: 0.24, d: 0.3, type: "sine" },
  ] },
  // Two falling low notes through a low-pass filter (wrong answer)
  fail: { level: 0.3, voice: true, lowpass: 900, notes: [
    { f: 196.0, t: 0.0, d: 0.2, type: "triangle" },
    { f: 146.83, t: 0.17, d: 0.3, type: "triangle" },
  ] },
  // Clock: a very short click, tick then tock (alternating pitch), clearly quieter than the others
  tick: { level: 0.12, notes: [{ f: 1500, t: 0, d: 0.03, type: "sine" }] },
  tock: { level: 0.12, notes: [{ f: 1050, t: 0, d: 0.03, type: "sine" }] },
  // Reserved for a future time limit (last seconds): same rhythm, higher pitch
  countdown: { level: 0.14, notes: [{ f: 2100, t: 0, d: 0.04, type: "square" }] },
  // Soft confirmation when sound is switched back on
  blip: { level: 0.1, notes: [{ f: 880, t: 0, d: 0.08, type: "sine" }] },
};
export const SOUND_NAMES = Object.keys(SOUND_DEFS);

export function readSoundPref(storage = store) {
  const v = storage.get(KEYS.sound, null);
  return !(v && v.on === false); // missing or unknown means on
}

let on = true;
let ctx = null;
let voiceGain = null; // success / fail share one voice so a new one replaces the previous
let tickFlip = false;

export const isSoundOn = () => on;

function announceChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("atlas:sound", { detail: { on } }));
}

function getCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch { ctx = null; }
  return ctx;
}

// Browsers only allow audio after a user gesture: create / resume the context on the first one.
function unlock() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function initSound() {
  on = readSoundPref();
  if (typeof window === "undefined" || initSound.done) return;
  initSound.done = true;
  for (const ev of ["pointerdown", "keydown", "touchstart"]) window.addEventListener(ev, unlock, { passive: true });
  window.addEventListener("storage", (e) => { if (e.key === KEYS.sound) { on = readSoundPref(); stopVoice(); announceChange(); } });
}

function stopVoice() {
  if (!voiceGain) return;
  try { voiceGain.gain.cancelScheduledValues(0); voiceGain.gain.value = 0; voiceGain.disconnect(); } catch { /* ignore */ }
  voiceGain = null;
}

export function setSoundOn(value) {
  on = !!value;
  store.set(KEYS.sound, { on });
  if (!on) stopVoice(); // muting cancels what is still playing
  announceChange();
}

/** After "Clear my data": sound goes back to on. */
export function resetSound() { on = true; announceChange(); }

export function playSound(name) {
  if (!on) return false;
  const def = SOUND_DEFS[name];
  if (!def) return false;
  try {
    const c = getCtx();
    if (!c) return false;
    if (c.state === "suspended") {
      // Not unlocked yet. Answer sounds are caused by a gesture, so retry once the context resumes; ticks are just skipped.
      if (def.voice || name === "blip") c.resume().then(() => { if (c.state === "running") playSound(name); }).catch(() => {});
      else c.resume().catch(() => {});
      return false;
    }
    const out = c.createGain();
    out.gain.value = def.level;
    let node = out;
    if (def.lowpass) { const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = def.lowpass; f.connect(c.destination); out.connect(f); }
    else out.connect(c.destination);
    if (def.voice) { stopVoice(); voiceGain = out; }
    const t0 = c.currentTime + 0.01;
    for (const n of def.notes) {
      const osc = c.createOscillator(), env = c.createGain();
      osc.type = n.type || "sine"; osc.frequency.value = n.f;
      const s = t0 + n.t, e = s + n.d;
      env.gain.setValueAtTime(0.0001, s);
      env.gain.exponentialRampToValueAtTime(1, s + Math.min(0.012, n.d / 3));
      env.gain.exponentialRampToValueAtTime(0.0001, e);
      osc.connect(env); env.connect(node);
      osc.start(s); osc.stop(e + 0.02);
    }
    return true;
  } catch { return false; } // never break the app because of audio
}

// One clock sound per call, alternating tick / tock.
export function playTick() {
  tickFlip = !tickFlip;
  return playSound(tickFlip ? "tick" : "tock");
}
