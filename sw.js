/* =====================================================================
   이터리 서비스 워커 (앱 설치·오프라인 지원)
   - 사이트 화면(index.html, 아이콘)은 저장해 두었다가 인터넷이 끊겨도 열리게 합니다.
   - 화면은 "네트워크 먼저": 새 버전이 올라오면 바로 새 버전을 받습니다.
   - Supabase(선수·기록 데이터)는 저장하지 않고 항상 서버에서 받아옵니다.
   - 사이트를 크게 바꿨을 때는 CACHE 이름의 숫자를 올리면 예전 저장본이 지워집니다.
   ===================================================================== */
const CACHE = 'iteri-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.hostname.endsWith('supabase.co')) return;          // 데이터는 항상 서버에서

  // 이 사이트의 파일: 네트워크 먼저, 실패하면 저장본
  if(url.origin === self.location.origin){
    e.respondWith(
      fetch(req).then(res => {
        if(res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  // 글꼴·아이콘(CDN): 저장본 먼저, 없으면 받아서 저장
  if(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(url.hostname)){
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if(res.ok || res.type === 'opaque'){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
