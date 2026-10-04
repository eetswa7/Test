// Separate from career/settings storage. CryptoKeys are never exported.
export class BenchmarkStore {
 constructor(indexedDB=globalThis.indexedDB){this.indexedDB=indexedDB;this.memory=new Map();this.persistent=false;this.error=null;}
 async open(){
  if(this.opening)return this.opening;
  this.opening=new Promise(resolve=>{try{const request=this.indexedDB.open('breachline-benchmarks',1);request.onupgradeneeded=()=>request.result.createObjectStore('items',{keyPath:'key'});request.onsuccess=()=>{this.db=request.result;this.persistent=true;this.db.onversionchange=()=>this.db.close();resolve(this);};request.onerror=()=>{this.error=request.error;resolve(this);};request.onblocked=()=>{this.error=new Error('Benchmark storage blocked');resolve(this);};}catch(e){this.error=e;resolve(this);}});return this.opening;
 }
 async operation(mode,run){await this.open();if(!this.db)return null;return new Promise((resolve,reject)=>{try{const tx=this.db.transaction('items',mode),request=run(tx.objectStore('items'));let result;request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error??new Error('Benchmark storage failed'));}catch(e){reject(e);}});}
 async get(key){const value=await this.operation('readonly',s=>s.get(key));return value?.value??this.memory.get(key)??null;}
 async put(key,value){this.memory.set(key,value);try{if(this.db||await this.open().then(()=>this.db))await this.operation('readwrite',s=>s.put({key,value}));else throw this.error??new Error('Storage unavailable');}catch(e){this.error=e;this.persistent=false;throw e;}}
 async remove(key){this.memory.delete(key);await this.operation('readwrite',s=>s.delete(key));}
 async list(prefix){const rows=await this.operation('readonly',s=>s.getAll());const items=new Map((rows??[]).map(r=>[r.key,r.value]));for(const [k,v]of this.memory)items.set(k,v);return [...items].filter(([k])=>k.startsWith(prefix)).map(([key,value])=>({key,value}));}
}
