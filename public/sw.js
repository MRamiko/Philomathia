const CACHE='phi-shell-v4';
const ASSETS='phi-assets-v4';
const SHELL=['/offline.html','/palette.css','/manifest.webmanifest','/icons/phi-192.png','/icons/phi-512.png','/icons/phi-maskable.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('phi-')&&k!==CACHE&&k!==ASSETS).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 // Never cache HTML carrying a session, RPC, auth, APIs, search results or user data.
 if(event.request.mode==='navigate'){event.respondWith((async()=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3000);try{return await fetch(event.request,{signal:controller.signal});}catch{return (await caches.match('/offline.html'))||Response.error();}finally{clearTimeout(timer);}})());return;}
 // Only generated, content-hashed application scripts/styles enter this cache.
 if(/^\/assets\/[\w.-]+-[\w-]{8,}\.(js|css)$/.test(url.pathname)){event.respondWith(caches.open(ASSETS).then(async cache=>{const hit=await cache.match(event.request);if(hit)return hit;const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}));return;}
 if(!SHELL.includes(url.pathname))return;
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
