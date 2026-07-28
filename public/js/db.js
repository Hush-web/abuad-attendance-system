const DB_NAME='AttendanceDB',DB_VERSION=1;
let _db=null;
function openDB(){
  if(_db)return Promise.resolve(_db);
  return new Promise((res,rej)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains('attendanceRecords')){const s=db.createObjectStore('attendanceRecords',{keyPath:'localId',autoIncrement:true});s.createIndex('by_synced','synced',{unique:false});s.createIndex('by_student','studentId',{unique:false});}
      if(!db.objectStoreNames.contains('embeddings'))db.createObjectStore('embeddings',{keyPath:'studentId'});
      if(!db.objectStoreNames.contains('tokens')){const t=db.createObjectStore('tokens',{keyPath:'tokenUuid'});t.createIndex('by_session','sessionId',{unique:false});}
      if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'});
    };
    r.onsuccess=()=>{_db=r.result;res(_db);};
    r.onerror=()=>rej(r.error);
  });
}
async function setMeta(key,value){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('meta','readwrite');const r=tx.objectStore('meta').put({key,value});r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});}
async function getMeta(key){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('meta','readonly');const r=tx.objectStore('meta').get(key);r.onsuccess=()=>res(r.result?.value??null);r.onerror=()=>rej(r.error);});}
async function saveEmbedding(studentId,descriptor){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('embeddings','readwrite');const r=tx.objectStore('embeddings').put({studentId,descriptor:Array.from(descriptor),savedAt:new Date().toISOString()});r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});}
async function getEmbedding(studentId){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('embeddings','readonly');const r=tx.objectStore('embeddings').get(studentId);r.onsuccess=()=>{if(!r.result)return res(null);res(new Float32Array(r.result.descriptor));};r.onerror=()=>rej(r.error);});}
async function hasEmbedding(studentId){return(await getEmbedding(studentId))!==null;}
async function saveAttendanceRecord(rec){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('attendanceRecords','readwrite');const r=tx.objectStore('attendanceRecords').add({...rec,markedAt:rec.markedAt||new Date().toISOString(),synced:false});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function getUnsyncedRecords(){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('attendanceRecords','readonly');const r=tx.objectStore('attendanceRecords').index('by_synced').getAll(IDBKeyRange.only(false));r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});}
async function getStudentRecords(studentId){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('attendanceRecords','readonly');const r=tx.objectStore('attendanceRecords').index('by_student').getAll(IDBKeyRange.only(studentId));r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});}
async function markRecordsSynced(ids){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('attendanceRecords','readwrite');const store=tx.objectStore('attendanceRecords');ids.forEach(id=>{const r=store.get(id);r.onsuccess=()=>{if(r.result){r.result.synced=true;store.put(r.result);}};});tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
async function saveTokens(tokens){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('tokens','readwrite');const store=tx.objectStore('tokens');tokens.forEach(t=>store.put({...t,used:false}));tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
async function getToken(uuid){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('tokens','readonly');const r=tx.objectStore('tokens').get(uuid);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error);});}
async function markTokenUsed(uuid){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction('tokens','readwrite');const store=tx.objectStore('tokens');const r=store.get(uuid);r.onsuccess=()=>{if(r.result){r.result.used=true;store.put(r.result);}res();};r.onerror=()=>rej(r.error);});}
async function validateToken(uuid){const token=await getToken(uuid);if(!token)return{valid:false,reason:'Token not found'};if(token.used)return{valid:false,reason:'Token already used'};if(new Date(token.expiresAt)<new Date())return{valid:false,reason:'Token expired'};return{valid:true,token};}
async function requestSync(){if('serviceWorker'in navigator&&'SyncManager'in window){try{const reg=await navigator.serviceWorker.ready;await reg.sync.register('attendance-sync');}catch(e){}}}
window.DB={setMeta,getMeta,saveEmbedding,getEmbedding,hasEmbedding,saveAttendanceRecord,getUnsyncedRecords,getStudentRecords,markRecordsSynced,saveTokens,getToken,markTokenUsed,validateToken,requestSync};
