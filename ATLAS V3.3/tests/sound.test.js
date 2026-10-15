import test from "node:test";
import assert from "node:assert/strict";
import { SOUND_DEFS, SOUND_NAMES, readSoundPref, isSoundOn, setSoundOn, playSound, playTick } from "../src/js/sound.js";

const mem = (v) => ({ get: () => v });
test("sound is on by default and when the stored value is missing or unknown", () => {
  assert.equal(readSoundPref(mem(null)), true);
  assert.equal(readSoundPref(mem({})), true);
  assert.equal(readSoundPref(mem({ on: "x" })), true);
  assert.equal(readSoundPref(mem({ on: false })), false);
  assert.equal(readSoundPref(mem({ on: true })), true);
});
test("every sound is defined with positive notes and a sane level", () => {
  for (const n of ["success", "fail", "tick", "tock", "countdown", "blip"]) assert.ok(SOUND_NAMES.includes(n), n);
  for (const [name, d] of Object.entries(SOUND_DEFS)) {
    assert.ok(d.level > 0 && d.level <= 0.35, name);
    for (const note of d.notes) assert.ok(note.f > 50 && note.d > 0 && note.t >= 0, name);
  }
});
test("success rises, fail falls, tick is quieter and shorter than success and fail", () => {
  const f = (n) => SOUND_DEFS[n].notes.map((x) => x.f);
  assert.deepEqual(f("success"), [...f("success")].sort((a, b) => a - b));
  assert.deepEqual(f("fail"), [...f("fail")].sort((a, b) => b - a));
  assert.ok(SOUND_DEFS.tick.level < SOUND_DEFS.success.level && SOUND_DEFS.tick.level < SOUND_DEFS.fail.level);
  assert.ok(SOUND_DEFS.tick.notes[0].d < 0.06);
  assert.ok(SOUND_DEFS.countdown.notes[0].f > SOUND_DEFS.tick.notes[0].f);
});
test("without Web Audio (node) nothing throws and nothing plays; muted never plays", () => {
  assert.equal(playSound("success"), false);
  assert.equal(playTick(), false);
  setSoundOn(false);
  assert.equal(isSoundOn(), false);
  assert.equal(playSound("fail"), false);
  assert.equal(playSound("unknown"), false);
});
