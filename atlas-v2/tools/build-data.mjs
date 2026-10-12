// Build step: turns the raw Natural Earth GeoJSON + UN M49 country list into
// compact files the browser can load quickly.
//   input : tools/source/countries.json, tools/source/world-countries.geojson
//   output: src/data/countries.json  (enriched records)
//           src/data/shapes.json     (simplified SVG paths, map units 960x480)
// Run:  node tools/build-data.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "tools", "source");
const OUT = join(root, "src", "data");
mkdirSync(OUT, { recursive: true });

const W = 960, H = 480;
const TOLERANCE = 0.14; // map units (~0.05 degrees); Douglas-Peucker
const proj = ([lon, lat]) => [((lon + 180) * W) / 360, ((90 - lat) * H) / 180];

const countries = JSON.parse(readFileSync(join(SRC, "countries.json"), "utf8"));
const geo = JSON.parse(readFileSync(join(SRC, "world-countries.geojson"), "utf8"));

// ---------- geometry ----------
function dp(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, idx = -1;
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let d;
      if (len2 === 0) d = Math.hypot(px - ax, py - ay);
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      }
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

function bboxOf(ring) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of ring) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}

const r1 = (n) => Math.round(n * 10) / 10;
function ringToPath(ring) {
  // relative commands built from already-rounded absolutes so rounding never drifts
  let out = "";
  let px = 0, py = 0;
  ring.forEach(([x, y], i) => {
    const rx = r1(x), ry = r1(y);
    if (i === 0) out += `M${rx} ${ry}`;
    else {
      const dx = r1(rx - px), dy = r1(ry - py);
      if (dx !== 0 || dy !== 0) out += `l${dx} ${dy}`;
    }
    px = rx; py = ry;
  });
  return out + "z";
}

function shapeFromFeature(f) {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let d = "";
  let main = null, mainArea = -1;
  for (const poly of polys) {
    const outer = poly[0].map(proj);
    const bb = bboxOf(outer);
    const area = (bb[2] - bb[0]) * (bb[3] - bb[1]);
    if (area > mainArea) { mainArea = area; main = bb; }
    for (const ring of poly) {
      const pts = ring.map(proj);
      const rb = bboxOf(pts);
      const tol = Math.min(TOLERANCE, Math.max(rb[2] - rb[0], rb[3] - rb[1]) / 8);
      let s = dp(pts, tol);
      if (s.length < 4) s = pts.length >= 4 ? [pts[0], pts[Math.floor(pts.length / 3)], pts[Math.floor((2 * pts.length) / 3)], pts[pts.length - 1]] : pts;
      d += ringToPath(s);
    }
  }
  return { d, main };
}

const shapes = [];
const byIso = new Map();
for (const f of geo.features) {
  const { d, main } = shapeFromFeature(f);
  const iso = f.properties.iso;
  if (iso && byIso.has(iso)) { // merge duplicate features of the same country
    const s = byIso.get(iso); s.d += d; continue;
  }
  const s = { iso: iso || null, d, main, continent: f.properties.continent };
  shapes.push(s);
  if (iso) byIso.set(iso, s);
}

// ---------- country enrichment ----------
const UN_MEMBERS = ("AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW").split(" ");
const OBSERVERS = ["VA", "PS"];

// Friendlier display names (the M49 names are official long forms).
const SHORT = {
  en: { GB: "United Kingdom", US: "United States", HK: "Hong Kong", MO: "Macao", KP: "North Korea", KR: "South Korea",
        CD: "DR Congo", VA: "Vatican City", PS: "Palestine", TZ: "Tanzania", BO: "Bolivia", VE: "Venezuela", LA: "Laos",
        NL: "Netherlands", FM: "Micronesia", FK: "Falkland Islands", VI: "U.S. Virgin Islands", UM: "U.S. Minor Outlying Islands",
        BQ: "Caribbean Netherlands", SJ: "Svalbard and Jan Mayen", HM: "Heard and McDonald Islands", GS: "South Georgia and South Sandwich Islands",
        IO: "British Indian Ocean Territory", TF: "French Southern Territories", VC: "St. Vincent and the Grenadines", RU: "Russia",
        CV: "Cape Verde", CZ: "Czechia", MM: "Myanmar (Burma)", SY: "Syria", MD: "Moldova", IR: "Iran", BN: "Brunei" },
  fr: { CD: "RD Congo", SH: "Sainte-Hélène", GS: "Géorgie du Sud et îles Sandwich du Sud", TF: "Terres australes françaises",
        IO: "Territoire britannique de l'océan Indien", UM: "Îles mineures éloignées des É.-U.", HM: "Îles Heard et McDonald",
        CV: "Cap-Vert", FK: "Îles Malouines", VA: "Vatican", UA: "Ukraine" },
};
const ALIASES = {
  en: { US: ["USA", "America", "United States of America"], GB: ["UK", "Britain", "Great Britain", "United Kingdom of Great Britain and Northern Ireland"],
        CI: ["Ivory Coast", "Cote d'Ivoire"], CZ: ["Czech Republic"], MM: ["Burma", "Myanmar"], SZ: ["Swaziland"], MK: ["Macedonia"],
        CV: ["Cabo Verde"], TL: ["East Timor"], CD: ["DRC", "Democratic Republic of the Congo", "Congo Kinshasa"], CG: ["Republic of the Congo", "Congo Brazzaville"],
        KR: ["Korea", "Republic of Korea"], KP: ["Democratic People's Republic of Korea"], VA: ["Holy See", "Vatican"], PS: ["State of Palestine"],
        TR: ["Turkey", "Türkiye"], RU: ["Russian Federation"], NL: ["Holland", "The Netherlands"], AE: ["UAE", "Emirates"], BO: ["Bolivia (Plurinational State of)"],
        VE: ["Venezuela (Bolivarian Republic of)"], FM: ["Federated States of Micronesia"], TZ: ["United Republic of Tanzania"], HK: ["China, Hong Kong"], MO: ["China, Macao", "Macau"], BS: ["The Bahamas"], GM: ["The Gambia"], LA: ["Lao People's Democratic Republic"], SY: ["Syrian Arab Republic"], IR: ["Iran (Islamic Republic of)"], MD: ["Republic of Moldova"] },
  fr: { US: ["USA", "Etats-Unis d'Amerique", "Etats Unis"], GB: ["UK", "Angleterre", "Grande-Bretagne"], CI: ["Cote d'Ivoire"], CZ: ["Republique tcheque", "Tchequie"],
        MM: ["Myanmar"], SZ: ["Swaziland", "Eswatini"], MK: ["Macedoine"], CV: ["Cap Vert", "Cabo Verde"], TL: ["Timor-Leste"], CD: ["RDC", "Congo Kinshasa", "Republique democratique du Congo"],
        CG: ["Congo Brazzaville", "Republique du Congo"], VA: ["Saint-Siege", "Cite du Vatican"], NL: ["Hollande"], AE: ["EAU", "Emirats"], TR: ["Turkiye"], RU: ["Federation de Russie"] },
};

// Places that can't be drawn: a point on the map so the pulsing marker can still show where they are.
const MANUAL_CENTROID = { BVT: [3.4, -54.4], GIB: [-5.35, 36.14], UMI: [166.6, 19.3] };

const splitCapitals = (s) => (s ? s.split(/\s*\/\s*/).filter(Boolean) : []);
const bad = [];
const out = countries.map((c) => {
  const iso3 = c.isoAlpha3, iso2 = c.isoAlpha2;
  const shape = byIso.get(iso3);
  const rec = {
    iso3, iso2, m49: c.m49Code,
    name: SHORT.en[iso2] || c.name,
    officialName: c.name,
    continent: c.continent,
    subregion: c.m49Subregion || "",
    status: UN_MEMBERS.includes(iso2) ? "member" : OBSERVERS.includes(iso2) ? "observer" : "territory",
    capitals: splitCapitals(c.capital),
    language: {},
  };
  if (rec.capitals.length === 0) rec.noCapital = true;
  const aliasEn = ALIASES.en[iso2] || [];
  const aliasList = [...aliasEn];
  if (c.name !== rec.name) aliasList.push(c.name);
  if (aliasList.length) rec.aliases = [...new Set(aliasList)];
  for (const [lang, v] of Object.entries(c.language || {})) {
    const fr = { name: SHORT[lang]?.[iso2] || v.name, continent: v.continent, capitals: splitCapitals(v.capital) };
    const al = [...(ALIASES[lang]?.[iso2] || [])];
    if (v.name !== fr.name) al.push(v.name);
    if (al.length) fr.aliases = [...new Set(al)];
    rec.language[lang] = fr;
  }
  if (shape) {
    const [x0, y0, x1, y1] = shape.main;
    rec.bbox = [r1(x0), r1(y0), r1(x1), r1(y1)];
    rec.centroid = [r1((x0 + x1) / 2), r1((y0 + y1) / 2)];
    rec.hasShape = true;
  } else if (MANUAL_CENTROID[iso3]) {
    rec.centroid = proj(MANUAL_CENTROID[iso3]).map(r1);
    rec.hasShape = false;
  } else bad.push(iso3);
  return rec;
});

writeFileSync(join(OUT, "countries.json"), JSON.stringify(out));
writeFileSync(join(OUT, "shapes.json"), JSON.stringify(shapes.map((s) => ({ i: s.iso, d: s.d }))));
const sz = (n) => (readFileSync(join(OUT, n)).length / 1024).toFixed(0) + " KB";
console.log(`countries: ${out.length} (${sz("countries.json")}), shapes: ${shapes.length} (${sz("shapes.json")})`);
console.log("members:", out.filter((c) => c.status === "member").length, "observers:", out.filter((c) => c.status === "observer").length);
console.log("no shape & no centroid:", bad.join(",") || "none");
