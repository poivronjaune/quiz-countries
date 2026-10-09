const CONTINENTS = [
  "Africa",
  "Antarctica",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
];

// Default framing per continent as [west, south, east, north] in degrees. A selected country outside
// its frame (Russia, Heard Island, Polynesia east of the antimeridian...) widens the view to include it.
const CONTINENT_BOUNDS = {
  Africa: [-26, -37, 62, 39],
  Antarctica: [-180, -90, 180, -60],
  Asia: [24, -12, 148, 56],
  Europe: [-25, 32, 62, 82],
  "North America": [-170, 5, -10, 85],
  Oceania: [90, -56, 180, 22],
  "South America": [-82, -56, -34, 13],
};

const PROFILE_KEY = "atlas.profile.v1";
const SVG_NS = "http://www.w3.org/2000/svg";
const MAP_WIDTH = 960;
const MAP_HEIGHT = 480;
const VIEW_PADDING = 0.06;
const ZOOM_DURATION_MS = 450;
const MARKER_RADIUS_PX = 12;
const MARKER_MAX_SHAPE_PX = 22;
const MAX_ZOOM = 20;
const WHEEL_SENSITIVITY = 0.002;
const DRAG_THRESHOLD_PX = 4;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const round2 = (value) => Math.round(value * 100) / 100;
const project = (longitude, latitude) => [
  ((longitude + 180) / 360) * MAP_WIDTH,
  ((90 - latitude) / 180) * MAP_HEIGHT,
];

function boundsToRect([west, south, east, north]) {
  const [x1, y1] = project(west, north);
  const [x2, y2] = project(east, south);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

const CONTINENT_RECTS = Object.fromEntries(
  Object.entries(CONTINENT_BOUNDS).map(([name, bounds]) => [name, boundsToRect(bounds)]),
);

function unionRects(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

// Keeps a view inside the world; a view larger than the world stays centred on it.
function clampView(view) {
  return {
    ...view,
    x: view.w >= MAP_WIDTH ? (MAP_WIDTH - view.w) / 2 : clamp(view.x, 0, MAP_WIDTH - view.w),
    y: view.h >= MAP_HEIGHT ? (MAP_HEIGHT - view.h) / 2 : clamp(view.y, 0, MAP_HEIGHT - view.h),
  };
}

// Expands a rectangle to the stage's aspect ratio and keeps it inside the world where possible.
function fitView(rect, aspect) {
  let width = rect.w * (1 + VIEW_PADDING * 2);
  let height = rect.h * (1 + VIEW_PADDING * 2);
  if (width / height < aspect) width = height * aspect;
  else height = width / aspect;
  if (width > MAP_WIDTH) {
    width = MAP_WIDTH;
    height = width / aspect;
  }
  return clampView({ x: rect.x + rect.w / 2 - width / 2, y: rect.y + rect.h / 2 - height / 2, w: width, h: height });
}

// Zoom 1 shows the whole world; MAX_ZOOM is that view magnified 20 times.
const zoomOf = (view) => Math.max(MAP_WIDTH / view.w, MAP_HEIGHT / view.h);

function viewForZoom(zoom, aspect) {
  const worldWidth = Math.max(MAP_WIDTH, MAP_HEIGHT * aspect);
  return { x: 0, y: 0, w: worldWidth / zoom, h: worldWidth / aspect / zoom };
}

// The slider is logarithmic so every step changes the zoom by the same percentage.
const sliderToZoom = (value) => MAX_ZOOM ** (Number(value) / 100);
const zoomToSlider = (zoom) => (Math.log(clamp(zoom, 1, MAX_ZOOM)) / Math.log(MAX_ZOOM)) * 100;

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function readProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    return null;
  }
}

function setupProfile() {
  const form = document.querySelector(".profile-form");
  const nameInput = form.elements.namedItem("name");
  const ageInput = form.elements.namedItem("age");
  const status = document.querySelector("#profile-status");

  const saved = readProfile();
  if (saved) {
    nameInput.value = typeof saved.name === "string" ? saved.name : "";
    ageInput.value = Number.isInteger(saved.age) ? String(saved.age) : "";
  }

  function report(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const ageText = ageInput.value.trim();
    const age = ageText === "" ? null : Number(ageText);

    if (ageInput.validity.badInput || (age !== null && (!Number.isInteger(age) || age < 1))) {
      ageInput.setAttribute("aria-invalid", "true");
      report("Enter a positive whole number for age.", true);
      ageInput.focus();
      return;
    }

    ageInput.removeAttribute("aria-invalid");
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, age }));
      report("Saved on this device.", false);
    } catch {
      report("This browser could not save your profile.", true);
    }
  });

  ageInput.addEventListener("input", () => ageInput.removeAttribute("aria-invalid"));
}

// Builds the SVG path and the bounding box of the main landmass (largest outer ring).
function buildShape(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const commands = [];
  let main = { area: -1, x: 0, y: 0, w: 0, h: 0 };

  for (const polygon of polygons) {
    polygon.forEach((ring, ringIndex) => {
      let area = 0;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let previous = null;

      ring.forEach((coordinate, index) => {
        const [x, y] = project(coordinate[0], coordinate[1]);
        commands.push(`${index === 0 ? "M" : "L"}${round2(x)},${round2(y)}`);
        if (previous) area += previous[0] * y - x * previous[1];
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        previous = [x, y];
      });
      commands.push("Z");

      if (ringIndex === 0 && Math.abs(area) > main.area) {
        main = { area: Math.abs(area), x: minX, y: minY, w: maxX - minX, h: maxY - minY };
      }
    });
  }

  return { d: commands.join(""), main };
}

function createMap(features, countriesByIso, onSelect) {
  const svg = svgElement("svg", {
    viewBox: `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label": "World map. Choose a continent and a country from the lists, or click a country on the map.",
  });
  const land = svgElement("g");
  const top = svgElement("g");
  const marker = svgElement("g", { class: "map-marker", visibility: "hidden" });
  marker.append(svgElement("circle", { class: "marker-halo" }), svgElement("circle", { class: "marker-ring" }));

  const shapes = new Map();
  const paths = [];

  for (const feature of features) {
    const { iso, continent } = feature.properties;
    const { d, main } = buildShape(feature.geometry);
    const path = svgElement("path", { d, class: "map-shape", "fill-rule": "evenodd" });
    path.dataset.continent = continent;

    if (iso) {
      path.dataset.iso = iso;
      const title = svgElement("title");
      title.textContent = countriesByIso.get(iso).name;
      path.append(title);
      shapes.set(iso, { path, box: main });
    }
    paths.push(path);
  }

  land.append(...paths);
  svg.append(land, top, marker);
  svg.addEventListener("click", (event) => {
    const path = event.target.closest("path[data-iso]");
    if (path) onSelect(path.dataset.iso);
  });

  return { svg, land, top, marker, shapes, paths };
}

async function loadData() {
  const [countryResponse, mapResponse] = await Promise.all([
    fetch("./data/countries.json"),
    fetch("./data/world-countries.geojson"),
  ]);
  if (!countryResponse.ok || !mapResponse.ok) throw new Error("Could not load the ATLAS data files.");
  const [countries, map] = await Promise.all([countryResponse.json(), mapResponse.json()]);
  return { countries, features: map.features };
}

function enableArrowNavigation(container) {
  container.addEventListener("keydown", (event) => {
    const buttons = [...container.querySelectorAll("button")];
    const index = buttons.indexOf(document.activeElement);
    const targets = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: buttons.length - 1,
    };
    if (index === -1 || !Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    buttons[clamp(targets[event.key], 0, buttons.length - 1)].focus();
  });
}

const normalize = (text) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").replace(/[\u2018\u2019]/g, "'").toLocaleLowerCase("en");

async function setupAtlas() {
  const explorer = document.querySelector("[data-explorer]");
  const stage = explorer.querySelector("[data-world-map]");
  const continentList = explorer.querySelector("[data-continent-list]");
  const countryList = explorer.querySelector("[data-country-list]");
  const countryHeading = explorer.querySelector("[data-country-heading]");
  const countryCount = explorer.querySelector("[data-country-count]");
  const totalLabel = document.querySelector("[data-country-total]");
  const announcer = document.querySelector("[data-announcer]");
  const info = {
    flag: explorer.querySelector("[data-info-flag]"),
    name: explorer.querySelector("[data-info-name]"),
    iso: explorer.querySelector("[data-info-iso]"),
    note: explorer.querySelector("[data-info-note]"),
  };
  const searchInput = explorer.querySelector("[data-search-input]");
  const suggestionList = explorer.querySelector("[data-suggestions]");
  const fullPageToggle = explorer.querySelector("[data-fullpage-toggle]");
  const zoomSlider = explorer.querySelector("[data-zoom-slider]");
  const zoomValue = explorer.querySelector("[data-zoom-value]");
  const zoomReset = explorer.querySelector("[data-zoom-reset]");

  let data;
  try {
    data = await loadData();
  } catch (error) {
    countryList.innerHTML = '<p class="loading-message">ATLAS data could not be loaded. Open this site through a web server.</p>';
    console.error(error);
    return;
  }

  const { countries, features } = data;
  const collator = new Intl.Collator("en");
  const countriesByIso = new Map(countries.map((country) => [country.isoAlpha3, country]));
  const countriesByContinent = new Map(
    CONTINENTS.map((name) => [
      name,
      countries.filter((country) => country.continent === name).sort((a, b) => collator.compare(a.name, b.name)),
    ]),
  );
  const searchIndex = [...countries]
    .sort((a, b) => collator.compare(a.name, b.name))
    .map((country) => ({ country, key: normalize(country.name) }));
  const map = createMap(features, countriesByIso, selectCountry);
  stage.replaceChildren(map.svg);

  // There is always a selected continent and country: Africa and its first country by default.
  let selectedContinent = "Africa";
  let selectedIso = countriesByContinent.get(selectedContinent)[0].isoAlpha3;
  let listedContinent = null;
  let highlighted = null;
  let view = null;
  let animation = 0;
  let customView = false;

  totalLabel.textContent = `${countries.length} countries and areas`;

  function announce(message) {
    announcer.textContent = message;
  }

  function renderContinentButtons() {
    const buttons = CONTINENTS.map((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "continent-option";
      button.dataset.continent = name;
      const label = document.createElement("span");
      label.textContent = name;
      const count = document.createElement("span");
      count.className = "continent-count";
      count.textContent = String(countriesByContinent.get(name).length);
      button.append(label, count);
      button.addEventListener("click", () => selectContinent(name));
      return button;
    });
    continentList.replaceChildren(...buttons);
  }

  function renderCountryButtons() {
    const list = countriesByContinent.get(selectedContinent);
    const buttons = list.map((country) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "country-option";
      button.dataset.iso = country.isoAlpha3;
      button.textContent = country.name;
      button.addEventListener("click", () => selectCountry(country.isoAlpha3));
      return button;
    });
    countryList.replaceChildren(...buttons);
    countryHeading.textContent = selectedContinent;
    countryCount.textContent = String(list.length);
    listedContinent = selectedContinent;
  }

  // Scrolls only the list, never the page.
  function scrollListTo(button, animate) {
    const top = button.offsetTop - (countryList.clientHeight - button.offsetHeight) / 2;
    countryList.scrollTo({ top: Math.max(0, top), behavior: animate && !reducedMotion.matches ? "smooth" : "auto" });
  }

  function updateHighlights() {
    for (const path of map.paths) path.classList.toggle("in-continent", path.dataset.continent === selectedContinent);

    if (highlighted) {
      highlighted.path.classList.remove("is-selected");
      map.land.append(highlighted.path);
      highlighted = null;
    }
    const entry = map.shapes.get(selectedIso);
    if (entry) {
      entry.path.classList.add("is-selected");
      map.top.append(entry.path);
      highlighted = entry;
    }
    updateMarker();
  }

  // Tiny countries are invisible as shapes, so a ring marks where the selected one is.
  function updateMarker() {
    const entry = map.shapes.get(selectedIso);
    const scale = view ? Math.min(stage.clientWidth / view.w, stage.clientHeight / view.h) : 0;
    if (!entry || !scale || Math.max(entry.box.w, entry.box.h) * scale >= MARKER_MAX_SHAPE_PX) {
      map.marker.setAttribute("visibility", "hidden");
      return;
    }
    for (const circle of map.marker.children) {
      circle.setAttribute("cx", entry.box.x + entry.box.w / 2);
      circle.setAttribute("cy", entry.box.y + entry.box.h / 2);
      circle.setAttribute("r", MARKER_RADIUS_PX / scale);
    }
    map.marker.removeAttribute("visibility");
  }

  const stageAspect = () => (stage.clientWidth && stage.clientHeight ? stage.clientWidth / stage.clientHeight : 2);

  // The continent's default view, widened when the selected country lies outside it.
  function computeView() {
    const entry = map.shapes.get(selectedIso);
    const rect = entry ? unionRects(CONTINENT_RECTS[selectedContinent], entry.box) : CONTINENT_RECTS[selectedContinent];
    return fitView(rect, stageAspect());
  }

  // After the user zooms or pans, a new country keeps the zoom and is centred; otherwise the default view applies.
  function nextView() {
    if (!customView) return computeView();
    const entry = map.shapes.get(selectedIso);
    if (!entry) return view;
    return clampView({
      ...view,
      x: entry.box.x + entry.box.w / 2 - view.w / 2,
      y: entry.box.y + entry.box.h / 2 - view.h / 2,
    });
  }

  function setCustomView(active) {
    customView = active;
    zoomReset.disabled = !active;
  }

  function showZoom(zoom) {
    const amount = zoom < 10 ? zoom.toFixed(1) : String(Math.round(zoom));
    zoomSlider.value = String(Math.round(zoomToSlider(zoom)));
    zoomSlider.setAttribute("aria-valuetext", `${amount} times`);
    zoomValue.textContent = `${amount}\u00D7`;
  }

  function setView(next) {
    view = next;
    map.svg.setAttribute("viewBox", `${next.x} ${next.y} ${next.w} ${next.h}`);
    showZoom(zoomOf(next));
    updateMarker();
  }

  function moveTo(target, animate) {
    cancelAnimationFrame(animation);
    if (!view || !animate || reducedMotion.matches) {
      setView(target);
      return;
    }

    const from = view;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - start) / ZOOM_DURATION_MS);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
      setView({
        x: lerp(from.x, target.x, eased),
        y: lerp(from.y, target.y, eased),
        w: lerp(from.w, target.w, eased),
        h: lerp(from.h, target.h, eased),
      });
      if (progress < 1) animation = requestAnimationFrame(step);
    };
    animation = requestAnimationFrame(step);
  }

  function renderInfo() {
    const country = countriesByIso.get(selectedIso);
    info.flag.src = `./img/flags/${country.isoAlpha2.toLowerCase()}.svg`;
    info.flag.alt = `Flag of ${country.name}`;
    info.name.textContent = country.name;
    info.iso.textContent = country.isoAlpha3;
    info.note.hidden = map.shapes.has(selectedIso);
  }

  function render(animate) {
    for (const button of continentList.children) {
      const pressed = button.dataset.continent === selectedContinent;
      button.setAttribute("aria-pressed", String(pressed));
      button.tabIndex = pressed ? 0 : -1;
    }

    if (listedContinent !== selectedContinent) renderCountryButtons();
    for (const button of countryList.children) {
      const pressed = button.dataset.iso === selectedIso;
      button.setAttribute("aria-pressed", String(pressed));
      button.tabIndex = pressed ? 0 : -1;
      if (pressed) scrollListTo(button, animate);
    }

    updateHighlights();
    moveTo(nextView(), animate);
    renderInfo();
  }

  function selectContinent(name) {
    selectedContinent = name;
    selectedIso = countriesByContinent.get(name)[0].isoAlpha3;
    setCustomView(false);
    render(true);
    announce(`${name} selected. ${countriesByIso.get(selectedIso).name} selected.`);
  }

  function selectCountry(iso) {
    const country = countriesByIso.get(iso);
    if (country.continent !== selectedContinent) setCustomView(false);
    selectedContinent = country.continent;
    selectedIso = iso;
    render(true);
    announce(`${country.name} selected in ${country.continent}.`);
  }

  // Search by start of name. The lists and the map only change once a suggestion is confirmed.
  let suggestions = [];
  let activeIndex = -1;

  function setActiveSuggestion(index) {
    activeIndex = index;
    const items = suggestionList.querySelectorAll(".suggestion");
    items.forEach((item, position) => {
      const active = position === index;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    if (index >= 0) {
      searchInput.setAttribute("aria-activedescendant", items[index].id);
      items[index].scrollIntoView({ block: "nearest" });
    } else {
      searchInput.removeAttribute("aria-activedescendant");
    }
  }

  function closeSuggestions() {
    suggestions = [];
    activeIndex = -1;
    suggestionList.hidden = true;
    suggestionList.replaceChildren();
    searchInput.setAttribute("aria-expanded", "false");
    searchInput.removeAttribute("aria-activedescendant");
  }

  function updateSuggestions() {
    const typed = searchInput.value.trim();
    const query = normalize(typed);
    if (!query) {
      closeSuggestions();
      return;
    }

    suggestions = searchIndex.filter((item) => item.key.startsWith(query)).map((item) => item.country);
    const items = suggestions.map((country) => {
      const item = document.createElement("li");
      item.id = `suggestion-${country.isoAlpha3}`;
      item.className = "suggestion";
      item.setAttribute("role", "option");
      item.dataset.iso = country.isoAlpha3;
      const label = document.createElement("span");
      const prefix = document.createElement("mark");
      prefix.textContent = country.name.slice(0, query.length);
      label.append(prefix, country.name.slice(query.length));
      const meta = document.createElement("span");
      meta.className = "suggestion-meta";
      meta.textContent = country.continent;
      item.append(label, meta);
      return item;
    });

    if (!items.length) {
      const empty = document.createElement("li");
      empty.className = "suggestion-empty";
      empty.setAttribute("role", "presentation");
      empty.textContent = `No country starts with \u201C${typed}\u201D`;
      items.push(empty);
    }

    suggestionList.replaceChildren(...items);
    suggestionList.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    setActiveSuggestion(suggestions.length ? 0 : -1);
  }

  function confirmSuggestion(country) {
    searchInput.value = "";
    closeSuggestions();
    selectCountry(country.isoAlpha3);
  }

  searchInput.addEventListener("input", updateSuggestions);
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) updateSuggestions();
  });
  searchInput.addEventListener("blur", closeSuggestions);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (suggestionList.hidden) {
        updateSuggestions();
      } else if (suggestions.length) {
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveSuggestion((activeIndex + step + suggestions.length) % suggestions.length);
      }
    } else if (event.key === "Enter") {
      if (!suggestionList.hidden && activeIndex >= 0) {
        event.preventDefault();
        confirmSuggestion(suggestions[activeIndex]);
      }
    } else if (event.key === "Escape" && !suggestionList.hidden) {
      event.stopPropagation();
      closeSuggestions();
    }
  });
  suggestionList.addEventListener("mousedown", (event) => event.preventDefault());
  suggestionList.addEventListener("click", (event) => {
    const item = event.target.closest(".suggestion");
    if (item) confirmSuggestion(countriesByIso.get(item.dataset.iso));
  });

  // Full page view: the explorer covers the viewport and the rest of the page is made inert.
  const backgroundElements = [".skip-link", ".site-header", ".page-heading", ".site-footer"]
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  function setFullPage(active) {
    explorer.classList.toggle("is-fullpage", active);
    document.body.classList.toggle("is-fullpage", active);
    fullPageToggle.setAttribute("aria-pressed", String(active));
    fullPageToggle.setAttribute("aria-label", active ? "Exit full page view" : "Enter full page view");
    fullPageToggle.title = active ? "Normal view" : "Full page view";
    for (const element of backgroundElements) element.inert = active;
  }

  fullPageToggle.addEventListener("click", () => setFullPage(!explorer.classList.contains("is-fullpage")));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && explorer.classList.contains("is-fullpage")) setFullPage(false);
  });

  // Zoom with the slider or the wheel (anchored at the cursor); anchor is a 0-1 position in the stage.
  function zoomTo(zoom, anchor = { x: 0.5, y: 0.5 }) {
    const level = clamp(zoom, 1, MAX_ZOOM);
    if (Math.abs(level - zoomOf(view)) < 0.001) return;
    cancelAnimationFrame(animation);
    setCustomView(true);
    const next = viewForZoom(level, view.w / view.h);
    setView(
      clampView({
        ...next,
        x: view.x + anchor.x * (view.w - next.w),
        y: view.y + anchor.y * (view.h - next.h),
      }),
    );
  }

  zoomSlider.addEventListener("input", () => zoomTo(sliderToZoom(zoomSlider.value)));
  zoomReset.addEventListener("click", () => {
    setCustomView(false);
    moveTo(computeView(), true);
  });
  stage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const bounds = stage.getBoundingClientRect();
      const unit = event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? 400 : 1;
      zoomTo(zoomOf(view) * Math.exp(-event.deltaY * unit * WHEEL_SENSITIVITY), {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
      });
    },
    { passive: false },
  );

  // Drag to pan with a mouse or pen; touch keeps scrolling the page. A drag must not select a country.
  let drag = null;
  let suppressClick = false;

  function onDragMove(event) {
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < DRAG_THRESHOLD_PX) return;
      cancelAnimationFrame(animation);
      drag.moved = true;
      drag.view = view;
      setCustomView(true);
      stage.classList.add("is-dragging");
    }
    const scale = Math.min(stage.clientWidth / drag.view.w, stage.clientHeight / drag.view.h);
    setView(
      clampView({
        ...drag.view,
        x: drag.view.x - (event.clientX - drag.x) / scale,
        y: drag.view.y - (event.clientY - drag.y) / scale,
      }),
    );
  }

  function endDrag() {
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    stage.classList.remove("is-dragging");
    if (drag.moved) {
      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      });
    }
    drag = null;
  }

  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.pointerType === "touch") return;
    drag = { moved: false, x: event.clientX, y: event.clientY, view };
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  });
  stage.addEventListener(
    "click",
    (event) => {
      if (suppressClick) event.stopPropagation();
    },
    true,
  );

  enableArrowNavigation(continentList);
  enableArrowNavigation(countryList);
  renderContinentButtons();
  render(false);

  // A resize keeps the user's zoom and centre; otherwise the continent's default view is refitted.
  new ResizeObserver(() => {
    cancelAnimationFrame(animation);
    if (!customView) {
      setView(computeView());
      return;
    }
    const next = viewForZoom(zoomOf(view), stageAspect());
    setView(clampView({ ...next, x: view.x + view.w / 2 - next.w / 2, y: view.y + view.h / 2 - next.h / 2 }));
  }).observe(stage);
}

setupProfile();
setupAtlas();
