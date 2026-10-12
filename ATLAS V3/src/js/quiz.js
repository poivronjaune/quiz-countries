// Quiz page controller: settings -> playing -> results. State lives in one object; render*() paint from it.
import { h, $, store, KEYS, shuffle } from "./util.js";
import { initI18n, t, tp, getLang, fmt } from "./i18n.js";
import { loadData, allCountries, allShapes, countryByIso, nameOf, capitalsOf, aliasesOf, continentName, flagUrl, searchCountries, CONTINENTS, continentBounds } from "./data.js";
import { MODES, MODE_META, COUNTS, buildPool, makeQuestions, buildOptions, typedMatches, bestKey, isBetter, formatTime } from "./quiz-logic.js";
import { createMapView } from "./map-view.js";
import { createCombobox } from "./combobox.js";
import { mountShell } from "./shell.js";

const root = () => $("[data-quiz]");
const announce = (m) => { $("[data-announcer]").textContent = ""; setTimeout(() => { $("[data-announcer]").textContent = m; }, 30); };
const coarse = window.matchMedia("(pointer: coarse)").matches;
const DEFAULTS = { mode: "locate", region: "World", pool: "un", count: 10, style: coarse ? "choice" : "typed", hints: true };

const state = {
  phase: "settings",
  settings: { ...DEFAULTS, ...(store.get(KEYS.settings, {}) || {}) },
  quiz: null, // {questions:[{iso,options,answered,correct,given}], index, score, streak, bestStreak, startedAt, endedAt, pending}
};
let map = null, timer = 0, answeredAt = 0;
const enterNext = (e) => e.key === "Enter" && cur().answered && Date.now() - answeredAt > 400 && !e.target.closest("button,input,select,textarea,summary");

async function boot() {
  await initI18n();
  mountShell({ page: "quiz" });
  try { await loadData(); } catch (e) {
    console.error(e);
    root().replaceChildren(h("p", {}, t("state.error")), h("button", { class: "button", onclick: () => location.reload() }, t("state.retry")));
    return;
  }
  render();
  window.addEventListener("atlas:language", render);
}

function render() {
  destroyMap();
  clearInterval(timer);
  if (state.phase === "settings") renderSettings();
  else if (state.phase === "playing") renderPlay();
  else renderResults();
}
function destroyMap() { if (map) { map.destroy(); map = null; } }

// ---------------- helpers ----------------
const modeStyles = (mode) => MODE_META[mode].styles;
const effectiveStyle = (s) => (modeStyles(s.mode).includes(s.style) ? s.style : modeStyles(s.mode)[0]);
const poolOf = (s) => buildPool(allCountries(), s);
const regionLabel = (r) => (r === "World" ? t("quiz.region.world") : continentName(r));
const svgIcon = (d, size = 20) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", size); s.setAttribute("height", size); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2.6"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true"); s.innerHTML = d; s.classList.add("ico"); return s; };
const CHECK = '<path d="M5 12.5l4.5 4.5L19 7.5"/>', CROSS = '<path d="M6 6l12 12M18 6L6 18"/>';

function segmented(name, legendKey, options, current, onChange) {
  return h("fieldset", { class: "field" }, h("legend", {}, t(legendKey)),
    h("div", { class: "seg" }, options.map((o) => {
      const id = `${name}-${o.value}`;
      const input = h("input", { type: "radio", name, id, value: o.value, checked: String(o.value) === String(current), disabled: o.disabled });
      input.addEventListener("change", () => onChange(o.value));
      return [input, h("label", { for: id }, o.label)];
    })));
}

// ---------------- settings ----------------
function renderSettings() {
  const s = state.settings;
  const stats = store.get(KEYS.stats, {}) || {};
  const size = poolOf(s).length;
  const styles = modeStyles(s.mode);
  const set = (k, v) => { state.settings = { ...state.settings, [k]: v }; store.set(KEYS.settings, state.settings); renderSettings(); };

  const modeCards = h("fieldset", { class: "field" }, h("legend", {}, t("quiz.mode")),
    h("div", { class: "mode-grid" }, MODES.map((m) => {
      const id = `mode-${m}`;
      const input = h("input", { type: "radio", name: "mode", id, value: m, checked: m === s.mode });
      input.addEventListener("change", () => set("mode", m));
      return [input, h("label", { for: id, class: "mode-card" }, h("strong", {}, t(`mode.${m}`)), h("span", {}, t(`mode.${m}.desc`)))];
    })));
  const region = h("div", { class: "field" }, h("label", { for: "quiz-region" }, t("quiz.region")),
    (() => {
      const sel = h("select", { id: "quiz-region" }, ["World", ...CONTINENTS].map((r) => h("option", { value: r, selected: r === s.region }, regionLabel(r))));
      sel.addEventListener("change", () => set("region", sel.value)); return sel;
    })());
  const best = stats[bestKey(s.mode, s.region)];

  root().replaceChildren(h("form", { class: "settings card", onsubmit: (e) => { e.preventDefault(); start(); } },
    h("h2", {}, t("quiz.settings.title")),
    modeCards,
    h("div", { class: "settings-row" },
      region,
      segmented("pool", "quiz.pool", [{ value: "un", label: t("quiz.pool.un") }, { value: "all", label: t("quiz.pool.all") }], s.pool, (v) => set("pool", v))),
    segmented("count", "quiz.count", COUNTS.map((n) => ({ value: n, label: String(n) })), s.count, (v) => set("count", Number(v))),
    s.mode === "locate" ? h("div", { class: "field" }, h("label", { class: "switch" },
      (() => { const c = h("input", { type: "checkbox", checked: s.hints !== false, id: "quiz-hints" }); c.addEventListener("change", () => set("hints", c.checked)); return c; })(),
      h("span", { class: "switch-text" }, h("strong", {}, t("quiz.hints")), h("small", {}, t("quiz.hints.desc"))))) : null,
    styles.length > 1
      ? segmented("style", "quiz.style", [{ value: "choice", label: t("quiz.style.choice") }, { value: "typed", label: t("quiz.style.typed") }], effectiveStyle(s), (v) => set("style", v))
      : h("p", { class: "hint" }, t(s.mode === "locate" ? "quiz.style.map.hint" : "quiz.style.flags.hint")),
    s.mode === "locate"
      ? [segmented("hints", "quiz.hints", [{ value: "on", label: t("quiz.hints.on") }, { value: "off", label: t("quiz.hints.off") }], s.hints === false ? "off" : "on", (v) => set("hints", v === "on")),
         h("p", { class: "hint" }, t("quiz.hints.desc"))]
      : null,
    h("p", { class: "hint", "aria-live": "polite" }, tp("quiz.pool.size", size), best ? ` · ${t("quiz.best", { score: best.score, total: best.total })}` : ""),
    h("button", { class: "button start", type: "submit", disabled: size < 4 }, t("quiz.start"))));
}

// ---------------- start ----------------
function start(onlyIsos) {
  const s = { ...state.settings, style: effectiveStyle(state.settings) };
  let pool = poolOf(s);
  if (onlyIsos) pool = allCountries().filter((c) => onlyIsos.includes(c.iso3));
  const questions = makeQuestions(pool, onlyIsos ? onlyIsos.length : s.count);
  const universe = allCountries().filter((c) => (s.mode === "locate" ? c.hasShape : true));
  const valueOf = s.mode === "country-capital" ? (c) => capitalsOf(c).join(" · ") : (c) => nameOf(c);
  const capUniverse = allCountries().filter((c) => !c.noCapital && c.capitals.length);
  for (const q of questions) {
    const c = countryByIso(q.iso);
    if (s.mode === "name-flag") q.options = buildOptions(c, allCountries(), (x) => x.iso3);
    else if (s.style === "choice" && s.mode !== "locate") q.options = buildOptions(c, s.mode === "flag-name" ? allCountries() : capUniverse, valueOf);
  }
  state.run = { ...s };
  state.quiz = { questions, index: 0, score: 0, streak: 0, bestStreak: 0, startedAt: Date.now(), endedAt: 0, pending: null, practice: !!onlyIsos };
  state.phase = "playing";
  render();
  announce(t("quiz.started"));
}

// ---------------- playing ----------------
const cur = () => state.quiz.questions[state.quiz.index];
const askedName = (q, mode) => nameOf(countryByIso(q.iso));
const expectedText = (q, mode) => {
  const c = countryByIso(q.iso);
  return mode === "country-capital" ? capitalsOf(c).join(" · ") : nameOf(c);
};

function renderPlay() {
  const qz = state.quiz, run = state.run, q = cur(), c = countryByIso(q.iso);
  const total = qz.questions.length;
  const bar = h("div", { class: "qbar" },
    h("div", { class: "progress" }, h("span", { class: "progress-text" }, t("quiz.progress", { n: qz.index + 1, total })),
      h("span", { class: "progress-track", "aria-hidden": "true" }, h("span", { class: "progress-fill", style: `width:${(qz.index / total) * 100}%` }))),
    h("span", { class: "score", "aria-live": "off" }, svgIcon('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', 18), h("b", {}, qz.score)),
    h("span", { class: "streak", title: t("quiz.streak") }, "×", qz.streak),
    h("span", { class: "elapsed", "data-elapsed": true }, "0:00"),
    run.mode === "locate" ? h("button", { class: "button button-ghost small hints-btn", type: "button", "aria-pressed": String(run.hints !== false), title: t("quiz.hints"), "aria-label": t("quiz.hints"),
      onclick: (e) => { run.hints = run.hints === false; e.currentTarget.setAttribute("aria-pressed", String(run.hints !== false)); map?.setTooltip(run.hints !== false); } },
      svgIcon('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', 18)) : null,
    h("button", { class: "button button-ghost small answered-btn", type: "button", "aria-label": t("quiz.answered.title"), title: t("quiz.answered.title"), onclick: () => $("[data-answered-dialog]").showModal() }, svgIcon('<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>', 18), h("span", { "data-answered-count": true }, qz.index + (q.answered ? 1 : 0))),
    h("button", { class: "button button-quiet small quit-btn", type: "button", "aria-label": t("quiz.quit"), title: t("quiz.quit"), onclick: quit }, svgIcon(CROSS, 18)));

  const prompt = h("div", { class: "qcard" });
  const answer = h("div", { class: "qanswer" });
  const feedback = h("div", { class: "qfeedback", role: "status", "aria-live": "polite", "data-feedback": true });
  const answered = h("aside", { class: "answered", "aria-label": t("quiz.answered.title") }, h("h2", {}, t("quiz.answered.title")), h("ol", { "data-answered": true }));
  const dialog = h("dialog", { class: "answered-dialog", "data-answered-dialog": true, "aria-label": t("quiz.answered.title") },
    h("h2", {}, t("quiz.answered.title")), h("ol", { "data-answered": true }), h("form", { method: "dialog" }, h("button", { class: "button" }, t("quiz.close"))));

  root().replaceChildren(h("section", { class: `quiz-play mode-${run.mode}` }, bar, prompt, answer, feedback, answered), dialog);
  buildPrompt(prompt, q, c);
  if (run.mode === "locate") buildLocate(answer, q); else if (run.style === "typed") buildTyped(answer, q); else buildChoices(answer, q);
  renderAnswered();
  showFeedback();
  const tick = () => { const el = $("[data-elapsed]"); if (el) el.textContent = formatTime(Date.now() - qz.startedAt); };
  tick(); timer = setInterval(tick, 1000);
}

function buildPrompt(box, q, c) {
  const mode = state.run.mode;
  box.replaceChildren();
  if (mode === "locate") box.append(h("p", { class: "qprompt" }, t("quiz.q.locate.pre"), " ", h("strong", {}, nameOf(c)), " ", t("quiz.q.locate.post")));
  else if (mode === "flag-name") box.append(h("img", { class: "qflag", src: flagUrl(c), alt: t("quiz.q.flag.alt"), decoding: "async" }), h("p", { class: "qprompt" }, t("quiz.q.flag-name")));
  else if (mode === "name-flag") box.append(h("p", { class: "qprompt" }, t("quiz.q.name-flag.pre"), " ", h("strong", {}, nameOf(c)), t("quiz.q.name-flag.post")));
  else if (mode === "capital-country") box.append(h("p", { class: "qprompt" }, h("strong", {}, capitalsOf(c)[0]), " ", t("quiz.q.capital-country")));
  else box.append(h("p", { class: "qprompt" }, t("quiz.q.country-capital.pre"), " ", h("strong", {}, nameOf(c)), t("quiz.q.country-capital.post")));
}

// ----- choice mode -----
function buildChoices(box, q) {
  const mode = state.run.mode;
  const flags = mode === "name-flag";
  const list = h("div", { class: `choices${flags ? " choices-flags" : ""}`, role: "group", "aria-label": t("quiz.choices") });
  q.options.forEach((iso, i) => {
    const c = countryByIso(iso);
    const label = mode === "country-capital" ? capitalsOf(c).join(" · ") : nameOf(c);
    const b = h("button", { type: "button", class: "option", dataset: { key: iso }, disabled: q.answered,
      "aria-label": flags ? t("quiz.flag.option", { n: i + 1 }) : null, onclick: () => answer(iso, label) },
      h("span", { class: "option-key", "aria-hidden": "true" }, i + 1),
      flags ? h("img", { src: flagUrl(c), alt: "", decoding: "async" }) : h("span", { class: "option-label" }, label),
      h("span", { class: "option-mark" }));
    list.append(b);
  });
  box.append(list);
  if (q.answered) markChoices(list, q);
  box.onkeydown = null;
  document.onkeydown = (e) => {
    if (enterNext(e)) { $("[data-next]")?.click(); return; }
    if (cur().answered || e.target.closest("input,select,textarea")) return;
    const n = Number(e.key);
    if (n >= 1 && n <= q.options.length) list.children[n - 1].click();
  };
  if (!q.answered && document.activeElement === document.body) { /* keep focus order natural */ }
}
function markChoices(list, q) {
  for (const b of list.children) {
    b.disabled = true;
    const mark = $(".option-mark", b); mark.replaceChildren();
    if (b.dataset.key === q.iso) { b.classList.add("is-correct"); mark.append(svgIcon(CHECK), h("span", { class: "visually-hidden" }, t("quiz.correct.word"))); }
    else if (b.dataset.key === q.givenKey) { b.classList.add("is-wrong"); mark.append(svgIcon(CROSS), h("span", { class: "visually-hidden" }, t("quiz.wrong.word"))); }
  }
}

// ----- typed mode -----
function buildTyped(box, q) {
  const mode = state.run.mode;
  const byName = mode !== "country-capital";
  const input = h("input", { type: "text", id: "typed", class: "typed-input", disabled: q.answered, value: q.answered ? q.given || "" : "", "aria-label": t(byName ? "quiz.typed.name" : "quiz.typed.capital"), placeholder: t(byName ? "quiz.typed.name" : "quiz.typed.capital"), enterkeyhint: "go" });
  const list = h("ul", { class: "suggestions", hidden: true, "aria-label": t("search.suggestions") });
  const submit = () => {
    const text = input.value.trim(); if (!text || cur().answered) return;
    const c = countryByIso(q.iso);
    const accepted = byName ? [nameOf(c), ...aliasesOf(c)] : capitalsOf(c);
    answer(typedMatches(text, accepted) ? q.iso : "typed:" + text, text, typedMatches(text, accepted));
  };
  if (byName) createCombobox(input, list, {
    getItems: (v) => searchCountries(v, 6).map((x) => ({ key: x.iso3, label: nameOf(x), sub: continentName(x.continent) })),
    onChoose: (it) => { input.value = it.label; submit(); }, onSubmit: submit,
  });
  else input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
  box.append(h("div", { class: "typed" }, h("div", { class: "search-field" }, input, list),
    h("button", { class: "button", type: "button", disabled: q.answered, onclick: submit }, t("quiz.submit"))));
  if (!q.answered) setTimeout(() => input.focus({ preventScroll: true }), 50);
  document.onkeydown = (e) => { if (enterNext(e)) $("[data-next]")?.click(); };
}

// ----- locate mode -----
function buildLocate(box, q) {
  const qz = state.quiz;
  box.classList.add("is-map");
  const mapEl = h("div", {});
  box.append(mapEl);
  map = createMapView(mapEl, { shapes: allShapes(), countries: allCountries(), tooltip: state.run.hints !== false, label: (iso) => nameOf(countryByIso(iso)),
    onSelect: (iso, type) => { if (cur().answered) return; if (type === "mouse") answer(iso, nameOf(countryByIso(iso))); else setPending(iso); } });
  mapEl.setAttribute("aria-label", t("map.aria"));
  const region = state.run.region;
  map.fitBounds(region === "World" ? [0, 0, 960, 480] : continentBounds(region), { animate: false, pad: region === "World" ? 0 : 0.08 });
  // keyboard / screen reader alternative: choose the country from a list
  const input = h("input", { type: "text", "aria-label": t("quiz.locate.pick"), placeholder: t("quiz.locate.pick"), disabled: q.answered });
  const list = h("ul", { class: "suggestions suggestions-up", hidden: true });
  createCombobox(input, list, { getItems: (v) => searchCountries(v, 6).map((x) => ({ key: x.iso3, label: nameOf(x), sub: continentName(x.continent) })),
    onChoose: (it) => { input.value = ""; answer(it.key, it.label); } });
  box.append(h("details", { class: "alt-answer" }, h("summary", {}, t("quiz.locate.alt")), h("div", { class: "search-field" }, input, list)));
  if (q.answered) paintLocateResult(q);
  else if (qz.pending) map.setMark(qz.pending, "pending");
  document.onkeydown = (e) => { if (enterNext(e)) $("[data-next]")?.click(); else if (e.key === "Enter" && qz.pending && !cur().answered && !e.target.closest("button,input,select,textarea,summary")) $("[data-next]")?.click(); };
}
function setPending(iso) {
  state.quiz.pending = iso;
  map.setMark(iso, "pending");
  showFeedback();
}
function paintLocateResult(q) {
  map.clearMarks();
  if (!q.correct && q.givenKey && !q.givenKey.startsWith("typed:")) map.setMark(q.givenKey, "wrong");
  map.setMark(q.iso, "correct");
  if (!q.correct) map.fitCountry(q.iso, { animate: true });
}

// ----- answering -----
function answer(key, givenText, correctOverride) {
  const qz = state.quiz, q = cur();
  if (q.answered) return;
  q.answered = true; q.givenKey = key; q.given = givenText; answeredAt = Date.now();
  q.correct = correctOverride ?? key === q.iso;
  qz.pending = null;
  if (q.correct) { qz.score++; qz.streak++; qz.bestStreak = Math.max(qz.bestStreak, qz.streak); } else qz.streak = 0;
  if (state.run.mode === "locate") paintLocateResult(q);
  const list = $(".choices"); if (list) markChoices(list, q);
  $$disable();
  $(".score b").textContent = qz.score;
  $(".streak").textContent = `×${qz.streak}`;
  $("[data-answered-count]").textContent = qz.index + 1;
  renderAnswered(); showFeedback();
  announce(q.correct ? t("quiz.correct") : t("quiz.wrong.said", { answer: expectedText(q, state.run.mode) }));
  setTimeout(() => $("[data-next]")?.focus({ preventScroll: true }), 60);
}
function $$disable() { document.querySelectorAll(".typed input, .typed button, .alt-answer input").forEach((el) => { el.disabled = true; }); }

function showFeedback() {
  const qz = state.quiz, q = cur(), c = countryByIso(q.iso), box = $("[data-feedback]");
  const last = qz.index === qz.questions.length - 1;
  if (!q.answered) {
    if (state.run.mode === "locate") {
      const p = qz.pending;
      box.className = "qfeedback is-pending";
      box.replaceChildren(h("p", { class: "fb-text" }, p ? t("quiz.locate.selected", { name: nameOf(countryByIso(p)) }) : t("quiz.locate.hint")),
        h("button", { class: "button", type: "button", disabled: !p, "data-next": true, onclick: () => p && answer(p, nameOf(countryByIso(p))) }, t("quiz.confirm")));
    } else { box.className = "qfeedback is-empty"; box.replaceChildren(); }
    return;
  }
  const caps = capitalsOf(c);
  box.className = `qfeedback ${q.correct ? "is-correct" : "is-wrong"}`;
  box.replaceChildren(
    h("div", { class: "fb-main" },
      svgIcon(q.correct ? CHECK : CROSS, 26),
      h("div", { class: "fb-body" },
        h("p", { class: "fb-text" }, h("strong", {}, q.correct ? t("quiz.correct") : t("quiz.wrong")), q.correct ? "" : ` ${t("quiz.answer.was", { answer: expectedText(q, state.run.mode) })}`),
        h("p", { class: "fb-learn" }, h("img", { src: flagUrl(c), alt: "", width: 28, height: 21 }), ` ${nameOf(c)}`, caps.length ? ` · ${t("country.capital")}: ${caps.join(" · ")}` : ""))),
    h("button", { class: "button", type: "button", "data-next": true, onclick: next }, last ? t("quiz.results.see") : t("quiz.next")));
}

function next() {
  const qz = state.quiz;
  if (qz.index >= qz.questions.length - 1) return finish();
  qz.index++; qz.pending = null;
  render();
  const first = $(".option, .typed-input");
  if (first) first.focus({ preventScroll: true });
}
function quit() { if (confirm(t("quiz.quit.confirm"))) { state.phase = "settings"; state.quiz = null; document.onkeydown = null; render(); } }

function renderAnswered() {
  const qz = state.quiz, mode = state.run.mode;
  const items = qz.questions.slice(0, qz.index + (cur().answered ? 1 : 0)).filter((q) => q.answered).map((q) => {
    const c = countryByIso(q.iso);
    return h("li", { class: q.correct ? "ok" : "bad" },
      svgIcon(q.correct ? CHECK : CROSS, 16), h("img", { src: flagUrl(c), alt: "", width: 24, height: 18, loading: "lazy" }),
      h("span", {}, h("strong", {}, mode === "country-capital" ? `${nameOf(c)} → ${expectedText(q, mode)}` : nameOf(c)),
        q.correct ? "" : h("em", {}, ` · ${t("quiz.you.said", { answer: q.given ?? "?" })}`)));
  });
  document.querySelectorAll("[data-answered]").forEach((ol) => ol.replaceChildren(...items.map((i) => i.cloneNode(true))));
  document.querySelectorAll("[data-answered]").forEach((ol) => { if (!items.length) ol.replaceChildren(h("li", { class: "empty" }, t("quiz.answered.empty"))); ol.scrollTop = ol.scrollHeight; });
}

// ---------------- results ----------------
function finish() {
  const qz = state.quiz, run = state.run;
  qz.endedAt = Date.now();
  const total = qz.questions.length;
  const stats = store.get(KEYS.stats, {}) || {};
  const key = bestKey(run.mode, run.region);
  qz.newBest = !qz.practice && isBetter(qz.score, total, stats[key]);
  if (qz.newBest) { stats[key] = { score: qz.score, total, date: new Date().toISOString().slice(0, 10) }; store.set(KEYS.stats, stats); }
  qz.best = stats[key];
  state.phase = "results"; document.onkeydown = null;
  render();
  announce(t("quiz.results.announce", { score: qz.score, total }));
  $("[data-results-title]")?.focus();
}

function renderResults() {
  const qz = state.quiz, run = state.run, total = qz.questions.length;
  const pct = Math.round((qz.score / total) * 100);
  const missed = qz.questions.filter((q) => !q.correct);
  const stat = (label, value) => h("div", { class: "stat" }, h("dt", {}, label), h("dd", {}, value));
  root().replaceChildren(h("section", { class: "results card" },
    h("h2", { tabindex: "-1", "data-results-title": true }, t("quiz.results.title")),
    h("p", { class: "big-score" }, h("strong", {}, qz.score), ` / ${total}`, h("span", { class: "pct" }, ` ${pct}%`)),
    qz.newBest ? h("p", { class: "badge" }, t("quiz.newbest")) : null,
    h("dl", { class: "stats" }, stat(t("quiz.mode"), t(`mode.${run.mode}`)), stat(t("quiz.region"), regionLabel(run.region)), stat(t("quiz.time"), formatTime(qz.endedAt - qz.startedAt)), stat(t("quiz.streak.best"), qz.bestStreak),
      qz.best ? stat(t("quiz.best.label"), `${qz.best.score}/${qz.best.total}`) : null),
    missed.length ? h("div", {}, h("h3", {}, t("quiz.missed.title"), ` (${missed.length})`),
      h("ul", { class: "missed" }, missed.map((q) => { const c = countryByIso(q.iso); return h("li", {}, h("img", { src: flagUrl(c), alt: "", width: 28, height: 21, loading: "lazy" }),
        h("span", {}, h("strong", {}, run.mode === "country-capital" ? `${nameOf(c)} → ${expectedText(q, run.mode)}` : nameOf(c)), h("em", {}, ` · ${t("quiz.you.said", { answer: q.given ?? "?" })}`))); })))
      : h("p", { class: "perfect" }, t("quiz.perfect")),
    h("div", { class: "actions" },
      missed.length ? h("button", { class: "button", type: "button", onclick: () => start(missed.map((q) => q.iso)) }, t("quiz.practice")) : null,
      h("button", { class: missed.length ? "button button-ghost" : "button", type: "button", onclick: () => { state.settings.count = Math.max(state.settings.count, 5); start(); } }, t("quiz.again")),
      h("button", { class: "button button-quiet", type: "button", onclick: () => { state.phase = "settings"; render(); } }, t("quiz.change")))));
}

boot();
