const CACHE = "app-cache-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL])).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const req = event.request;

  // Navegação (HTML): tenta rede, se falhar cai no offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Outros assets: rede primeiro e fallback pra cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
