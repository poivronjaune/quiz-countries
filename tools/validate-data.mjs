// Data + locale validation (run in CI): node tools/validate-data.mjs
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const countries = JSON.parse(readFileSync(join(root, "data/countries.json"), "utf8"));
const shapes = JSON.parse(readFileSync(join(root, "data/shapes.json"), "utf8"));
const CONT = ["Africa", "Antarctica", "Asia", "Europe", "North America", "Oceania", "South America"];
const errors = [];
const isos = new Set(countries.map((c) => c.iso3));
for (const c of countries) {
  if (!existsSync(join(root, "img/flags", `${c.iso2.toLowerCase()}.svg`))) errors.push(`${c.iso3}: flag missing`);
  if (!c.language?.fr?.name) errors.push(`${c.iso3}: French name missing`);
  if (!CONT.includes(c.continent)) errors.push(`${c.iso3}: bad continent`);
  if (!c.capitals.length && !c.noCapital) errors.push(`${c.iso3}: no capital and no noCapital flag`);
  if (!c.centroid) errors.push(`${c.iso3}: no centroid`);
}
for (const s of shapes) if (s.i && !isos.has(s.i)) errors.push(`shape ${s.i}: no country record`);
const en = JSON.parse(readFileSync(join(root, "locales/en.json"), "utf8")), fr = JSON.parse(readFileSync(join(root, "locales/fr.json"), "utf8"));
for (const k of Object.keys(en)) if (!(k in fr)) errors.push(`fr locale missing ${k}`);
for (const k of Object.keys(fr)) if (!(k in en)) errors.push(`en locale missing ${k}`);
// every key used in code or HTML must exist
const src = [...readdirSync(join(root, "js")).map((f) => readFileSync(join(root, "js", f), "utf8")), readFileSync(join(root, "index.html"), "utf8"), readFileSync(join(root, "quiz.html"), "utf8")].join("\n");
const used = new Set([...src.matchAll(/\bt\("([\w.-]+)"/g)].map((m) => m[1]));
for (const m of src.matchAll(/data-i18n(?:-[\w-]+)?="([\w.-]+)"/g)) used.add(m[1]);
for (const m of src.matchAll(/\btp\("([\w.-]+)"/g)) for (const s of ["one", "other"]) used.add(`${m[1]}.${s}`);
for (const m of src.matchAll(/t\(`(mode\.)\$\{[^}]+\}(\.desc)?`\)/g)) for (const mo of ["locate", "flag-name", "name-flag", "capital-country", "country-capital"]) used.add(`mode.${mo}${m[2] || ""}`);
for (const k of used) if (!(k in en)) errors.push(`locale key not defined: ${k}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`OK: ${countries.length} countries, ${shapes.length} shapes, ${Object.keys(en).length} strings, ${used.size} keys used`);
