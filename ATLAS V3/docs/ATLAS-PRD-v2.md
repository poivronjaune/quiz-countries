# ATLAS — Product Requirements Document (v2.0)

| | |
|---|---|
| **Product** | ATLAS — a web app to practice country names, locations, flags and capitals |
| **Repository** | `poivronjaune/quiz-countries` (folder `html/`) |
| **Document version** | 2.0 (supersedes `html/prd.md` v1) |
| **Date** | 2026-10-11 |
| **Status** | Draft for implementation |
| **Languages** | English, French (extensible) |

---

## 1. Overview

ATLAS is a static, responsive web app that helps people learn:

1. **Country names** and which continent they belong to
2. **Where each country is** on a world map
3. **The flag** of each country
4. **The capital** of each country

It has two areas: **Explore** (browse continents and countries, see details) and **Quiz** (practice and evaluate). Everything runs in the browser, with no account and no server-side logic. Data is the UN M49 country list plus a world GeoJSON file and one SVG flag per country.

### 1.1 Goals

- G1. Learn by **exploring**: tap or click anything on the map or in a list and instantly see its name, flag, capital and position.
- G2. Learn by **testing**: quizzes for location, flag and capital, not only location.
- G3. **Mobile-first usability**: everything needed after selecting a country is visible without scrolling the page, and the map works with touch (one-finger pan, pinch zoom, double-tap zoom).
- G4. Equally good on desktop, tablet and phone from one codebase.
- G5. Fully bilingual (EN/FR) and accessible (keyboard, screen reader, contrast, reduced motion).

### 1.2 Non-goals (this version)

- User accounts, cloud sync, leaderboards
- Sub-national maps (states, provinces), cities, or rivers
- Native mobile apps (a PWA is in scope; see 9.4)

### 1.3 Users

| Persona | Need |
|---|---|
| **Student (10–18)**, mostly on a phone | Quick sessions, big tap targets, clear feedback |
| **Adult learner / traveller**, phone or laptop | Look up a country, then test themselves |
| **Teacher / parent**, desktop or tablet | Run a short quiz on a given continent |

---

## 2. Gap analysis: your request vs the existing PRD vs the code

Reviewed: `html/prd.md`, `src/index.html`, `src/quiz.html`, `src/css/site.css`, `src/js/app.js`, `src/js/i18n.js`, `src/data/countries.json` (248 entries), `src/data/world-countries.geojson` (250 features, 246 with an ISO code), `src/img/flags/` (249 SVGs). Findings come from reading the code, not from testing on real devices.

| Requested capability | In existing `prd.md`? | In current code? | v2 action |
|---|---|---|---|
| Learn **country names** by continent | Yes (Feature 2) | Yes | Keep; add name-recall quiz mode |
| **Location on a world map** | Yes (Features 2, 3) | Yes | Keep; improve with touch and better framing |
| **Flags** | Partly: small flag on the info panel only | Yes, info panel only | Add flag quizzes (flag → name, name → flag) |
| **Capitals** | Partly: shown on the info panel only | Yes, info panel only | Add capital quizzes (capital → country, country → capital) |
| **Responsive web app** | **No** (no breakpoints, no mobile requirement) | Partly: CSS breakpoints exist, layout is clunky | Full responsive spec (section 4) |
| **Mobile map pan and zoom** | **No** (mouse and scroll wheel only) | **No**: touch drag is explicitly disabled in code; no pinch; no `touch-action` | Full touch spec (section 5) |
| **Flag and capital visible after selecting a country, without scrolling** | **No** (info panel is "under the map") | **No**: on phones the panel sits below a 360 px map and a 300 px list | New bottom-sheet design (section 4) |
| Quiz "by typing or by clicking the map" | Stated in the intro of Feature 3 | Click only; no typing | Add typed answers with autocomplete |
| Multilingual EN/FR | Yes (Feature 4) | Yes, with a few hard-coded English strings | Keep; fix gaps (section 12) |

**Conclusion:** the existing PRD does **not** fully cover your requirements. It describes a desktop-style location explorer plus a click-the-map quiz. It has no flag or capital quizzes, no responsive or mobile requirements, and no touch interaction. It also contains typos (the app name appears as "ATALS"), broken numbering (e.g. 2.1, then 2.8, 2.9…; "1.7" repeats 1.4–1.5) and one contradiction (footer position described twice). This v2 replaces it.

---

## 3. Feature overview

IDs are stable and can be used as ticket references.

### 3.1 Shell (all pages)

| ID | Requirement |
|---|---|
| S-1 | Two-section header. Top: logo and name "ATLAS" on the left, profile (name, age, Save) on the right. Below: main menu (Explore, Quiz) and the language selector. |
| S-2 | **On phones the header is compact** (section 4.2): logo, page title, language and profile behind a single "menu" button; primary navigation moves to a bottom tab bar. |
| S-3 | One-row footer: app name on the left, "Designed by poivronjaune" in the centre, "UN-M49 Data" link (to `https://unstats.un.org/unsd/methodology/m49/overview/`) on the right. Sticks to the bottom on short pages and follows the content on long pages. On the Explore page on phones the footer is below the fold by design. |
| S-4 | Language selector (English / Français). The choice persists on the device and applies to all labels, continent, country and capital names. |
| S-5 | Profile (optional name and age) is stored **only in the browser** (`localStorage`); nothing is sent anywhere. |
| S-6 | No separate home page: Explore is the default landing page. |

### 3.2 Explore

| ID | Requirement |
|---|---|
| E-1 | Slogan "The world, in seven parts", title "Continents" and the total number of countries and areas. |
| E-2 | A continent and a country are **always** selected. Default: Africa and its first country (alphabetical in the current language). |
| E-3 | Continent list (7 continents, each with a country count). Selecting one highlights it on the map (dark green) and reframes the map. |
| E-4 | Country list for the selected continent, sorted in the current language. No search bar inside the list. |
| E-5 | Map colours: land light green, white borders, selected continent dark green, selected country a high-contrast colour (currently orange `#ff5a1f` with a dark edge). |
| E-6 | Tapping/clicking a country on the map updates the continent and country selection everywhere (lists, map, detail card). |
| E-7 | **Search** by "starts with" with a suggestion list. Nothing changes until a suggestion is confirmed. Accent-insensitive ("ecuador" and "Équateur" both work). |
| E-8 | **Country detail card**: flag, country name, ISO alpha-3 code, capital (with a note when there are several or none). Always visible without page scroll (section 4). |
| E-9 | Very small countries that are barely visible on the map get a pulsing ring marker and a "too small to be drawn" note when they have no shape at all. |
| E-10 | Full-screen map toggle (desktop and tablet). On phones the map is already full height, so the toggle is hidden. |

### 3.3 Quiz

See section 6 for details.

| ID | Requirement |
|---|---|
| Q-1 | Quiz **modes**: Locate, Flag → Name, Name → Flag, Capital → Country, Country → Capital. |
| Q-2 | Settings: mode, number of questions (5/10/20/50), region filter (World or one continent), difficulty (UN members only, or all countries and areas), answer style (multiple choice or typed, where applicable). |
| Q-3 | Score visible at all times during the quiz; a final result stays on screen until the user leaves the page or starts again. |
| Q-4 | Questions are listed **as they are answered**, never all at the start. |
| Q-5 | Wrong answer: the wrong country is shown red and the correct one dark green (Locate mode). Other modes show the correct answer clearly in text and colour. |
| Q-6 | End-of-quiz screen with score, the list of missed items and a "Practice missed" button. |
| Q-7 | Best score per mode is stored locally. |

### 3.4 Multilingual

| ID | Requirement |
|---|---|
| L-1 | Language selector in the header (EN/FR) on every page. |
| L-2 | UI strings live in locale files (one per language), not inside JavaScript logic. |
| L-3 | `countries.json` keeps a `language` object with translated country, continent and capital names per language code. Adding a language means adding one locale file plus one key per country. |
| L-4 | Sorting, search and highlighting use the active language's collation and accent-insensitive matching. |

---

## 4. UX design: responsive layout

### 4.1 The problem with the current layout

On phones (≤ 960 px) the explorer becomes a single column made of: continent chips, then a **360 px map**, then a **300 px country list**, and only after all of that the selected-country panel with the flag and capital. After tapping a country on the map the user has to scroll a long way to see what they selected, which breaks the "tap, see, learn" loop.

### 4.2 Design principle: map first, details always in view

> The selected country's flag, name and capital must always be on screen together with the map. Lists are a secondary way to select and live in a panel the user can pull up or put away.

### 4.3 Breakpoints

| Name | Width | Layout |
|---|---|---|
| **Phone** | < 640 px | Full-height map, floating controls, bottom sheet (4.4) |
| **Tablet** | 640–1023 px | Map fills the left/main area, a side panel (320 px) on the right holds the detail card and lists |
| **Desktop** | ≥ 1024 px | Three-pane layout (4.6) |

Use CSS container/media queries with `dvh`/`svh` units so browser toolbars on phones do not clip the layout. Minimum supported width 320 px.

### 4.4 Phone layout (portrait)

```
┌───────────────────────────────┐
│ ☰  ATLAS            EN ▾  👤  │  compact header (48 px)
├───────────────────────────────┤
│ 🔍 Search a country           │  search (overlay, 44 px)
│ [Africa][Asia][Europe][N.Am]→ │  continent chips, horizontal scroll
│                               │
│          M A P                │  fills all remaining height
│     (pan / pinch / tap)       │
│                          ┌─┐  │
│                          │+│  │  floating controls
│                          │−│  │  (zoom in, zoom out,
│                          │⟲│  │   reset view)
│ ┌───────────────────────────┐ │
│ │ ▬▬                        │ │  ← bottom sheet, PEEK state
│ │ 🇳🇬  Nigeria        NGA   │ │     flag, name, ISO
│ │     Capital: Abuja        │ │     capital
│ └───────────────────────────┘ │
├───────────────────────────────┤
│  🌍 Explore       ❓ Quiz     │  bottom tab bar (56 px)
└───────────────────────────────┘
```

**Bottom sheet** (the key change):

| State | Height | Content | How to reach |
|---|---|---|---|
| **Peek** (default) | about 96 px | Drag handle, flag, name, ISO code, capital | Appears as soon as a country is selected |
| **Half** | about 50 % of the screen | Peek content plus the scrollable country list of the continent (2 columns) | Swipe up on the handle, or tap the handle or the chevron |
| **Hidden** | 0 | Map only | Swipe down from Peek (a small "show details" pill remains) |

Rules:

- The map's visible area is the space **above** the sheet. When the sheet changes height, the selected country is re-centred in the visible part of the map (not behind the sheet).
- Tapping the map selects a country, shows the Peek sheet and keeps the user's zoom level. The page itself never scrolls on this screen (`overflow: hidden` on the explorer, `overscroll-behavior: none`).
- Selecting a continent chip reframes the map and selects the first country of that continent (E-2).
- Choosing a country from the list in Half state selects it, moves the map, and collapses to Peek so the map is visible again.
- The sheet's content is announced to screen readers (`aria-live="polite"`) and the sheet is a `role="region"` with a labelled handle button that toggles its state (the swipe gesture is an enhancement, not the only way).
- Profile (name/age) and the language selector live in the ☰ menu on phones, which opens a full-height sheet.

### 4.5 Phone layout (landscape) and tablet

- **Landscape phone** (height < 500 px): the bottom tab bar becomes a left rail, the compact header is hidden on scroll-free pages, and the bottom sheet becomes a right-hand panel (320 px) containing the detail card and list.
- **Tablet portrait**: same as phone, with the sheet in Half state by default.
- **Tablet landscape**: the Desktop layout with narrower side panels.

### 4.6 Desktop layout (≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────┐
│ [logo] ATLAS                          [Name] [Age] [Save]    │
│ Explore   Quiz                                    EN ▾       │
├──────────────────────────────────────────────────────────────┤
│ The world, in seven parts      Continents      248 countries │
│ 🔍 Search…                                                   │
├────────────┬───────────────────────────────┬─────────────────┤
│ Continents │                               │ ┌─────────────┐ │
│ ▸ Africa 60│                               │ │ 🇳🇬          │ │
│   Antarct… │            M A P              │ │ Nigeria  NGA│ │
│   Asia  50 │   (wheel zoom, drag to pan,   │ │ Capital:    │ │
│   Europe 51│    zoom slider, reset,        │ │ Abuja       │ │
│   …        │    full-screen)               │ └─────────────┘ │
│            │                               │ Africa · 60     │
│            │                               │ ▸ Algeria       │
│            │                               │   Angola        │
│            │                               │   …  (scrolls)  │
├────────────┴───────────────────────────────┴─────────────────┤
│ ATLAS            Designed by poivronjaune        UN-M49 Data │
└──────────────────────────────────────────────────────────────┘
```

Changes from today:

- The **detail card moves to the top of the right panel** (above the country list) instead of under the map, so it is in view next to the map. It is no longer separated from the map by a scroll.
- The map area height is `calc(100dvh − header − search row)` with a minimum of 520 px, so on a typical laptop (1366×768) the whole explorer fits without page scroll. If the viewport is shorter than the minimum the page scrolls, but the detail card stays visible because the right panel is `position: sticky`.
- A hover tooltip shows the country name on the map. The legend moves into the map's corner.
- The full-screen toggle stays in the map toolbar.

### 4.7 Quiz layout

**Phone:**

```
┌───────────────────────────────┐
│ ←  Quiz · Locate     3/10  ★2 │  progress and score in a sticky bar
├───────────────────────────────┤
│  Find  Kenya  on the map      │  question card (sticky)
├───────────────────────────────┤
│                               │
│          M A P                │  same touch map as Explore
│                          [+−⟲]│
│                               │
├───────────────────────────────┤
│  ✔ Correct!  [ Next question ]│  feedback bar and primary action,
└───────────────────────────────┘  in the thumb zone
```

- For choice-based modes (flag, capital) the 4 answer buttons occupy the lower half of the screen (minimum 48 px high, full width) instead of the map.
- The "answered questions" list opens from a button in the top bar (a bottom sheet) so it never pushes the map out of view.

**Desktop:** left column (settings → question → feedback → answered list), right area the map or the answer grid, as today but with the answered list limited in height and scrolling inside itself.

### 4.8 Visual and interaction standards

- Touch targets at least 44×44 px (list rows 48 px on phones).
- Body text at least 16 px on phones (prevents iOS zoom on input focus); inputs 16 px.
- Hover styles only under `@media (hover: hover)`, so a tap does not leave a "stuck" hover colour on touch devices.
- Respect `prefers-reduced-motion` (already done) and `prefers-color-scheme` (optional dark theme in a later phase).
- Safe areas: use `env(safe-area-inset-*)` for the bottom tab bar and sheet on notched phones.
- Loading state: skeleton map and a progress message while data loads; an error state with a "Retry" button.

---

## 5. Map interaction specification (mouse, pen and touch)

### 5.1 Common behaviour

- The map is an SVG scaled by changing its `viewBox`. Zoom range **1× to 20×** (1× shows the whole world). The cap may be raised to 40× if tiny island nations remain hard to tap.
- Panning is clamped so the map cannot leave the world rectangle.
- A new selection animates the view (450 ms, instant when reduced motion is on).
- After the user zooms or pans manually, selecting another country **keeps their zoom** and centres the new country; choosing a continent resets to that continent's default framing. "Reset view" returns to the default framing.

### 5.2 Input matrix

| Action | Mouse / trackpad | Touch | Keyboard |
|---|---|---|---|
| Select country | Click | **Tap** (movement under 8 px) | Choose in the list (arrow keys) |
| Pan | Left-button drag | **One-finger drag** | Arrow keys when the map has focus |
| Zoom | Wheel (anchored at cursor), slider | **Pinch** (anchored at the midpoint of the two fingers), **double-tap** to zoom in 2× at the tap point, **+ / − buttons** | `+` / `−` keys |
| Reset view | Reset button | Reset button (⟲) | `0` key |
| Full screen | Toggle button | Not needed (map is already full height) | `F` key or toggle |

### 5.3 Touch implementation requirements

1. Use **Pointer Events** for everything (mouse, pen, touch) with `setPointerCapture`, and set `touch-action: none` on the map stage so the browser does not scroll or zoom the page while the finger is on the map. (Today touch is explicitly excluded from dragging in `app.js` and `quiz.html`, and there is no `touch-action`.)
2. Track active pointers in a `Map`. One pointer pans. Two pointers zoom and pan together (scale equals the ratio of the finger distance now to the distance at the start, anchored at the midpoint).
3. A tap is a pointer that moves less than 8 px (touch) or 4 px (mouse) and lasts less than 300 ms. Only taps select a country. This replaces the `setTimeout` click-suppression hack.
4. **Forgiving taps on small countries**: when the tap lands on ocean, find the nearest selectable country within 16 px (screen) and select it if it is a small country (box under 22 px on screen) or a micro-state. A transparent, enlarged hit-circle can be drawn around micro-states at low zoom.
5. Momentum (inertia) after a flick is optional; if added it must stop on touch and never run with reduced motion.
6. Provide on-screen **+ / − / reset** buttons (44 px) for users who cannot pinch (motor impairments, one-handed use). Keep the slider on desktop only.
7. Prevent page rubber-banding while the map has focus: `overscroll-behavior: none` on the explorer container.
8. Avoid accidental browser zoom on double-tap (`touch-action: none` handles this).

### 5.4 Performance targets for the map

- Pinch/pan at 60 fps on a mid-range phone (about 2020 hardware). Updating the `viewBox` is cheap, but 100 000 coordinates with `vector-effect: non-scaling-stroke` can be slow while moving. Mitigations:
  - Simplify geometry at build time (section 12); use a lighter geometry while the map is being moved if still needed.
  - While a gesture is active, add a `.is-moving` class that turns off transitions and hover styles.
- Coalesce pointer moves with `requestAnimationFrame`.

---

## 6. Quiz specification

### 6.1 Modes

| Mode | Question | Answer input |
|---|---|---|
| **Locate** | "Find *Kenya* on the map" | Tap the country on the pan/zoom map |
| **Flag → Name** | Flag image | Choose one of 4 names, or type (autocomplete) |
| **Name → Flag** | Country name | Choose one of 4 flags (2×2 grid) |
| **Capital → Country** | "*Nairobi* is the capital of…" | Choose one of 4, or type |
| **Country → Capital** | "What is the capital of *Kenya*?" | Choose one of 4, or type |
| **Map → Name** (later phase) | A country highlighted on the map | Choose or type the name |

### 6.2 Settings (shown before the quiz starts, remembered locally)

- Mode
- Region: World or one continent
- Pool: **UN member and observer states** (default) or all 248 countries and areas
- Number of questions: 5, 10, 20, 50
- Answer style (for modes where it applies): Multiple choice (default on phones) or Typed (default on desktop)

### 6.3 Rules

- A random country is chosen for each question, **without repeats** inside one quiz (Fisher–Yates shuffle, as today).
- Distractors for multiple choice are picked from the same continent first, so answers are plausible but not obvious.
- Typed answers: accent-insensitive, case-insensitive, punctuation-insensitive. Only the active language's names are accepted, plus a configurable list of `aliases` (for example "USA", "Ivory Coast"). Countries with several capitals accept any of them.
- Countries without a capital (Antarctica, Bouvet Island, Heard & McDonald Islands, US Minor Outlying Islands, Tokelau in the current data) are excluded from the capital modes.
- Countries without a map shape (Bouvet Island, Gibraltar, US Minor Outlying Islands) are excluded from Locate mode (as today).
- Score: 1 point per correct answer. A streak counter and elapsed time are shown but do not change the score.
- One attempt per question; after answering, show feedback and the **Next** button (the last question shows **See results**).

### 6.4 Feedback and results

- Correct: green confirmation, plus the flag and capital as a small "learn more" reinforcement.
- Wrong: show the correct answer, and in Locate mode colour the wrong pick red and the right country dark green, with the map framing the correct country.
- Results screen: score, percentage, list of missed items (country, your answer, correct answer), **Practice missed** (new quiz limited to those countries), **Play again**, and **Change settings**.
- Best score per mode and region stored in `localStorage` (key `atlas.stats.v1`).

---

## 7. Internationalisation

- Locale files: `src/locales/en.json`, `src/locales/fr.json`. Keys use the existing dotted naming (`quiz.start`, `country.capital`…); the existing strings in `i18n.js` can be moved over unchanged.
- Placeholders use `{name}` as today; add pluralisation via `Intl.PluralRules` (for example "1 question / 5 questions").
- Country data: `language.<code>.name|capital|continent|aliases`. The continent translation table currently duplicated in `i18n.js` is removed, since the data file already carries `language.fr.continent`.
- All user-facing strings must go through `t()`: this includes ARIA labels, tooltips (`<title>` of map shapes at first render), error messages and the "Play again" button text. Language change updates the page without a reload.
- Number and list formatting uses `Intl`.
- Detect the browser language on first visit (`navigator.language`), fall back to English, then remember the explicit choice.

---

## 8. Data model

Existing `countries.json` record (kept):

```json
{
  "name": "Algeria",
  "m49Code": "012",
  "isoAlpha2": "DZ",
  "isoAlpha3": "DZA",
  "continent": "Africa",
  "capital": "Algiers",
  "m49Region": "Africa",
  "m49Subregion": "Northern Africa",
  "m49IntermediateRegion": "",
  "language": { "fr": { "name": "Algérie", "continent": "Afrique", "capital": "Alger" } }
}
```

Proposed additions:

| Field | Purpose |
|---|---|
| `status` | `"member"`, `"observer"` or `"territory"`; feeds the "UN members only" quiz pool |
| `capitals` (array) | All accepted capitals (replaces single `capital` + `capitalNote` for quizzes) |
| `aliases` (per language) | Alternative accepted spellings for typed answers |
| `centroid` `[lon, lat]` | Marker position for countries too small or missing on the map (for example Gibraltar) |
| `difficulty` (1–3) | Optional, used by an "easy / hard" filter (area and familiarity) |

Validation script (run in CI): every country has a flag file, a French name, a continent that is one of the seven, and either a capital or an explicit "no capital" flag; every map ISO exists in the data.

Current data observations: 248 countries; 5 without a capital; 3 without a map shape; every record already has a French translation.

---

## 9. Non-functional requirements

### 9.1 Performance
- First useful render (map visible) under 2.5 s on a simulated mid-range phone on 4G; interactive under 3.5 s.
- Total transferred on first load (compressed) under 600 KB excluding flags; flags are loaded on demand.
- No layout shift when the bottom sheet opens (fixed heights, `contain` where possible).

### 9.2 Accessibility (target WCAG 2.2 AA)
- Everything that can be done on the map can also be done from the lists, search or buttons.
- The Quiz must be fully playable without the map: the typed and multiple-choice modes serve that purpose, and Locate mode offers an "answer by typing the name" alternative for keyboard and screen reader users.
- Visible focus ring, logical tab order, `aria-live` announcements for selection changes and quiz feedback.
- Colour is never the only signal (correct/wrong also use icon and text).
- Contrast of text at least 4.5:1; the selected-country colour must have at least 3:1 against both the land and the continent colours.
- Target size at least 24×24 px (AA); the design uses 44 px.
- Support text zoom to 200 % without loss of function.

### 9.3 Browser support
Last 2 versions of Chrome, Edge, Firefox, Safari (macOS and iOS 15+), Samsung Internet. ES modules, Pointer Events and `dvh` are used; provide a `vh` fallback.

### 9.4 Offline and installability (PWA, phase 3)
- Web app manifest and a service worker that precaches the shell, JS, CSS, locale files, data files and the most used flags; the rest are cached on first view.
- Works offline after the first visit. Show an "offline" indicator.

### 9.5 Privacy and security
- No analytics or third-party requests by default; **self-host fonts** (currently loaded from Google Fonts).
- Profile and stats stay in `localStorage`. Add a "Clear my data" button.
- Add a Content-Security-Policy (`default-src 'self'`) once fonts are self-hosted.
- The age field may identify minors: keep it optional, local-only and say so in the UI.

---

## 10. Acceptance criteria (selected)

| # | Criterion |
|---|---|
| A1 | On a 360×640 viewport, after tapping any country on the map, its flag, name, ISO code and capital are visible **without scrolling** and the map still shows the selected country. |
| A2 | On the same viewport, a one-finger drag pans the map and a two-finger pinch zooms it, and the page does not scroll or zoom while doing so. |
| A3 | A double-tap zooms in about 2× around the tapped point; the + / − / reset buttons work and have 44 px targets. |
| A4 | On a 1366×768 desktop, the map, continent list, country list and detail card are all visible without page scroll. |
| A5 | Selecting a country from the list, the map or the search gives the same selection state everywhere (continent highlight, list highlight, map highlight, detail card). |
| A6 | Switching language updates every visible string, the map tooltips, list order and the search behaviour without reloading, and the choice survives a reload. |
| A7 | Each quiz mode can be completed with keyboard only and with a screen reader. |
| A8 | A 10-question Flag → Name quiz on a phone never needs vertical page scroll to read the question, choose an answer and press Next. |
| A9 | Panning and pinching stay at 50 fps or better on a mid-range phone with the full world data loaded (measured with the browser performance tools). |
| A10 | Lighthouse (mobile): Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95. |

---

## 11. Delivery plan

| Phase | Scope | Result |
|---|---|---|
| **1. Mobile UX fix** | Shared map module; touch pan, pinch and double-tap; floating controls; phone layout with bottom sheet and bottom tab bar; desktop right-panel detail card | Solves the main complaint; Explore feels right on every device |
| **2. Quiz expansion** | Flag and capital modes; typed and multiple-choice answers; results screen and "practice missed"; local stats; data additions (`status`, `capitals`, `aliases`) | Covers all four learning areas |
| **3. Quality and reach** | Locale files; build step for simplified geometry; self-hosted fonts; PWA and offline; tests and CI; dark theme | Fast, installable, maintainable |

---

## 12. Technical section: code review findings and recommendations

Based on a read-through of the current code (no runtime profiling). Strengths worth keeping: no innerHTML use (DOM is built with `createElement`/`textContent`), accessible list navigation with roving `tabindex`, `aria-live` announcements, reduced-motion support, `inert` background in full-page mode, `dvh` units, accent-insensitive search, graceful `localStorage` failure handling, and a clear data/UI separation.

### 12.1 High priority

1. **Duplicated map code.** `quiz.html` contains about 400 lines of inline CSS and about 400 lines of inline JS that re-implement what `app.js` already does: projection, SVG path building, `clampView`, zoom maths, wheel zoom, drag-to-pan, resize handling and the profile form. The two copies have already diverged (the quiz copy lacks `fitView` and `MARKER_*` logic, uses `toFixed(2)` instead of `round2`, and only starts a drag when zoom > 1). Extract ES modules and share them:
   - `js/data.js` (load and index countries and geometry)
   - `js/map-view.js` (SVG creation, view maths, pointer gestures; used by Explore and Quiz)
   - `js/profile.js`, `js/i18n.js`, `js/search.js`
   - `explore.js` and `quiz.js` as thin page controllers
   Move the inline `<style>` of `quiz.html` into `css/quiz.css`.

2. **Leftover duplicate assignments in `app.js`** from an unfinished localisation refactor. English values are assigned first and then immediately overwritten (and the indentation is inconsistent). Examples: `totalLabel.textContent` set twice (≈ lines 332–333); continent button label (≈ 346–347); country button text (≈ 365–366); heading (≈ 371–372); info name and capital (≈ 483–491); `announce` calls (≈ 520–523 and 533–538). Remove the first of each pair. These are harmless today but hide real bugs and confuse readers.

3. **Touch input disabled.** `pointerdown` handlers return early for `pointerType === "touch"` in both `app.js` and `quiz.html`, and nothing sets `touch-action`. Replace with the Pointer Events gesture engine in section 5.3, using `setPointerCapture` instead of adding and removing `window` listeners on every drag.

4. **Heavy geometry parsed on every page load.** `world-countries.geojson` is 1.68 MB with roughly 100 000 coordinates, and `buildShape` converts it to path strings in the browser on each load (and again on the quiz page). Fixes: pre-build SVG path strings at build time (a small Python or Node script in the repo), simplify the geometry (for example `mapshaper`/TopoJSON at about 10–15 % of the points), or serve TopoJSON and decode it. Keep a higher-detail layer for zoom levels above about 6× if the loss of detail shows. Enable gzip or Brotli on the host. Expected result: well under 300 KB for the map data.

5. **Layout built on fixed heights.** `.map-area` uses `clamp(480px, 64vh, 640px)` and on small screens `grid-template-rows: auto 360px 300px`, which is what pushes the flag and capital far below the fold. Replace with a flex/grid layout driven by `100dvh`, plus the sheet pattern in section 4.

### 12.2 Medium priority

6. **Two sources of truth for translations.** `CONTINENTS_FR` in `i18n.js` duplicates `language.fr.continent` in `countries.json`; and `localizedContinentName` calls a function named `countryContinent` (misleading name). Use one source and rename. Also `language === "fr"` is hard-coded in several places, so adding a third language means editing code; make the functions language-code driven (`country.language?.[lang]?.name ?? country.name`).

7. **Untranslated or hard-coded strings** found in `quiz.html`: the hidden "Map zoom" label (≈ line 539), `aria-valuetext` "times" (≈ 712), the "Play again" button text set in `startQuiz` (≈ 839), the data-load error message (≈ 962), and map `<title>` elements created with the English name at first render (≈ 669) and only localised after a language change. Route all through `t()`.

8. **Click suppression with `setTimeout(0)`** after a drag. Replace with the tap-versus-drag test (movement threshold plus duration) done in `pointerup`, which is also what touch needs.

9. **Hover styles on touch devices.** `.map-shape[data-iso]:hover` and list `:hover` rules will stick after a tap on phones. Wrap them in `@media (hover: hover)`.

10. **Equirectangular projection (plate carrée).** It is simple but it greatly stretches the polar regions (Russia, Canada, Greenland, Antarctica look far larger than they are) and splits the Pacific at the antimeridian, which is why `CONTINENT_BOUNDS` needs special cases (Russia, Oceania, Fiji). A Natural Earth or Equal Earth projection, pre-computed at build time, gives better shapes for learning. This is optional but pairs well with item 4 because the projection moves to the build step.

11. **Search and map selection are tied to the SVG only.** The SVG has `role="img"`, which hides its children from assistive technology, so individual countries are not reachable on the map by keyboard. This is acceptable for Explore (lists exist) but is why the quiz needs the typed alternative (section 9.2). Consider `role="group"` plus focusable paths with `aria-label` only if keyboard map navigation is wanted.

12. **No safeguard for missing shapes.** Three countries (Bouvet Island, Gibraltar, US Minor Outlying Islands) have no map shape; only a text note tells the user. Add `centroid` to the data so the ring marker can still point at them.

13. **External fonts.** Fonts load from Google Fonts: a privacy and offline concern and an extra render-blocking request chain. Self-host the woff2 files (subset to Latin) with `font-display: swap`.

14. **Flag assets.** 249 SVGs, a few very large (for example `rs.svg` about 182 KB, `mx.svg` about 85 KB, `es.svg` about 81 KB, `sv.svg` about 77 KB). Run SVGO, consider swapping the heaviest for simplified versions, and lazy-load flags (`loading="lazy"`, `decoding="async"`); for quiz modes, preload the next question's flag.

### 12.3 Low priority and tooling

15. **No build, lint or tests.** Add `package.json` with: ESLint and Prettier; Vitest unit tests for pure functions (`clampView`, `fitView`, `zoomOf`, `normalize`, quiz question generation, answer matching); Playwright end-to-end tests at a phone viewport (360×640) and a desktop viewport covering acceptance criteria A1 to A8; a data validation script (section 8); and a GitHub Actions workflow that runs these and deploys `html/src` to GitHub Pages.

16. **Global state in `quiz.html`.** Many top-level `let`s (`questions`, `score`, `answered`, `quizComplete`, `view`…) are mutated from many functions. Use a small state object with one `render()` function, or a minimal store; this makes the new modes much easier to add.

17. **Magic numbers** (`MAX_ZOOM`, thresholds, 960×480 literals in `quiz.html`) should come from one shared constants module; the quiz page currently hard-codes `960`/`480` in several places while `app.js` has `MAP_WIDTH`/`MAP_HEIGHT`.

18. **Resource hints and caching headers.** Add `<link rel="preload">` for the data files, long-lived cache headers with hashed file names for static assets, and `Cache-Control` on the JSON.

19. **`file://` usage.** `fetch("./data/...")` fails when `index.html` is opened directly from disk (the code already shows an error message). Document a one-line dev server in the README (for example `npx serve html/src` or `python -m http.server -d html/src`).

20. **Repository layout.** There is a root-level `countries_data.json`, `data/`, and `merge_data_to_json.py` next to `html/src/data/countries.json`. Make the generator script write into `html/src/data/` and document which file is the source of truth, so the two copies cannot drift.

21. **Security headers and CSP.** Once fonts are local, add a CSP (via `<meta>` or host headers), `Referrer-Policy`, and `rel="noopener noreferrer"` on external links (already present on the footer link).

22. **Stats and profile storage.** Version the storage keys (`atlas.profile.v1` is already versioned; keep that convention for `atlas.stats.v1` and `atlas.settings.v1`) and wrap reads in a validating helper.

---

## 13. Open questions

1. Should the quiz pool default to UN member and observer states (about 195) rather than all 248 entries? (Proposed: yes.)
2. Should typed answers accept the other language's name as a fallback? (Proposed: no.)
3. Is a dark theme wanted in phase 3?
4. Preferred hosting (GitHub Pages assumed) and whether custom domain and HTTP headers can be set.
5. Do you want a "learn mode" (flashcards for flag, capital and name with spaced repetition) after phase 2?

---

## 14. Glossary

- **M49**: United Nations Statistics Division standard country and area codes.
- **ISO alpha-2 / alpha-3**: two- and three-letter country codes (for example NG / NGA).
- **Bottom sheet**: a panel anchored to the bottom of a phone screen that the user can pull up or down.
- **Pinch zoom**: two-finger gesture that zooms by changing the distance between fingers.
- **Peek**: the minimal, always-visible state of the bottom sheet.
