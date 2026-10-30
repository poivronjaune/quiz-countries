# ATLAS V3.3

Static, responsive web app to practise country names, locations, flags and capitals (EN/FR).
Specification: `docs/ATLAS-PRD-v3.3.md` (older versions kept in `docs/` for history). No build step for the app: plain ES modules, CSS and JSON.

## What is new in V3.3 (includes everything from v3.2)
- **Map wrap-around**: pan past the right edge and the left edge of the world continues (and the reverse). Oceania is framed across the edge, so the Cook Islands, Tonga, French Polynesia and Pitcairn sit beside Fiji.
- **Sound effects** (generated in the browser, no audio files): success, fail, and a soft clock tick while a quiz question waits for an answer. A speaker button in the header mutes everything (on by default, remembered).
- **Header**: name, age, Save and Clear on row 1; menu on the left of row 2, language selector and sound button on its right. The status message is in row 1.
- **Detail card**: country name above the flag and capital, in a fixed two-line area so the card never resizes.

## What was new in V3.1
- Language selector sits on the same row as name and age; the "data cleared" message is no longer covered.
- Mouse wheel scrolls the page again; Ctrl/Cmd + wheel (or pinch) zooms the map. A plain wheel zooms only when the page cannot scroll.
- Explore detail card: flag, name, capital and the zoom-to-country button only.
- One hints control in the quiz setup (the duplicate On/Off control was removed).

## What was new in V3
- Hover hint (country name tooltip) on Explore and in the Locate quiz; a "Country name hints" switch in the quiz setup and an eye button during the quiz turn it off.
- Every country is visible: tiny countries (Monaco, Vatican City, ...) get a round screen-sized badge from 2.5x zoom, and the maximum zoom is 60x.

## Run
```
python3 -m http.server -d src 8080     # or: npx serve src
```
Open http://localhost:8080 (ES modules and `fetch` need a server; `file://` will not work).

## Layout
```
src/index.html, quiz.html      pages (Explore is the landing page)
src/js/map-view.js             shared SVG map: pointer-event pan, pinch, double-tap, wheel, keyboard
src/js/map-math.js             pure view maths (clamp, wrap-around, fit, zoom-at-point) - unit tested
src/js/sound.js                synthesized sound effects and the mute preference
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
