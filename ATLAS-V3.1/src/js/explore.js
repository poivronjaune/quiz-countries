// Explore page controller: continents, countries, map, detail card, bottom sheet.
import { h, $, $$, prefersReducedMotion, clamp } from "./util.js";
import { initI18n, t, tp, getLang, fmt } from "./i18n.js";
import { loadData, allCountries, allShapes, countryByIso, nameOf, capitalsOf, continentName, continentCount, sortedByContinent, searchCountries, flagUrl, CONTINENTS, continentBounds } from "./data.js";
import { createMapView } from "./map-view.js";
import { createCombobox } from "./combobox.js";
import { mountShell } from "./shell.js";

const SIDE_MQ = window.matchMedia("(min-width: 640px), (max-height: 500px) and (orientation: landscape)");
const state = { continent: "Africa", iso: null };
let map, sheet;

async function boot() {
  await initI18n();
  mountShell({ page: "explore" });
  const status = $("[data-map-status]");
  try {
    await loadData();
  } catch (err) {
    console.error(err);
    status.replaceChildren(h("span", {}, t("state.error")), h("button", { class: "button", type: "button", onclick: () => location.reload() }, t("state.retry")));
    return;
  }
  status.hidden = true;
  setup();
}

function setup() {
  const mapEl = $("[data-map]");
  map = createMapView(mapEl, {
    shapes: allShapes(), countries: allCountries(),
    label: (iso) => nameOf(countryByIso(iso)),
    onSelect: (iso) => select(iso, "map"),
  });
  mapEl.setAttribute("aria-label", t("map.aria"));
  sheet = createSheet();

  // default selection: Africa + first country in the current language
  state.continent = "Africa";
  state.iso = sortedByContinent(state.continent)[0].iso3;
  renderAll();
  map.setMark(state.iso, "selected");
  map.setContinent(sortedByContinent(state.continent).map((c) => c.iso3));
  map.fitBounds(continentBounds(state.continent), { animate: false });

  buildSearch();
  buildFullscreen();
  window.addEventListener("atlas:language", () => { renderAll(); mapEl.setAttribute("aria-label", t("map.aria")); });
  SIDE_MQ.addEventListener("change", () => sheet.sync());
}

// ---------- selection ----------
function select(iso, source) {
  const c = countryByIso(iso);
  if (!c) return;
  const continentChanged = c.continent !== state.continent;
  state.iso = iso;
  if (continentChanged) {
    state.continent = c.continent;
    map.setContinent(sortedByContinent(state.continent).map((x) => x.iso3));
    renderContinents(); renderList();
    if (!map.hasUserMoved()) map.fitBounds(continentBounds(state.continent));
  }
  map.setMark(iso, "selected");
  renderDetail(); markList();
  if (source === "list" || source === "search") sheet.afterPick();
  if (!(continentChanged && !map.hasUserMoved())) {
    if (source === "map") map.reveal(iso); else map.centerOn(iso);
  }
  if (source === "map" && !SIDE_MQ.matches && sheet.state() === "hidden") sheet.set("peek");
}

function selectContinent(name) {
  state.continent = name;
  const list = sortedByContinent(name);
  state.iso = list[0].iso3;
  map.setContinent(list.map((c) => c.iso3));
  map.fitBounds(continentBounds(name));
  map.setMark(state.iso, "selected");
  renderContinents(); renderList(); renderDetail();
}

// ---------- rendering ----------
function renderAll() {
  $("[data-total]").textContent = tp("explore.total", allCountries().length);
  renderContinents(); renderList(); renderDetail();
}

function renderContinents() {
  const mk = (cls) => CONTINENTS.map((name) => {
    const b = h("button", { type: "button", class: cls, "aria-pressed": String(name === state.continent), dataset: { continent: name }, onclick: () => selectContinent(name) },
      h("span", { class: "continent-name" }, continentName(name)), h("span", { class: "continent-count" }, fmt(continentCount(name))));
    return b;
  });
  $("[data-chips]").replaceChildren(...mk("chip"));
  $("[data-continent-list]").replaceChildren(...mk("continent-item"));
  $$(".chip[aria-pressed=true]").forEach((el) => el.scrollIntoView({ inline: "center", block: "nearest" }));
}

function renderList() {
  const list = sortedByContinent(state.continent);
  $("[data-list-heading]").textContent = continentName(state.continent);
  $("[data-list-count]").textContent = tp("explore.count", list.length);
  const box = $("[data-country-list]");
  box.replaceChildren(...list.map((c) => h("button", { type: "button", class: "country-item", dataset: { iso: c.iso3 }, tabindex: "-1", onclick: () => select(c.iso3, "list") }, nameOf(c))));
  box.onkeydown = (e) => {
    const items = $$(".country-item", box);
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const cols = getComputedStyle(box).gridTemplateColumns.split(" ").length || 1;
    const move = { ArrowDown: cols, ArrowUp: -cols, ArrowRight: 1, ArrowLeft: -1, Home: -i, End: items.length - 1 - i }[e.key];
    if (move == null) return;
    e.preventDefault();
    const n = items[clamp(i + move, 0, items.length - 1)];
    items.forEach((x) => x.tabIndex = -1); n.tabIndex = 0; n.focus();
  };
  markList();
}

function markList() {
  const items = $$(".country-item");
  let current = null;
  for (const el of items) {
    const on = el.dataset.iso === state.iso;
    el.classList.toggle("is-selected", on);
    if (on) { el.setAttribute("aria-current", "true"); el.tabIndex = 0; current = el; } else { el.removeAttribute("aria-current"); el.tabIndex = -1; }
  }
  if (!current && items[0]) items[0].tabIndex = 0;
  if (current && sheet?.state() !== "peek") current.scrollIntoView({ block: "nearest" });
  $$(".chip, .continent-item").forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.continent === state.continent)));
  $$(".chip[aria-pressed=true]").forEach((el) => el.scrollIntoView({ inline: "center", block: "nearest" }));
}

function renderDetail() {
  const c = countryByIso(state.iso);
  const caps = capitalsOf(c);
  const capText = c.noCapital || caps.length === 0 ? t("country.capital.none") : caps.join(" · ");
  const flag = h("img", { class: "detail-flag", src: flagUrl(c), alt: t("country.flag.alt", { name: nameOf(c) }), width: 72, height: 54, decoding: "async" });
  const zoomBtn = h("button", { type: "button", class: "detail-zoom map-btn", "aria-label": t("country.zoom"), title: t("country.zoom"), onclick: () => { map.fitCountry(state.iso); if (!SIDE_MQ.matches && sheet.state() === "half") sheet.set("peek"); } });
  zoomBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/></svg>';
  $("[data-detail]").replaceChildren(
    flag,
    h("div", { class: "detail-text" },
      h("p", { class: "detail-name" }, h("strong", {}, nameOf(c))),
      h("p", { class: "detail-capital" }, h("span", { class: "label" }, t(caps.length > 1 ? "country.capitals" : "country.capital")), " ", h("strong", {}, capText))),
    zoomBtn);
  sheet?.refresh();
}

// ---------- search ----------
function buildSearch() {
  const input = $("[data-search]");
  createCombobox(input, $("[data-suggestions]"), {
    getItems: (q) => searchCountries(q).map((c) => ({ key: c.iso3, label: nameOf(c), sub: continentName(c.continent) })),
    onChoose: (item) => { input.value = ""; select(item.key, "search"); input.blur(); },
  });
}

// ---------- full screen (tablet / desktop) ----------
function buildFullscreen() {
  const body = $("[data-body]");
  const b = h("button", { type: "button", class: "map-btn map-full", "aria-pressed": "false", "data-i18n-aria-label": "map.full.enter", "aria-label": t("map.full.enter"), "data-i18n-title": "map.full.enter", title: t("map.full.enter") });
  b.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  const set = (on) => {
    body.classList.toggle("is-full", on);
    document.body.classList.toggle("is-full", on);
    b.setAttribute("aria-pressed", String(on));
    const k = on ? "map.full.exit" : "map.full.enter";
    b.setAttribute("aria-label", t(k)); b.title = t(k);
    requestAnimationFrame(() => { map.resize(); map.centerOn(state.iso, { animate: false }); });
  };
  b.addEventListener("click", () => set(!body.classList.contains("is-full")));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && body.classList.contains("is-full")) set(false);
    if ((e.key === "f" || e.key === "F") && !/input|textarea|select/i.test(e.target.tagName) && SIDE_MQ.matches) set(!body.classList.contains("is-full"));
  });
  map.controls.append(b);
}

// ---------- bottom sheet (phone) / side panel (tablet, desktop) ----------
function createSheet() {
  const el = $("[data-sheet]"), body = $("[data-body]"), handle = $("[data-sheet-handle]"), pill = $("[data-sheet-pill]"), detail = $("[data-detail]");
  let st = "peek", dragging = null;
  const peekH = () => Math.round(handle.offsetHeight + detail.offsetHeight + 10);
  const halfH = () => Math.max(peekH() + 140, Math.round(body.clientHeight * 0.5));
  const heightOf = (s) => (SIDE_MQ.matches ? 0 : s === "hidden" ? 0 : s === "half" ? halfH() : peekH());

  function paint(px, animate = true) {
    el.style.transition = animate && !prefersReducedMotion() ? "" : "none";
    el.style.height = SIDE_MQ.matches ? "" : `${px}px`;
  }
  function apply(animate = true) {
    el.dataset.state = st;
    handle.setAttribute("aria-expanded", String(st === "half"));
    pill.hidden = SIDE_MQ.matches || st !== "hidden";
    lastPeek = peekH();
    paint(heightOf(st), animate);
    map.setInsets({ bottom: SIDE_MQ.matches ? 0 : heightOf(st) });
    if (map.getView().W) { if (map.hasUserMoved()) map.centerOn(state.iso, { animate }); else map.reset(animate); }
  }
  let lastPeek = 0;
  const api = {
    state: () => st,
    /** Re-measure after the detail card changed (long names wrap onto more lines). */
    refresh() { if (SIDE_MQ.matches) return; const p = peekH(); if (p !== lastPeek && st !== "hidden") apply(false); },
    set(s) { st = s; apply(); },
    sync() { apply(false); },
    afterPick() { if (!SIDE_MQ.matches && st === "half") api.set("peek"); },
  };

  handle.addEventListener("click", () => { if (!dragging?.moved) api.set(st === "half" ? "peek" : st === "hidden" ? "peek" : "half"); });
  pill.addEventListener("click", () => api.set("peek"));
  handle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { e.preventDefault(); api.set(st === "hidden" ? "peek" : "half"); }
    if (e.key === "ArrowDown") { e.preventDefault(); api.set(st === "half" ? "peek" : "hidden"); }
  });
  // swipe on the handle / detail card
  const dragTargets = [handle, detail];
  dragTargets.forEach((target) => {
    target.addEventListener("pointerdown", (e) => {
      if (SIDE_MQ.matches || (e.pointerType === "mouse" && e.button !== 0)) return;
      dragging = { y0: e.clientY, h0: el.offsetHeight, t0: performance.now(), moved: false, id: e.pointerId, target };
      target.setPointerCapture(e.pointerId);
    });
    target.addEventListener("pointermove", (e) => {
      if (!dragging || e.pointerId !== dragging.id) return;
      const dy = e.clientY - dragging.y0;
      if (Math.abs(dy) > 6) dragging.moved = true;
      if (dragging.moved) paint(clamp(dragging.h0 - dy, 0, halfH()), false);
    });
    const end = (e) => {
      if (!dragging || e.pointerId !== dragging.id) return;
      const d = dragging; dragging = null;
      if (!d.moved) return;
      setTimeout(() => { d.moved = false; }, 0);
      const dy = e.clientY - d.y0, v = dy / Math.max(1, performance.now() - d.t0);
      const cur = clamp(d.h0 - dy, 0, halfH());
      const stops = [["hidden", 0], ["peek", peekH()], ["half", halfH()]];
      let best = stops.reduce((a, b) => (Math.abs(b[1] - cur) < Math.abs(a[1] - cur) ? b : a))[0];
      if (Math.abs(v) > 0.5) { // flick: go one stop in the direction of the flick
        const order = ["hidden", "peek", "half"], i = order.indexOf(d.h0 >= halfH() - 2 ? "half" : d.h0 <= 2 ? "hidden" : "peek");
        best = order[clamp(i + (v < 0 ? 1 : -1), 0, 2)];
      }
      api.set(best);
    };
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  });
  new ResizeObserver(() => { if (!SIDE_MQ.matches && !dragging) apply(false); }).observe(body);
  requestAnimationFrame(() => apply(false));
  return api;
}

boot();
