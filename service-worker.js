/**
 * service-worker.js
 * PWA Service Worker — Network-First 策略
 *
 * 策略说明：
 *   - HTML 文档：Network-First（优先网络，确保用户拿到最新版本）
 *   - JS/CSS/图片等静态资源：Network-First（优先网络，避免 SWR 导致刷新两次才生效）
 *   - 第三方 CDN（如 p5.js）：Cache-First（跨域资源，缓存优先，离线兜底）
 *
 * 每次部署后必须升级 CACHE_NAME 版本号，确保旧缓存被清除。
 */

const CACHE_VERSION = 'v39';
const CACHE_NAME = 'pixel-tools-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles/pixel.css',
  './js/app.js',
  './js/i18n.js',
  './js/mouse-trails.js',
  './js/pixel-art.js',
  './js/pixel-music.js',
  './js/pixel-drawing-editor.js',
  './js/expression-parser.js',
  './js/function-plotter.js',
  './js/math-cards.js',
  './js/predictors.js',
  './js/chart.js',
  './js/weights.js',
  './js/nn.js',
  './js/funcfit.js',
  './js/overfit.js',
  './js/offsetfit.js',
  './js/maze-generator.js',
  './js/function-3d.js',
  './js/nn-visualizer.js',
  './js/math-cards-ext.js',
  './js/physics-sandbox.js',
  './js/image-pixelizer.js',
  './js/pixel-clock.js',
  './js/pixel-rpg.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js'
];

// 安装：预缓存关键资源 / Install: precache key resources
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        // 逐个添加，避免一个失败导致全部失败
        return Promise.allSettled(
          PRECACHE_URLS.map(function (url) {
            return cache.add(url).catch(function (err) {
              console.warn('Precache skip:', url, err.message);
            });
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

// 激活：清除旧版本缓存并立即接管 / Activate: clear old caches & claim clients
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.filter(function (cacheName) {
          return cacheName !== CACHE_NAME;
        }).map(function (cacheName) {
          console.log('[SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function () {
      return self.clients.claim();
    }).then(function () {
      // 通知所有客户端刷新页面（确保用户拿到最新版本）
      return self.clients.matchAll({ type: 'window' });
    }).then(function (clients) {
      clients.forEach(function (client) {
        client.postMessage({ type: 'SW_UPDATED' });
      });
    })
  );
});

// fetch 策略：根据资源类型选择不同策略 / fetch strategy by resource type
self.addEventListener('fetch', function (event) {
  const request = event.request;

  // 只处理 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 跨域资源（如 CDN 的 p5.js）：Cache-First
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        if (cached) return cached;
        return fetch(request).then(function (response) {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, clone).catch(function () {});
            });
          }
          return response;
        }).catch(function () {
          throw new Error('Network failed for cross-origin resource');
        });
      })
    );
    return;
  }

  // HTML 文档：Network-First（确保用户总能拿到最新 HTML）
  if (request.mode === 'navigate' ||
      (request.headers.get('accept') || '').indexOf('text/html') >= 0) {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, clone).catch(function () {});
          });
        }
        return response;
      }).catch(function () {
        return caches.match(request).then(function (cached) {
          if (cached) return cached;
          return caches.match('./index.html');
        });
      })
    );
    return;
  }

  // JS/CSS/图片等静态资源：Network-First
  // 优先网络，确保用户每次刷新都能拿到最新版本；离线时回退缓存
  event.respondWith(
    fetch(request).then(function (response) {
      if (response && response.status === 200 && response.type !== 'opaque') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, clone).catch(function () {});
        });
      }
      return response;
    }).catch(function () {
      // 网络失败，回退到缓存
      return caches.match(request).then(function (cached) {
        if (cached) return cached;
        throw new Error('Network failed and no cache');
      });
    })
  );
});
