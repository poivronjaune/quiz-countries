// Page chrome shared by Explore and Quiz: header, profile, language, tab bar, footer.
import { h, store, KEYS, $ } from "./util.js";
import { t, LANGUAGES, getLang, setLanguage, applyStatic } from "./i18n.js";

const icon = (d) => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", "24"); s.setAttribute("height", "24");
  s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2");
  s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
  s.innerHTML = d; return s;
};
const ICON_EXPLORE = '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>';
const ICON_QUIZ = '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>';
const ICON_MENU = '<path d="M4 7h16M4 12h16M4 17h16"/>';
const ICON_CLOSE = '<path d="M6 6l12 12M18 6L6 18"/>';

export function mountShell({ page }) {
  const link = (href, key, current) => h("a", { class: "menu-link", href, "data-i18n": key, "aria-current": current ? "page" : null });

  // ----- profile form -----
  const profile = store.get(KEYS.profile, {}) || {};
  const status = h("p", { class: "profile-status", id: "profile-status", role: "status", "aria-live": "polite" });
  const nameInput = h("input", { id: "profile-name", name: "name", type: "text", maxlength: 60, autocomplete: "name", "data-i18n-placeholder": "profile.name.placeholder", value: profile.name || "" });
  const ageInput = h("input", { id: "profile-age", name: "age", type: "number", min: 1, max: 120, step: 1, inputmode: "numeric", "data-i18n-placeholder": "profile.age.placeholder", value: profile.age || "", "aria-describedby": "profile-status" });
  const form = h("form", { class: "profile-form", novalidate: true, "data-i18n-aria-label": "profile.aria" },
    h("label", { class: "visually-hidden", for: "profile-name", "data-i18n": "profile.name.label" }), nameInput,
    h("label", { class: "visually-hidden", for: "profile-age", "data-i18n": "profile.age.label" }), ageInput,
    h("button", { class: "button", type: "submit", "data-i18n": "profile.save" }),
    h("button", { class: "button button-quiet", type: "button", "data-i18n": "profile.clear", onclick: () => {
      if (!confirm(t("profile.clear.confirm"))) return;
      Object.values(KEYS).forEach((k) => store.remove(k));
      nameInput.value = ""; ageInput.value = "";
      status.textContent = t("profile.cleared");
    } }),
    h("p", { class: "profile-privacy", "data-i18n": "profile.privacy" }), status);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const age = ageInput.value.trim() === "" ? "" : Math.round(Number(ageInput.value));
    if (age !== "" && (!Number.isFinite(age) || age < 1 || age > 120)) { status.textContent = t("profile.age.invalid"); ageInput.focus(); return; }
    store.set(KEYS.profile, { name: nameInput.value.trim().slice(0, 60), age });
    status.textContent = t("profile.saved");
  });

  // ----- language -----
  const select = h("select", { "data-language-selector": true, "aria-label": t("language.label"), "data-i18n-aria-label": "language.label" },
    LANGUAGES.map((l) => h("option", { value: l.code, selected: l.code === getLang() }, l.label)));
  select.addEventListener("change", () => setLanguage(select.value));
  window.addEventListener("atlas:language", () => { select.value = getLang(); });
  const lang = h("label", { class: "language-control" }, h("span", { class: "visually-hidden", "data-i18n": "language.label" }), select);

  // ----- header -----
  const toggle = h("button", { class: "menu-toggle icon-btn", type: "button", "aria-expanded": "false", "aria-controls": "header-tools", "data-i18n-aria-label": "menu.open" });
  toggle.append(icon(ICON_MENU));
  form.querySelector(".profile-privacy").before(lang); // language sits on the same row as name / age
  const tools = h("div", { class: "header-tools", id: "header-tools" }, form,
    h("p", { class: "menu-credit" }, h("span", { "data-i18n": "footer.credit" }), " · ",
      h("a", { href: "https://unstats.un.org/unsd/methodology/m49/overview/", target: "_blank", rel: "noopener noreferrer", "data-i18n": "footer.data" })));
  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", t(open ? "menu.close" : "menu.open"));
    toggle.replaceChildren(icon(open ? ICON_CLOSE : ICON_MENU));
  };
  toggle.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) { setMenu(false); toggle.focus(); } });
  window.addEventListener("atlas:language", () => setMenu(document.body.classList.contains("menu-open")));

  const nav = h("nav", { class: "header-menu", "data-i18n-aria-label": "menu.aria" },
    link("./index.html", "menu.explore", page === "explore"), link("./quiz.html", "menu.quiz", page === "quiz"));
  const header = h("header", { class: "site-header" },
    toggle,
    h("a", { class: "brand", href: "./index.html", "data-i18n-aria-label": "brand.aria" },
      h("img", { class: "brand-logo", src: "./img/logo.svg", alt: "", width: 36, height: 36 }), h("span", { class: "brand-name" }, "ATLAS")),
    h("span", { class: "header-page", "aria-hidden": "true", "data-i18n": page === "explore" ? "menu.explore" : "menu.quiz" }),
    tools, nav);

  // ----- footer + tab bar -----
  const footer = h("footer", { class: "site-footer" },
    h("span", { class: "footer-name" }, "ATLAS"),
    h("span", { class: "footer-credit", "data-i18n": "footer.credit" }),
    h("a", { class: "footer-link", href: "https://unstats.un.org/unsd/methodology/m49/overview/", target: "_blank", rel: "noopener noreferrer", "data-i18n": "footer.data" }));
  const tab = (href, key, ic, current) => {
    const a = h("a", { class: "tab", href, "aria-current": current ? "page" : null }, h("span", { class: "tab-icon" }), h("span", { "data-i18n": key }));
    $(".tab-icon", a).append(icon(ic));
    return a;
  };
  const tabbar = h("nav", { class: "tabbar", "data-i18n-aria-label": "menu.aria" },
    tab("./index.html", "menu.explore", ICON_EXPLORE, page === "explore"), tab("./quiz.html", "menu.quiz", ICON_QUIZ, page === "quiz"));

  const main = $("main");
  document.body.insertBefore(header, main);
  main.after(footer, tabbar);
  document.body.classList.add(`page-${page}`);
  applyStatic();
  setMenu(false);
}

// Offline support (only over https or localhost)
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
