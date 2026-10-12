// Offline support: precache the shell and data, cache flags on first view.
const VERSION = "atlas-v2-1";
const SHELL = ["./", "./index.html", "./quiz.html", "./css/base.css", "./css/explore.css", "./css/quiz.css", "./css/map.css",
  "./js/util.js", "./js/i18n.js", "./js/data.js", "./js/map-math.js", "./js/map-view.js", "./js/combobox.js", "./js/shell.js",
  "./js/explore.js", "./js/quiz.js", "./js/quiz-logic.js", "./locales/en.json", "./locales/fr.json",
  "./data/countries.json", "./data/shapes.json", "./img/logo.svg", "./manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
    return res;
  })));
});
