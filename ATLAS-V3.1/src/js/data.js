// Loads and indexes country + map data. Language-aware accessors live here.
import { getLang, collator } from "./i18n.js";
import { normalize } from "./util.js";

export const CONTINENTS = ["Africa", "Antarctica", "Asia", "Europe", "North America", "Oceania", "South America"];

// lon/lat boxes used for default framing: [west, south, east, north]
const CONTINENT_LL = {
  Africa: [-20, -36, 52, 38], Antarctica: [-180, -90, 180, -60], Asia: [26, -11, 146, 78],
  Europe: [-25, 34, 45, 72], "North America": [-170, 5, -50, 84], Oceania: [112, -48, 180, 2],
  "South America": [-83, -57, -33, 14],
};
export function continentBounds(name) {
  const b = CONTINENT_LL[name];
  if (!b) return [0, 0, 960, 480];
  const x = (lon) => ((lon + 180) * 960) / 360, y = (lat) => ((90 - lat) * 480) / 180;
  return [x(b[0]), y(b[3]), x(b[2]), y(b[1])];
}

let countries = [];
let shapes = [];
const byIso = new Map();

export async function loadData() {
  const [c, s] = await Promise.all([
    fetch("./data/countries.json").then((r) => { if (!r.ok) throw new Error("countries"); return r.json(); }),
    fetch("./data/shapes.json").then((r) => { if (!r.ok) throw new Error("shapes"); return r.json(); }),
  ]);
  countries = c; shapes = s;
  byIso.clear();
  for (const x of countries) byIso.set(x.iso3, x);
  return { countries, shapes };
}

export const allCountries = () => countries;
export const allShapes = () => shapes;
export const countryByIso = (iso) => byIso.get(iso);

const L = (c, lang = getLang()) => (lang === "en" ? c : c.language?.[lang]) || c;
export const nameOf = (c, lang) => L(c, lang).name ?? c.name;
export const continentOf = (c, lang) => (lang ?? getLang()) === "en" ? c.continent : c.language?.[lang ?? getLang()]?.continent ?? c.continent;
export const capitalsOf = (c, lang) => L(c, lang).capitals ?? c.capitals;
export const aliasesOf = (c, lang) => (L(c, lang).aliases ?? (lang && lang !== "en" ? [] : c.aliases)) || [];
export const flagUrl = (c) => `./img/flags/${c.iso2.toLowerCase()}.svg`;

export function continentName(en) {
  if (getLang() === "en") return en;
  const hit = countries.find((c) => c.continent === en);
  return hit?.language?.[getLang()]?.continent ?? en;
}

export function sortedByContinent(continent) {
  const col = collator();
  return countries.filter((c) => c.continent === continent).sort((a, b) => col.compare(nameOf(a), nameOf(b)));
}
export const continentCount = (continent) => countries.filter((c) => c.continent === continent).length;

/** Search: names that start with the query first, then words that start with it. Accent-insensitive. */
export function searchCountries(query, limit = 8) {
  const q = normalize(query);
  if (!q) return [];
  const starts = [], words = [];
  for (const c of countries) {
    const names = [nameOf(c), ...aliasesOf(c)].map(normalize);
    if (names.some((n) => n.startsWith(q))) starts.push(c);
    else if (names.some((n) => n.split(" ").some((w) => w.startsWith(q)))) words.push(c);
  }
  const col = collator();
  const sort = (a) => a.sort((x, y) => col.compare(nameOf(x), nameOf(y)));
  return [...sort(starts), ...sort(words)].slice(0, limit);
}
