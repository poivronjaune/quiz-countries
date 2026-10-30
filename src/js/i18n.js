// Locale files live in /locales/<lang>.json. Country names come from countries.json.
import { store, KEYS } from "./util.js";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];
const dicts = {};
let lang = "en";

async function load(code) {
  if (dicts[code]) return dicts[code];
  const res = await fetch(`./locales/${code}.json`);
  if (!res.ok) throw new Error(`locale ${code}`);
  dicts[code] = await res.json();
  return dicts[code];
}

export function detectLanguage() {
  const saved = store.get(KEYS.language);
  if (LANGUAGES.some((l) => l.code === saved)) return saved;
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  return LANGUAGES.some((l) => l.code === nav) ? nav : "en";
}

export async function initI18n() {
  lang = detectLanguage();
  await load("en");
  if (lang !== "en") await load(lang);
  document.documentElement.lang = lang;
  applyStatic();
}

export const getLang = () => lang;

export async function setLanguage(code) {
  if (!LANGUAGES.some((l) => l.code === code) || code === lang) return;
  await load(code);
  lang = code;
  store.set(KEYS.language, code);
  document.documentElement.lang = code;
  applyStatic();
  window.dispatchEvent(new CustomEvent("atlas:language", { detail: { lang } }));
}

/** Translate: t(key, {name: "x"}) replaces {name}. */
export function t(key, params) {
  let s = dicts[lang]?.[key] ?? dicts.en?.[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Plural-aware: looks up key.one / key.other (Intl.PluralRules). */
export function tp(key, n, params = {}) {
  const rule = new Intl.PluralRules(lang).select(n);
  const k = dicts[lang]?.[`${key}.${rule}`] || dicts.en?.[`${key}.${rule}`] ? `${key}.${rule}` : `${key}.other`;
  return t(k, { n: fmt(n), ...params });
}

export const fmt = (n) => new Intl.NumberFormat(lang).format(n);
export const collator = () => new Intl.Collator(lang, { sensitivity: "base" });

/** Fill data-i18n, data-i18n-aria-label, data-i18n-placeholder, data-i18n-title. */
export function applyStatic(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  for (const attr of ["aria-label", "placeholder", "title"]) {
    root.querySelectorAll(`[data-i18n-${attr}]`).forEach((el) => el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`))));
  }
  const titleKey = document.body?.dataset.titleKey;
  if (titleKey) document.title = `ATLAS | ${t(titleKey)}`;
}
