# ATLAS v2

Static, responsive web app to practise country names, locations, flags and capitals (EN/FR).
Built from `ATLAS-PRD-v2.md`. No build step for the app: plain ES modules, CSS and JSON.

## Run
```
python3 -m http.server -d src 8080     # or: npx serve src
```
Open http://localhost:8080 (ES modules and `fetch` need a server; `file://` will not work).

## Layout
```
src/index.html, quiz.html      pages (Explore is the landing page)
src/js/map-view.js             shared SVG map: pointer-event pan, pinch, double-tap, wheel, keyboard
src/js/map-math.js             pure view maths (clamp, fit, zoom-at-point) - unit tested
src/js/explore.js              continents, lists, detail card, bottom sheet / side panel
src/js/quiz.js, quiz-logic.js  quiz UI and pure logic (pools, distractors, answer matching) - unit tested
src/js/i18n.js, data.js        locale loading, country data accessors
src/locales/en.json, fr.json   all UI strings
src/data/countries.json        enriched M49 data (status, capitals[], aliases, bbox, centroid)
src/data/shapes.json           simplified SVG paths (270 KB, ~74 KB gzipped; was a 1.7 MB GeoJSON)
tools/build-data.mjs           regenerates src/data/* from tools/source/*
tools/validate-data.mjs        data + locale checks (flags exist, FR names, keys used = keys defined)
```

## Commands
```
npm run build:data   # regenerate src/data from tools/source
npm run validate     # data and locale checks
npm test             # unit tests (node:test, no dependencies)
```

## Adding a language
Add `src/locales/<code>.json`, add `language.<code>` to each country in `tools/build-data.mjs` input, add the code to `LANGUAGES` in `src/js/i18n.js`.

## Known gaps / decisions
- System font stack instead of self-hosted web fonts (no third-party requests at all).
- Equirectangular projection kept (960x480) to keep continent framing simple; Equal Earth is a possible later upgrade in `build-data.mjs`.
- Name -> Flag mode is inherently visual; screen-reader users should use the other modes.
- Touch/pen taps in Locate mode select first and need "Confirm" so double-tap-to-zoom cannot submit an answer by accident; mouse clicks answer immediately.
- Not yet measured on real devices (50 fps target, Lighthouse scores).
