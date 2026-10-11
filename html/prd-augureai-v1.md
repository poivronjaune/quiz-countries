# Product Requirements Document: ATLAS (Vanilla JS Edition)

## 1. Overview
ATLAS is an interactive web application designed to help users learn and retain country names, geographic locations, flags, and capitals. Built entirely with vanilla JavaScript and native CSS, the app leverages active recall through map interaction, progressive quiz modes, and bilingual support (English/French). It is optimized for performance, low bundle size, and broad browser compatibility without relying on build-heavy ecosystems.

## 2. Recommended Technical Stack
- **Framework:** No framework. Pure Vanilla JavaScript (ES Modules, native DOM APIs, Fetch API).
- **Styling:** Out-of-the-box CSS using Flexbox and Grid for responsive layouts. No CSS frameworks or preprocessors required.
- **Map Rendering:** Lightweight SVG renderer. Manual DOM manipulation or minimal SVG helper libraries. Path simplification recommended for performance.
- **State Management:** Implemented locally with JavaScript. Uses native objects, closures, or lightweight Pub/Sub patterns managed within application modules.
- **Internationalization:** No i18n frameworks. Inline HTML label management based on an external JSON/JS language file that defines translations other than English. By default, HTML tags contain the English version as fallback. UI updates trigger via a dedicated `updateLanguage(key, value)` function.
- **Data Sources:** UN M49 GeoJSON/TopoJSON for boundaries. `restcountries.com` or `flagcdn.com` for flags and metadata.
- **Storage:** `localStorage` for profile data and quiz progress. Service Worker for static asset caching and offline capability.

## 3. Feature Breakdown & Implementation Details

#

## 3.1 Global Layout & Header
- **Structure:** Two-row sticky header + main content area + fixed footer.
- **Row 1:** App logo/name (left). Profile inputs (name, age) with a "Save" button (right). Persisted in `localStorage` via a dedicated storage module.
- **Row 2:** Navigation menu (Map/Continents, Quiz, Settings) using native CSS `:focus` and `:hover` states.
- **Footer:** Single row at viewport bottom. Left: app name. Center: "Designed by poivronjaune". Right: Links to "UN-M49 Data" and official UN stats source.
- **Layout Logic:** Use `min-height: 100vh` with CSS Flexbox column to guarantee footer positioning regardless of content height.

#

## 3.2 World Map & Continent Explorer (Core Feature)
- **Default View:** Continents page. Left sidebar: clickable continent list. Right panel: country list for selected continent. Defaults to Africa + first country.
- **Interactive Map:** Lightweight SVG renderer. Base fill: light green. Borders: white. Selected continent: darker green. Selected country: high-contrast color (e.g., gold/orange).
- **Interaction Flow:**
 - Click continent in left list → updates SVG highlight and populates right country list.
 - Click country in right list → updates SVG highlight and syncs left list.
 - Click polygon on map → syncs both lists automatically.
- **Search:** Input field above map. Auto-suggest dropdown filtering by country name. Updates lists only upon confirmed selection (Enter or click).
- **Country Info Panel:** Located below map. Displays ISO Alpha-3 code, cached flag image, and capital name (right-aligned).
- **Implementation Notes:** Debounce search input. Lazy-load flag images via `IntersectionObserver`. Pure JS event delegation for SVG polygons. Virtual scroll for long country lists if needed.

#

## 3.3 Quiz Mode
- **Setup:** Dropdown to select question count (5, 10, 20, 50). Inherits global language setting.
- **Gameplay:** Random country generation. User places marker on map to guess location. Supports zoom (scroll wheel or range slider) and pan (mouse drag).
- **Feedback & Scoring:**
 - Correct: Score increments, correct location highlighted.
 - Incorrect: Wrong marker shown in red, correct location highlighted in dark green.
 - Score displayed persistently at top of quiz view.
- **Question History:** Dynamic list appended as user answers questions. Rendered via native DOM insertion (`insertAdjacentHTML` or `createElement`).
- **End Screen:** Final score summary displayed until navigation away.
- **Implementation Notes:** Overlay click coordinates against GeoJSON polygons for validation. Throttle wheel/drag events. Maintain score and history in local JS state objects.

#

## 3.4 Multilingual Support (i18n)
- **Selector:** Dropdown in header row 2 for English/French switching.
- **Data Structure:** External JSON file (`locales/en.json`, `locales/fr.json`) containing key-value pairs for:
 - Continent names (EN/FR)
 - Country names (EN/FR)
 - Capital names (EN/FR)
 - UI labels, buttons, placeholders, and slogans.
- **Rendering:** Default HTML markup contains English text. Elements carry `data-lang-key="continent.africa"`. A native `switchLocale(lang)` function fetches the target JSON, iterates over matching `[data-lang-key]` attributes, and replaces `textContent` or `innerHTML`. Fallback remains English if a key is missing.

## 4. Data Architecture
- **Core Dataset:** `countries.json` or external API endpoint. Fields: `iso_alpha3`, `name_en`, `name_fr`, `capital_en`, `capital_fr`, `continent`, `coordinates` (GeoJSON/TopoJSON).
- **Flags:** CDN-hosted SVG/PNG. Cache via Service Worker.
- **Performance:** Path simplification to <50KB per continent. Pagination or virtualization for country lists exceeding 15 items.

## 5. UI/UX & Accessibility Guidelines
- **Responsive Design:** Mobile-first. Sidebars collapse to bottom sheet or modal on screens <768px. Touch-friendly map interactions (larger hit areas, pinch-zoom support).
- **Accessibility:** WCAG AA contrast ratios. Keyboard navigation for menus and quiz. ARIA labels for map polygons (`aria-label="Country: France"`). Focus indicators preserved using native CSS `:focus-visible`.
- **Performance Targets:** Initial load <2s on 4G. Lighthouse >90. Debounced/throttled event listeners. Zero external runtime dependencies.

## 6. Implementation Phases
- **Phase 1:** Core layout, header/footer, static SVG map rendering, continent/country list sync, basic local state management.
- **Phase 2:** Interactive map (pan/zoom), search autocomplete, country info panel, flag/capital display, responsive CSS polish.
- **Phase 3:** Quiz mode logic, scoring system, feedback UI, question history stream, end-screen summary.
- **Phase 4:** i18n integration, accessibility audit, performance optimization, native ES modules bundling (if needed), Service Worker setup.

## 7. Acceptance Criteria & Testing
- Map renders correctly across Chrome, Firefox, Safari, Edge without polyfills.
- List/map synchronization maintains consistent state without race conditions.
- Quiz scoring and feedback logic verified against GeoJSON boundaries.
- Language switch updates all UI elements dynamically via `data-lang-key` mapping.
- Lighthouse performance, accessibility, and SEO scores >90.
- Unit tests cover state management, map polygon intersection, and i18n switching. E2E tests cover core user flows.
- Code linting and formatting enforced via ESLint + Prettier.