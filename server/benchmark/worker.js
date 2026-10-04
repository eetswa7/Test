import {bytes,base64url,fromBase64url,digest,signatureMessage} from '../../dist/js/benchmark-crypto.js';
import {validateReport} from './validation.js';

const REPOSITORY='eetswa7/Test',MAX_BODY=2*1024*1024;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const failure=(message,status=400)=>Object.assign(new Error(message),{status});
async function readJSON(request,max=MAX_BODY){
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')throw failure('JSON required',415);
 const reader=request.body?.getReader();if(!reader)throw failure('Body required');let length=0,parts=[];try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>max){await reader.cancel();throw failure('Request too large',413);}parts.push(value);}}finally{reader.releaseLock();}
 const combined=new Uint8Array(length);let at=0;for(const part of parts){combined.set(part,at);at+=part.length;}try{return JSON.parse(new TextDecoder().decode(combined));}catch{throw failure('Invalid JSON');}
}
const exactKeys=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).length===keys.length&&Object.keys(obj).every(k=>keys.includes(k));
async function hmacKey(secret){if(typeof secret!=='string'||secret.length<32)throw failure('Upload service is not configured',503);return crypto.subtle.importKey('raw',bytes(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function issueCredential(publicKey,origin,secret){const payload=base64url(bytes(JSON.stringify({v:1,public_key:publicKey,origin}))),key=await hmacKey(secret);return payload+'.'+base64url(await crypto.subtle.sign('HMAC',key,bytes(payload)));}
async function verifyCredential(credential,origin,secret){
 if(typeof credential!=='string'||credential.length>1024)throw failure('Invalid credential',401);const [payload,signature,...rest]=credential.split('.');if(rest.length||!signature)throw failure('Invalid credential',401);
 try{const key=await hmacKey(secret);if(!await crypto.subtle.verify('HMAC',key,fromBase64url(signature),bytes(payload)))throw Error();const claims=JSON.parse(new TextDecoder().decode(fromBase64url(payload)));if(!exactKeys(claims,['v','public_key','origin'])||claims.v!==1||claims.origin!==origin)throw Error();return claims;}catch(e){if(e.status===503)throw e;throw failure('Invalid credential',401);}
}
async function publicKey(encoded){try{return await crypto.subtle.importKey('spki',fromBase64url(encoded),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);}catch{throw failure('Invalid signing key',401);}}
const safeCodeEqual=async(a,b)=>{const x=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(a))),y=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(b)));let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;};

// The exported class is a Durable Object. One object serialises all Contents API
// writes. Persistent receipts survive eviction/restarts; GitHub is authoritative.
export class BenchmarkInbox {
 constructor(state,env){this.state=state;this.env=env;this.chain=Promise.resolve();this.fetcher=env.TEST_FETCH??fetch;}
 fetch(request){const task=this.chain.then(()=>this.handle(request));this.chain=task.catch(()=>{});return task;}
 async rate(name,limit,period){const key='rate:'+name,now=Date.now();let row=await this.state.storage.get(key);if(!row||now>=row.until)row={count:0,until:now+period};if(row.count>=limit)throw failure('Upload rate limit reached. Retry later.',429);row.count++;await this.state.storage.put(key,row);}
 async handle(request){
  try{
   const origin=request.headers.get('Origin'),url=new URL(request.url);if(origin!==this.env.BENCHMARK_ALLOWED_ORIGIN)throw failure('Origin not allowed',403);
   if(request.method!=='POST')throw failure('Method not allowed',405);
   if(url.pathname==='/pair')return await this.pair(await readJSON(request,4096),origin);
   if(url.pathname==='/upload')return await this.upload(await readJSON(request),origin);
   throw failure('Not found',404);
  }catch(error){return json({error:error.status?error.message:'Upload service error; retry safely.'},error.status??503);}
 }
 async pair(body,origin){
  await this.rate('pair',30,3600000);if(!exactKeys(body,['code','public_key'])||typeof body.code!=='string'||body.code.length>256)throw failure('Invalid pairing request');
  const configured=this.env.BENCHMARK_PAIRING_CODE;if(typeof configured!=='string'||configured.length<24)throw failure('Pairing is not configured',503);
  if(!await safeCodeEqual(body.code,configured))throw failure('Pairing code rejected',401);await publicKey(body.public_key);
  const codeHash=await digest(configured),used=await this.state.storage.get('pair:'+codeHash);
  if(used){if(used.public_key!==body.public_key)throw failure('Pairing code already used. Set a new one-time code.',409);return json({credential:used.credential,recovered:true});}
  const credential=await issueCredential(body.public_key,origin,this.env.BENCHMARK_AUTH_SECRET);await this.state.storage.put('pair:'+codeHash,{public_key:body.public_key,credential});return json({credential});
 }
 async github(path,options={}){
  if(!this.env.BENCHMARK_GITHUB_TOKEN)throw failure('GitHub write credential is not configured',503);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{return await this.fetcher('https://api.github.com/repos/'+REPOSITORY+path,{...options,redirect:'error',signal:controller.signal,headers:{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Breachline-Benchmark-Inbox','Authorization':'Bearer '+this.env.BENCHMARK_GITHUB_TOKEN,...options.headers}});}finally{clearTimeout(timer);}
 }
 async resolveCommit(build){
  const branch=this.env.BENCHMARK_BRANCH??'main',cacheKey='build:'+build.content_sha256,cached=await this.state.storage.get(cacheKey);if(cached)return cached;
  const response=await this.github('/commits?path=dist%2Fjs%2Fbenchmark-build.js&sha='+encodeURIComponent(branch)+'&per_page=100');if(!response.ok)throw failure('Build provenance lookup failed',503);
  const commits=await response.json();if(!Array.isArray(commits))throw failure('Build provenance lookup failed',503);
  for(const commit of commits){if(!/^[a-f\d]{40}$/.test(commit.sha))continue;const file=await this.github('/contents/dist/js/benchmark-build.js?ref='+commit.sha,{headers:{Accept:'application/vnd.github.raw+json'}});if(!file.ok)continue;const text=await file.text(),match=/Object\.freeze\((\{[^\n]+\})\)/.exec(text);if(!match)continue;let manifest;try{manifest=JSON.parse(match[1]);}catch{continue;}if(manifest.content_sha256===build.content_sha256&&manifest.release===build.release){await this.state.storage.put(cacheKey,commit.sha);return commit.sha;}}
  throw failure('This game build is not recorded in repository history. Retain the report and retry after publishing the stamped build.',422);
 }
 async upload(body,origin){
  if(!exactKeys(body,['credential','timestamp','signature','report_json'])||typeof body.report_json!=='string'||bytes(body.report_json).length>1500000||!Number.isSafeInteger(body.timestamp)||Math.abs(Date.now()-body.timestamp)>300000)throw failure('Invalid or expired upload request',401);
  const claims=await verifyCredential(body.credential,origin,this.env.BENCHMARK_AUTH_SECRET),key=await publicKey(claims.public_key),hash=await digest(body.report_json);
  let valid=false;try{valid=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,fromBase64url(body.signature),bytes(signatureMessage(body.credential,body.timestamp,hash)));}catch{}if(!valid)throw failure('Signature rejected',401);
  await this.rate('upload-hour',20,3600000);await this.rate('upload-day',200,86400000);
  let report;try{report=validateReport(JSON.parse(body.report_json));}catch(e){throw failure(e.message,422);}
  const id=report.session.id,date=report.session.started_at,path=`benchmarks/${date.slice(0,4)}/${date.slice(5,7)}/${id}.json`,receiptKey='receipt:'+id,previous=await this.state.storage.get(receiptKey);
  if(previous&&previous.hash!==hash)throw failure('Session ID already exists with different content',409);
  if(previous?.commit_sha)return json({session_id:id,path:previous.path,commit_sha:previous.commit_sha,duplicate:true});
  report.build.commit=await this.resolveCommit(report.build);report.build.commit_resolution='verified_repository_history';
  const content=JSON.stringify(report,null,2)+'\n',encoded=base64url(bytes(content)).replace(/-/g,'+').replace(/_/g,'/');
  // The raw media type also works for reports larger than GitHub's 1 MB JSON-content limit.
  const branch=this.env.BENCHMARK_BRANCH??'main',existing=await this.github('/contents/'+path+'?ref='+encodeURIComponent(branch),{headers:{Accept:'application/vnd.github.raw+json'}});
  if(existing.ok){const saved=await existing.text();
   if(saved!==content)throw failure('Existing report differs; refusing to overwrite history',409);
   const history=await this.github('/commits?path='+encodeURIComponent(path)+'&sha='+encodeURIComponent(branch)+'&per_page=1');if(!history.ok)throw failure('Cannot verify report commit',503);const commits=await history.json();if(!commits[0]?.sha)throw failure('Cannot verify report commit',503);const receipt={hash,path,commit_sha:commits[0].sha};await this.state.storage.put(receiptKey,receipt);return json({session_id:id,path,commit_sha:receipt.commit_sha,duplicate:true});
  }
  if(existing.status!==404)throw failure('GitHub report lookup failed; retry safely',503);
  const put=await this.github('/contents/'+path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:`Benchmark ${report.session.kind} / release ${report.build.release} / ${id}`,branch,content:encoded+'='.repeat((4-encoded.length%4)%4)})});
  if(put.status!==201)throw failure(put.status===403?'GitHub permission or branch rule denied the upload':'GitHub report write failed; retry safely',503);
  const saved=await put.json();if(!/^[a-f\d]{40}$/.test(saved.commit?.sha??''))throw failure('GitHub did not acknowledge the report commit',503);
  const receipt={hash,path,commit_sha:saved.commit.sha};await this.state.storage.put(receiptKey,receipt);return json({session_id:id,path,commit_sha:receipt.commit_sha,duplicate:false});
 }
}

export default {async fetch(request,env){
 const origin=request.headers.get('Origin'),allowed=env.BENCHMARK_ALLOWED_ORIGIN;if(!allowed||origin!==allowed)return json({error:'Origin not allowed'},403);
 const headers={'Access-Control-Allow-Origin':allowed,'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600','Cache-Control':'no-store'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:{...headers,'Content-Type':'application/json'}});
 if(!env.BENCHMARK_INBOX)return new Response(JSON.stringify({error:'Upload service is not configured'}),{status:503,headers:{...headers,'Content-Type':'application/json'}});
 const stub=env.BENCHMARK_INBOX.get(env.BENCHMARK_INBOX.idFromName('breachline-owner')),result=await stub.fetch(request);const response=new Response(result.body,result);for(const [k,v]of Object.entries(headers))response.headers.set(k,v);return response;
}};
