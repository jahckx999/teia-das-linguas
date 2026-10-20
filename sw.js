/* Service worker: site funciona offline depois de baixar o pacote do idioma */
const CACHE = "tdl-v1";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const resp = await fetch(req);
      if (resp.ok && /\/en\/verbos\//.test(req.url)) (await caches.open(CACHE)).put(req, resp.clone());
      return resp;
    } catch (err) {
      const achado = await caches.match(req, { ignoreSearch: true });
      if (achado) return achado;
      return new Response("<h1>Sem conexão</h1><p>Baixe o pacote do idioma na página Idiomas para estudar offline.</p>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
  })());
});
