// Офлайн-режим приложения. При изменении иконок или манифеста меняйте версию CACHE.
const CACHE = 'finance-v20';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

// cache: 'reload' — берём свежие файлы с сайта, а не старые из памяти телефона (GitHub держит их до 10 минут)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'}))))
      .then(() => self.skipWaiting())
  );
});

// На этом же адресе живут другие приложения Андрея — удаляем только свои старые версии, чужие кэши не трогаем
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('finance-v') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Чужие адреса (курсы валют) и проверка версии идут напрямую в сеть
  if (req.method !== 'GET' || url.origin !== location.origin || url.searchParams.has('check')) return;
  // Сама страница: при интернете — всегда свежая с сайта, без интернета — сохранённая копия
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, {cache: 'no-store'})
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Иконки и манифест: сначала из памяти, иначе из сети
  e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
