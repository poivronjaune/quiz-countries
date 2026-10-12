// Pure quiz logic (no DOM): pools, question generation, distractors, answer checking.
import { normalize, shuffle } from "./util.js";

export const MODES = ["locate", "flag-name", "name-flag", "capital-country", "country-capital"];
/** style: which answer styles the mode supports */
export const MODE_META = {
  locate: { styles: ["map"], answerKind: "country" },
  "flag-name": { styles: ["choice", "typed"], answerKind: "name" },
  "name-flag": { styles: ["choice"], answerKind: "flag" },
  "capital-country": { styles: ["choice", "typed"], answerKind: "name" },
  "country-capital": { styles: ["choice", "typed"], answerKind: "capital" },
};
export const COUNTS = [5, 10, 20, 50];

/** Can this country be asked in this mode? */
export function eligible(c, mode) {
  if (mode === "locate") return c.hasShape === true;
  if (mode === "capital-country" || mode === "country-capital") return !c.noCapital && c.capitals.length > 0;
  return true;
}

export function buildPool(countries, { mode, region = "World", pool = "un" }) {
  return countries.filter((c) =>
    eligible(c, mode) &&
    (region === "World" || c.continent === region) &&
    (pool === "all" || c.status === "member" || c.status === "observer"));
}

/** Questions without repeats (Fisher-Yates), limited to the pool size. */
export function makeQuestions(pool, count, rng = Math.random) {
  return shuffle(pool, rng).slice(0, Math.min(count, pool.length)).map((c) => ({ iso: c.iso3 }));
}

/**
 * Three plausible wrong answers: same sub-region first, then same continent, then anywhere.
 * `valueOf(c)` is what the player sees, so duplicates (equal text) are skipped.
 */
export function pickDistractors(country, universe, valueOf, rng = Math.random, count = 3) {
  const own = valueOf(country);
  const rest = universe.filter((c) => c.iso3 !== country.iso3);
  const sub = shuffle(rest.filter((c) => c.subregion && c.subregion === country.subregion), rng);
  const cont = shuffle(rest.filter((c) => c.continent === country.continent && !sub.includes(c)), rng);
  const other = shuffle(rest.filter((c) => c.continent !== country.continent), rng);
  const seen = new Set([normalize(own)]);
  const out = [];
  for (const c of [...sub, ...cont, ...other]) {
    const v = normalize(valueOf(c));
    if (!v || seen.has(v)) continue;
    seen.add(v); out.push(c);
    if (out.length === count) break;
  }
  return out;
}

/** Shuffled option list [correct + distractors] as iso codes. */
export function buildOptions(country, universe, valueOf, rng = Math.random) {
  return shuffle([country, ...pickDistractors(country, universe, valueOf, rng)], rng).map((c) => c.iso3);
}

/** Accent-, case- and punctuation-insensitive comparison against accepted answers. */
export function typedMatches(text, accepted) {
  const n = normalize(text);
  return n !== "" && accepted.some((a) => normalize(a) === n);
}

export const bestKey = (mode, region) => `${mode}|${region}`;

/** True when (score,total) beats the stored best (higher percentage, then more questions). */
export function isBetter(score, total, best) {
  if (!best) return score > 0 && total > 0;
  const a = score / total, b = best.score / best.total;
  return a > b || (a === b && total > best.total);
}

export function formatTime(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
