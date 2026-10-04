import {bytes,base64url,digest,signatureMessage} from './benchmark-crypto.js?v=56';
import {BENCHMARK_CONFIG} from './benchmark-config.js?v=56';

export function endpointURL(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('Use an HTTPS endpoint URL without credentials');return url.origin+url.pathname.replace(/\/$/,'');}
export class BenchmarkUploader {
 constructor(store,notify=()=>{},fetcher=globalThis.fetch?.bind(globalThis)) {this.store=store;this.notify=notify;this.fetcher=fetcher;this.busy=false;this.timer=null;this.playing=()=>false;this.latest=null;}
 async auth(){return this.store.get('auth');}
 async pair(endpoint,code){
  endpoint=endpointURL(endpoint);if(!this.store.persistent)await this.store.open();if(!this.store.persistent)throw new Error('Persistent browser storage is required for pairing');
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']),publicKey=base64url(await crypto.subtle.exportKey('spki',pair.publicKey));
  // Keep a recoverable key before the one-use code is consumed.
  const pending={endpoint,privateKey:pair.privateKey,publicKey};await this.store.put('pairing',pending);
  return this.finishPairing(code,pending);
 }
 async finishPairing(code,pending=null){
  pending??=await this.store.get('pairing');if(!pending)throw new Error('Start pairing again');
  const response=await this.request(pending.endpoint+'/pair',{code,public_key:pending.publicKey});
  const result=await response.json();if(!response.ok||typeof result.credential!=='string')throw new Error(result.error??'Pairing failed');
  const auth={...pending,credential:result.credential};await this.store.put('auth',auth);const check=await this.store.get('auth');if(!check?.privateKey)throw new Error('Safari could not retain the signing key');await this.store.remove('pairing');this.kick();return auth;
 }
 async request(url,body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{return await this.fetcher(url,{method:'POST',mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});}finally{clearTimeout(timer);}}
 async queue(report){
  this.latest=report;const key='report:'+report.session.id,existing=await this.store.get(key);
  if(!existing)await this.store.put(key,{report,state:'pending',attempts:0,next_attempt:0});
  this.kick();
 }
 kick(delay=0){clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush().catch(()=>{}),delay);}
 async flush(){
  if(this.busy)return;if(this.playing()){this.kick(10000);return;}if(globalThis.navigator?.onLine===false){this.kick(30000);return;}
  this.busy=true;let next=Infinity;
  try{
   const rows=await this.store.list('report:'),auth=await this.auth();
   for(const {key,value:item}of rows){if(item.state==='uploaded')continue;if(this.playing()){next=Math.min(next,Date.now()+10000);break;}if(item.next_attempt>Date.now()){next=Math.min(next,item.next_attempt);continue;}
    if(!auth){this.notify('Upload Failed: setup required. Report retained on this device.');break;}
    try{
     const reportJSON=JSON.stringify(item.report),hash=await digest(reportJSON),timestamp=Date.now(),signature=base64url(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},auth.privateKey,bytes(signatureMessage(auth.credential,timestamp,hash))));
     const response=await this.request(auth.endpoint+'/upload',{credential:auth.credential,timestamp,signature,report_json:reportJSON});let result;try{result=await response.json();}catch{throw new Error('Invalid upload response');}
     const id=item.report.session.id,date=item.report.session.started_at,expectedPath=`benchmarks/${date.slice(0,4)}/${date.slice(5,7)}/${id}.json`;
     if(!response.ok||result.session_id!==id||!/^[a-f\d]{40}$/.test(result.commit_sha??'')||result.path!==expectedPath)throw new Error(result.error??`Upload failed (${response.status})`);
     item.state='uploaded';item.receipt={commit_sha:result.commit_sha,path:result.path,duplicate:!!result.duplicate};item.uploaded_at=Date.now();await this.store.put(key,item);this.notify('Upload Successful: benchmark saved to GitHub.');
    }catch(e){item.attempts++;item.next_attempt=Date.now()+Math.min(3600000,5000*2**Math.min(10,item.attempts-1));await this.store.put(key,item);next=Math.min(next,item.next_attempt);this.notify(`Upload Failed: ${e.name==='AbortError'?'request timed out':e.message}. Report retained; retry queued.`);}
   }
   // Only acknowledged uploads can be pruned. Never drop pending reports.
   const uploaded=(await this.store.list('report:')).filter(r=>r.value.state==='uploaded').sort((a,b)=>(b.value.uploaded_at??0)-(a.value.uploaded_at??0));for(const row of uploaded.slice(10))await this.store.remove(row.key);
  }finally{this.busy=false;if(Number.isFinite(next))this.kick(Math.max(1000,next-Date.now()));}
 }
 async exportLatest(){let report=this.latest;if(!report){const rows=await this.store.list('report:');report=rows.sort((a,b)=>b.value.report.session.started_at.localeCompare(a.value.report.session.started_at))[0]?.value.report;}if(!report)throw new Error('No benchmark report is available');const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`breachline-${report.session.id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 async configuredEndpoint(){return (await this.auth())?.endpoint??BENCHMARK_CONFIG.endpoint??'';}
}
