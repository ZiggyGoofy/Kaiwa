// Service worker : met l'app (Kaiwa + SpeedHangul) en cache pour qu'elle s'ouvre vite et soit installable.
// Les appels à l'API Claude ne sont jamais mis en cache.
const CACHE = "kaiwa-v28";
const FILES = ["./", "index.html", "style.css", "i18n.js", "app.js", "content.js", "content-en.js", "kanji.js", "mnemo.js", "learn.js", "bruteforce.js", "speed.js", "appchoice.js", "manifest.json", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/hangul.svg",
  // SpeedHangul (dossier hangul/)
  "hangul/", "hangul/index.html", "hangul/style.css", "hangul/i18n.js", "hangul/app.js", "hangul/content.js", "hangul/mnemo.js",
  "hangul/learn.js", "hangul/bruteforce.js", "hangul/speed.js"];

self.addEventListener("install", (e) => {
  // { cache: "reload" } : on ignore le cache du navigateur pour être sûr d'avoir la dernière version
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
// { cache: "no-cache" } force le navigateur à vérifier auprès de GitHub que le fichier n'a pas changé.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request))
  );
});
