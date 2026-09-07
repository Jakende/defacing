const CACHE = 'deface-v9';
const ASSETS = ['./','./index.html','./app.js','./speech-worker.js','./style.css','./design-tokens.css','./components.css','./manifest.webmanifest','./favicon.svg','./favicon.ico','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-512-maskable.png','./face-decoder.js','./face-worker.js','./models/yunet.onnx','./ort/ort.min.js','./ort/ort-wasm-simd.wasm','./ort/ort-wasm.wasm'];
const OPTIONAL = ['./vendor/deepfilter/pkg/df_bg.wasm','./vendor/deepfilter/models/DeepFilterNet3_onnx.tar.gz'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('deface-')&&key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  const matches=paths=>paths.some(path=>new URL(path,self.registration.scope).href===url.href);
  if(request.method!=='GET'||url.origin!==self.location.origin||(!matches(ASSETS)&&!matches(OPTIONAL)))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    if(matches(OPTIONAL)){const cached=await cache.match(request);if(cached)return cached;}
    try{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}
    catch{return await cache.match(request)||Response.error();}
  }));
});
