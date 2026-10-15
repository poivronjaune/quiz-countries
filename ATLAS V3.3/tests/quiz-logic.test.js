import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPool, makeQuestions, pickDistractors, buildOptions, typedMatches, isBetter, formatTime, eligible } from "../src/js/quiz-logic.js";
import { normalize } from "../src/js/util.js";

const countries = JSON.parse(readFileSync(new URL("../src/data/countries.json", import.meta.url)));

test("normalize strips accents, case and punctuation", () => {
  assert.equal(normalize("Côte d’Ivoire"), "cote divoire");
  assert.equal(normalize("  Washington, D.C. "), "washington d c");
});
test("typed answers accept aliases and accents", () => {
  const ci = countries.find((c) => c.iso2 === "CI");
  assert.ok(typedMatches("cote d'ivoire", [ci.name, ...(ci.aliases || [])]));
  assert.ok(typedMatches("IVORY coast", [ci.name, ...(ci.aliases || [])]));
  assert.ok(!typedMatches("", [ci.name]));
});
test("UN pool excludes territories; all pool includes them", () => {
  const un = buildPool(countries, { mode: "flag-name", pool: "un" });
  const all = buildPool(countries, { mode: "flag-name", pool: "all" });
  assert.equal(un.length, 195);
  assert.equal(all.length, 248);
});
test("capital modes exclude countries without a capital; locate excludes shapeless", () => {
  const cap = buildPool(countries, { mode: "country-capital", pool: "all" });
  assert.ok(cap.every((c) => c.capitals.length > 0));
  assert.equal(248 - cap.length, 5);
  const loc = buildPool(countries, { mode: "locate", pool: "all" });
  assert.ok(!loc.some((c) => ["BVT", "GIB", "UMI"].includes(c.iso3)));
});
test("region filter", () => {
  const eu = buildPool(countries, { mode: "locate", region: "Europe", pool: "all" });
  assert.ok(eu.length > 30 && eu.every((c) => c.continent === "Europe"));
});
test("questions never repeat and respect the pool size", () => {
  const pool = buildPool(countries, { mode: "flag-name", region: "South America", pool: "un" });
  const q = makeQuestions(pool, 50);
  assert.equal(q.length, pool.length);
  assert.equal(new Set(q.map((x) => x.iso)).size, q.length);
});
test("distractors: 3 unique, plausible (same continent first), never the answer", () => {
  const ke = countries.find((c) => c.iso3 === "KEN");
  const d = pickDistractors(ke, countries, (c) => c.name);
  assert.equal(d.length, 3);
  assert.ok(d.every((c) => c.iso3 !== "KEN" && c.continent === "Africa"));
  const o = buildOptions(ke, countries, (c) => c.name);
  assert.equal(o.length, 4); assert.ok(o.includes("KEN"));
});
test("capital distractors differ in text", () => {
  const withCap = countries.filter((c) => c.capitals.length);
  const fr = countries.find((c) => c.iso3 === "FRA");
  const d = pickDistractors(fr, withCap, (c) => c.capitals.join(" "));
  assert.ok(d.every((c) => c.capitals[0] !== "Paris"));
});
test("isBetter and formatTime", () => {
  assert.ok(isBetter(8, 10, null)); assert.ok(!isBetter(0, 5, null)); assert.ok(isBetter(9, 10, { score: 8, total: 10 })); assert.ok(!isBetter(7, 10, { score: 8, total: 10 }));
  assert.equal(formatTime(65000), "1:05");
});
