const CACHE_NAME='abuad-attendance-v1';
const SHELL=['/','/index.html','/css/style.css','/js/db.js','/js/liveness.js','/js/face-engine.js','/js/api.js','/js/app.js','/pages/login.html','/pages/dashboard.html','/pages/enrol.html','/pages/mark-attendance.html','/pages/sessions.html','/pages/courses.html','/pages/students.html','/pages/reports.html'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.pathname.startsWith('/api/')){
    e.respondWith(fetch(e.request).catch(()=>new Response(JSON.stringify({error:'Offline'}),{headers:{'Content-Type':'application/json'},status:503})));
    return;
  }
  if(url.hostname.includes('jsdelivr')){
    e.respondWith(caches.match(e.request).then(c=>{
      if(c)return c;
      return fetch(e.request).then(r=>{caches.open(CACHE_NAME).then(cache=>cache.put(e.request,r.clone()));return r;});
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then(c=>{
    if(c)return c;
    return fetch(e.request).then(r=>{
      if(r&&r.status===200){caches.open(CACHE_NAME).then(cache=>cache.put(e.request,r.clone()));}
      return r;
    }).catch(()=>caches.match('/index.html'));
  }));
});

self.addEventListener('sync',e=>{
  if(e.tag==='attendance-sync')e.waitUntil(syncRecords());
});

async function syncRecords(){
  const db=await openDB();
  const records=await getUnsynced(db);
  if(!records.length)return;
  const jwt=await getMeta(db,'jwt');
  if(!jwt)return;
  try{
    const res=await fetch('/api/attendance/sync',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+jwt},body:JSON.stringify(records)});
    if(res.ok){
      const result=await res.json();
      const ids=records.slice(0,result.synced).map(r=>r.localId);
      await markSynced(db,ids);
      const clients=await self.clients.matchAll();
      clients.forEach(c=>c.postMessage({type:'SYNC_COMPLETE',synced:result.synced}));
    }
  }catch(e){console.log('[SW] sync failed:',e.message);}
}

function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open('AttendanceDB',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains('attendanceRecords')){const s=db.createObjectStore('attendanceRecords',{keyPath:'localId',autoIncrement:true});s.createIndex('by_synced','synced',{unique:false});}if(!db.objectStoreNames.contains('embeddings'))db.createObjectStore('embeddings',{keyPath:'studentId'});if(!db.objectStoreNames.contains('tokens'))db.createObjectStore('tokens',{keyPath:'tokenUuid'});if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'});};})}
function getUnsynced(db){return new Promise((res,rej)=>{const tx=db.transaction('attendanceRecords','readonly');const idx=tx.objectStore('attendanceRecords').index('by_synced');const r=idx.getAll(IDBKeyRange.only(false));r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);})}
function markSynced(db,ids){return new Promise((res,rej)=>{const tx=db.transaction('attendanceRecords','readwrite');const store=tx.objectStore('attendanceRecords');ids.forEach(id=>{const r=store.get(id);r.onsuccess=()=>{if(r.result){r.result.synced=true;store.put(r.result);}};});tx.oncomplete=res;tx.onerror=()=>rej(tx.error);})}
function getMeta(db,key){return new Promise(res=>{const tx=db.transaction('meta','readonly');const r=tx.objectStore('meta').get(key);r.onsuccess=()=>res(r.result?.value||null);r.onerror=()=>res(null);})}
