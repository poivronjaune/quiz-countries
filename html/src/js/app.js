const CONTINENTS = [
  "Africa",
  "Antarctica",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
];

const PROFILE_KEY = "atlas.profile.v1";
const SVG_NS = "http://www.w3.org/2000/svg";

function setupProfile() {
  const form = document.querySelector(".profile-form");
  if (!form) return;

  const nameInput = form.elements.namedItem("name");
  const ageInput = form.elements.namedItem("age");
  const status = document.querySelector("#profile-status");
  const welcome = document.querySelector("[data-welcome]");

  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    if (saved && typeof saved === "object") {
      nameInput.value = typeof saved.name === "string" ? saved.name : "";
      ageInput.value = Number.isInteger(saved.age) ? String(saved.age) : "";
      if (welcome && saved.name) {
        welcome.textContent = `Welcome back, ${saved.name}.`;
        welcome.hidden = false;
      }
    }
  } catch {
    localStorage.removeItem(PROFILE_KEY);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const ageText = ageInput.value.trim();
    const age = ageText === "" ? null : Number(ageText);

    if (age !== null && (!Number.isInteger(age) || age < 1)) {
      status.textContent = "Enter a positive whole number for age.";
      ageInput.setAttribute("aria-invalid", "true");
      ageInput.focus();
      return;
    }

    ageInput.removeAttribute("aria-invalid");
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, age }));
      status.textContent = "Saved on this device.";
      if (welcome) {
        welcome.textContent = name ? `Welcome back, ${name}.` : "Your profile is saved on this device.";
        welcome.hidden = false;
      }
    } catch {
      status.textContent = "This browser could not save your profile.";
    }
  });

  ageInput.addEventListener("input", () => ageInput.removeAttribute("aria-invalid"));
}

function mapCodeForFeature(properties, countriesByCode) {
  const candidates = [
    properties.ISO_A3,
    properties.ADM0_A3,
    properties.ISO_A3_EH,
    properties.GU_A3,
    properties.SU_A3,
  ];
  return candidates.find((code) => code && countriesByCode.has(code)) || null;
}

function projectCoordinate([longitude, latitude], width, height) {
  const x = ((longitude + 180) / 360) * width;
  const y = ((90 - Math.max(-85, Math.min(85, latitude))) / 180) * height;
  return [x, y];
}

function geometryPath(geometry, width, height) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const commands = [];

  for (const polygon of polygons) {
    for (const ring of polygon) {
      let previousX = null;
      for (let index = 0; index < ring.length; index += 1) {
        const [x, y] = projectCoordinate(ring[index], width, height);
        const crossesDateLine = previousX !== null && Math.abs(x - previousX) > width / 2;
        commands.push(`${index === 0 || crossesDateLine ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
        previousX = x;
      }
      commands.push("Z");
    }
  }

  return commands.join("");
}

function buildMap(container, features, countriesByCode, options = {}) {
  const width = 960;
  const height = 480;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "World map with country and area boundaries");

  const mappedCodes = new Set();
  const paths = [];

  for (const feature of features) {
    if (!feature.geometry) continue;
    const properties = feature.properties || {};
    const code = mapCodeForFeature(properties, countriesByCode);
    const country = code ? countriesByCode.get(code) : null;
    if (country) mappedCodes.add(code);

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", geometryPath(feature.geometry, width, height));
    path.setAttribute("class", "map-shape");
    path.setAttribute("fill-rule", "evenodd");

    if (country) {
      path.dataset.iso = code;
      path.dataset.continent = country.continent;
      path.classList.add("is-selectable");
      path.setAttribute("tabindex", options.interactive ? "0" : "-1");
      path.setAttribute("role", options.interactive ? "button" : "presentation");
      path.setAttribute("aria-label", country.name);
      const title = document.createElementNS(SVG_NS, "title");
      title.textContent = country.name;
      path.append(title);

      if (options.interactive) {
        path.addEventListener("click", () => options.onSelect(country));
        path.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            options.onSelect(country);
          }
        });
      }
    } else {
      path.setAttribute("aria-hidden", "true");
    }

    paths.push(path);
  }

  svg.append(...paths);
  container.replaceChildren(svg);
  return { svg, mappedCodes };
}

async function loadLocalData() {
  const [countryResponse, mapResponse] = await Promise.all([
    fetch("./js/countries.json"),
    fetch("./data/world-countries.geojson"),
  ]);
  if (!countryResponse.ok || !mapResponse.ok) {
    throw new Error("Could not load the local atlas data.");
  }
  const [countries, mapData] = await Promise.all([countryResponse.json(), mapResponse.json()]);
  return { countries, features: mapData.features };
}

async function setupHomeMap() {
  const container = document.querySelector("[data-map-preview]");
  if (!container) return;

  try {
    const { countries, features } = await loadLocalData();
    const countriesByCode = new Map(countries.map((country) => [country.isoAlpha3, country]));
    buildMap(container, features, countriesByCode);
  } catch {
    container.setAttribute("aria-label", "Map preview unavailable");
  }
}

async function setupContinentsPage() {
  const continentList = document.querySelector("[data-continent-list]");
  if (!continentList) return;

  const countryList = document.querySelector("[data-country-list]");
  const countryHeading = document.querySelector("[data-country-heading]");
  const countryCount = document.querySelector("[data-country-count]");
  const countrySearch = document.querySelector("[data-country-search]");
  const countryEmpty = document.querySelector("[data-country-empty]");
  const entryTotal = document.querySelector("[data-entry-total]");
  const mapCoverage = document.querySelector("[data-map-coverage]");
  const mapContainer = document.querySelector(".world-map-container");

  try {
    const { countries, features } = await loadLocalData();
    const countriesByCode = new Map(countries.map((country) => [country.isoAlpha3, country]));
    const counts = new Map(CONTINENTS.map((continent) => [
      continent,
      countries.filter((country) => country.continent === continent).length,
    ]));
    let selectedContinent = "Africa";
    let selectedCountry = null;

    entryTotal.textContent = `${countries.length} country and area entries`;

    function renderContinentOptions() {
      const label = continentList.querySelector(".panel-label");
      const options = document.createElement("div");
      options.className = "continent-options";

      for (const continent of CONTINENTS) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "continent-option";
        button.setAttribute("aria-pressed", String(continent === selectedContinent));
        button.innerHTML = `<span class="continent-name"></span><span class="continent-number"></span>`;
        button.querySelector(".continent-name").textContent = continent;
        button.querySelector(".continent-number").textContent = String(counts.get(continent)).padStart(2, "0");
        button.addEventListener("click", () => {
          selectedContinent = continent;
          selectedCountry = null;
          countrySearch.value = "";
          render();
        });
        options.append(button);
      }

      continentList.replaceChildren(label, options);
    }

    function renderCountryNames() {
      const query = countrySearch.value.trim().toLocaleLowerCase();
      const visibleCountries = countries
        .filter((country) => country.continent === selectedContinent)
        .filter((country) => country.name.toLocaleLowerCase().includes(query))
        .sort((left, right) => left.name.localeCompare(right.name));

      countryHeading.textContent = selectedContinent;
      countryCount.textContent = `${visibleCountries.length}`;
      countryEmpty.hidden = visibleCountries.length !== 0;

      const fragment = document.createDocumentFragment();
      for (const country of visibleCountries) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "country-option";
        button.dataset.iso = country.isoAlpha3;
        button.setAttribute("aria-pressed", String(country.isoAlpha3 === selectedCountry));

        const name = document.createElement("span");
        name.className = "country-option-name";
        name.textContent = country.name;
        button.append(name);

        if (!mapState.mappedCodes.has(country.isoAlpha3)) {
          const note = document.createElement("span");
          note.className = "country-option-no-map";
          note.textContent = "No map shape";
          button.append(note);
        }

        button.addEventListener("click", () => selectCountry(country));
        fragment.append(button);
      }
      countryList.replaceChildren(fragment);
    }

    function updateMapSelection() {
      for (const path of mapState.svg.querySelectorAll(".map-shape[data-iso]")) {
        const inRegion = path.dataset.continent === selectedContinent;
        path.classList.toggle("is-outside-region", !inRegion);
        path.classList.toggle("is-selected-country", path.dataset.iso === selectedCountry);
      }
    }

    function selectCountry(country) {
      selectedCountry = country.isoAlpha3;
      countryHeading.textContent = selectedContinent;
      renderCountryNames();
      updateMapSelection();
    }

    const mapState = buildMap(mapContainer, features, countriesByCode, {
      interactive: true,
      onSelect: selectCountry,
    });
    const coveredEntryCount = countries.filter((country) => mapState.mappedCodes.has(country.isoAlpha3)).length;
    mapCoverage.textContent = `${coveredEntryCount} of ${countries.length} entries mapped`;

    function render() {
      renderContinentOptions();
      renderCountryNames();
      updateMapSelection();
    }

    countrySearch.addEventListener("input", renderCountryNames);
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && document.activeElement !== countrySearch && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        countrySearch.focus();
      }
    });

    render();
  } catch (error) {
    continentList.innerHTML = '<p class="loading-message">Atlas data could not be loaded. Open this site through a local web server.</p>';
    countryList.replaceChildren();
    countryHeading.textContent = "Unavailable";
    console.error(error);
  }
}

setupProfile();
setupHomeMap();
setupContinentsPage();
