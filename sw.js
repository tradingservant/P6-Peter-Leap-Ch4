const CACHE = "p6-peter-leap-ch4-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/content.js",
  "./js/game.js",
  "./manifest.webmanifest",
  "./icons/favicon.svg",
  "./icons/icon-192.png",
  "./assets/vocab/go_on_a_charity_walk.png",
  "./assets/vocab/sell_flags.png",
  "./assets/vocab/charity_cake_sale.png",
  "./assets/vocab/go_on_a_charity_run.png",
  "./assets/vocab/take_part_in_a_charity_show.png",
  "./assets/vocab/visit_the_elderly.png",
  "./assets/vocab/run_a_second_hand_stall.png",
  "./assets/vocab/clean_the_beach.png",
  "./assets/vocab/donate_canned_food.png",
  "./assets/vocab/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
