const RELEASE='26',VERSION='breachline-v'+RELEASE;
const SHELL=['./','./index.html','./style.css','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest','./js/actor-pose.js','./js/ai.js','./js/aim.js','./js/audio.js','./js/boot.js','./js/combat-identity.js','./js/compatibility-renderer.js','./js/decal-system.js','./js/engine.js','./js/environment-probes.js','./js/gamepad.js','./js/geometry.js','./js/graphics-profiler.js','./js/graphics-quality.js','./js/input.js','./js/lighting-field.js','./js/main.js','./js/maps.js','./js/material-detail.js','./js/math.js','./js/meshes.js','./js/modes.js','./js/navigation.js','./js/particles.js','./js/render-budget.js','./js/render-pipeline.js','./js/room-lights.js','./js/save.js','./js/scene-lod.js','./js/shadow-system.js','./js/spawns.js','./js/surface-placement.js','./js/surface-uv.js','./js/textures.js','./js/three-renderer.js','./js/ui.js','./js/weapon-models.js','./js/weapon-surface.js','./js/weapons.js','./js/world-detail.js','./vendor/three.module.min.js','./vendor/three.core.min.js','./assets/foliage-atlas.webp','./assets/horizon.webp','./assets/surfaces-atlas.webp','./assets/weapon-finishes.webp'];
const scope=new URL(self.registration.scope),paths=new Set(SHELL.map(p=>new URL(p,scope).pathname));
self.addEventListener('message',event=>{if(event.data?.type==='VERSION')event.ports?.[0]?.postMessage({release:RELEASE});});
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(VERSION);
 // Four concurrent transfers keep mobile downloads bounded and installation atomic.
 for(let i=0;i<SHELL.length;i+=4)await Promise.all(SHELL.slice(i,i+4).map(async path=>{
  const url=new URL(path,scope),response=await fetch(url,{cache:'reload',credentials:'same-origin'});
  if(!response.ok||response.redirected||new URL(response.url).origin!==self.location.origin)throw new Error('Game shell unavailable');
  await cache.put(url,response);
 }));
 await self.skipWaiting();
})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('breachline-')&&name!==VERSION)await caches.delete(name);
 await self.clients.claim();
})());});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(async()=>await (await caches.open(VERSION)).match(new URL('./index.html',scope))||Response.error()));return;}
 // Other releases must never receive this release's cached modules.
 if(url.searchParams.has('v')&&url.searchParams.get('v')!==RELEASE)return;
 if(paths.has(url.pathname))event.respondWith(caches.open(VERSION).then(cache=>cache.match(event.request,{ignoreSearch:true})).then(cached=>cached||fetch(event.request)));
});
