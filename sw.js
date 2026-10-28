const CACHE_NAME = 'vaultnote-v78';
const ASSETS = [
  './',
  './index.html',
  './src/styles.css',
  './src/crypto.js',
  './src/storage.js',
  './src/app.js',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  // 새 파일 다운로드만 완료하고, 사용자가 [지금 적용] 버튼을 누를 때까지 대기(waiting)
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 외부 API(구글 드라이브, 원드라이브, Gemini API 등) 및 로컬 동기화 API는 캐시 우회
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) {
    return;
  }

  // Stale-While-Revalidate (오프라인 우선 캐시 서빙 + 백그라운드 최신본 갱신)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 네트워크 실패(오프라인): 화면 이동 요청이면 캐시된 index.html 반환
          if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html') || caches.match('./');
          }
          return cachedResponse;
        });

      // 캐시가 있으면 즉시 반환(0.001초 응답), 없으면 네트워크 결과 대기
      return cachedResponse || fetchPromise;
    })
  );
});
