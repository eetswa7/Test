import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{BenchmarkInbox} from '../server/benchmark/worker.js';
import {bytes,base64url,digest,signatureMessage} from '../dist/js/benchmark-crypto.js';
import {reportFixture,makeRecorder,fakeGame,graphics,render} from './benchmark-fixture.mjs';

const origin='https://breachline.example';
function fixture(){
 const data=new Map(),files=new Map(),commits=[],state={storage:{get:async key=>data.get(key),put:async(key,value)=>data.set(key,structuredClone(value))}};
 const env={BENCHMARK_ALLOWED_ORIGIN:origin,BENCHMARK_AUTH_SECRET:'synthetic-test-auth-secret-'.repeat(3),BENCHMARK_PAIRING_CODE:'synthetic-test-pairing-code-123456',BENCHMARK_GITHUB_TOKEN:'synthetic-never-real-token',BENCHMARK_BRANCH:'main'};
 const build=reportFixture().build;env.TEST_FETCH=async(url,options)=>{
  const u=new URL(url),path=u.pathname.replace('/repos/eetswa7/Test','');assert.equal(u.host,'api.github.com');assert.equal(options.headers.Authorization,'Bearer '+env.BENCHMARK_GITHUB_TOKEN);
  if(path==='/commits'){const target=u.searchParams.get('path');return Response.json([{sha:target==='dist/js/benchmark-build.js'?'b'.repeat(40):'c'.repeat(40)}]);}
  if(path==='/contents/dist/js/benchmark-build.js')return new Response('export const BENCHMARK_BUILD=Object.freeze('+JSON.stringify(build)+');');
  if(path.startsWith('/contents/benchmarks/')){if(options.method==='PUT'){const body=JSON.parse(options.body);assert(!body.sha);if(files.has(path))return Response.json({error:'exists'},{status:422});files.set(path,body.content);commits.push(body);return Response.json({commit:{sha:'c'.repeat(40)}},{status:201});}return files.has(path)?options.headers.Accept==='application/vnd.github.raw+json'?new Response(Buffer.from(files.get(path),'base64')):Response.json({encoding:'none',content:''}):Response.json({error:'missing'},{status:404});}
  throw Error('Unexpected GitHub path '+path);
 };
 const inbox=new BenchmarkInbox(state,env);env.BENCHMARK_INBOX={idFromName:name=>name,get:()=>inbox};return {env,state,data,files,commits,inbox};
}
const request=(path,body,requestOrigin=origin)=>new Request('https://worker.example'+path,{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)});
async function paired(f){const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']),public_key=base64url(await crypto.subtle.exportKey('spki',keys.publicKey)),res=await worker.fetch(request('/pair',{code:f.env.BENCHMARK_PAIRING_CODE,public_key}),f.env);assert.equal(res.status,200);return {...keys,public_key,credential:(await res.json()).credential};}
async function envelope(auth,report=reportFixture()){const report_json=JSON.stringify(report),timestamp=Date.now(),hash=await digest(report_json),signature=base64url(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},auth.privateKey,bytes(signatureMessage(auth.credential,timestamp,hash))));return {credential:auth.credential,timestamp,signature,report_json};}

test('pairing needs the exact origin and secret, a one-use code and valid public key',async()=>{
 const f=fixture();let res=await worker.fetch(request('/pair',{code:'wrong',public_key:'bad'}),f.env);assert.equal(res.status,401);res=await worker.fetch(request('/pair',{code:f.env.BENCHMARK_PAIRING_CODE,public_key:'bad'},'https://attacker.example'),f.env);assert.equal(res.status,403);
 const auth=await paired(f);res=await worker.fetch(request('/pair',{code:f.env.BENCHMARK_PAIRING_CODE,public_key:auth.public_key}),f.env);assert.equal(res.status,200);assert.equal((await res.json()).credential,auth.credential);const other=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);res=await worker.fetch(request('/pair',{code:f.env.BENCHMARK_PAIRING_CODE,public_key:base64url(await crypto.subtle.exportKey('spki',other.publicKey))}),f.env);assert.equal(res.status,409);assert.equal(f.commits.length,0);
});
test('signed upload creates one immutable report, resolves the real repository commit, and hides auth',async()=>{
 const f=fixture(),auth=await paired(f),body=await envelope(auth);let res=await worker.fetch(request('/upload',body),f.env);assert.equal(res.status,200,await res.clone().text());const receipt=await res.json();assert(receipt.path.startsWith('benchmarks/'));assert.equal(receipt.duplicate,false);assert.equal(f.commits.length,1);const saved=JSON.parse(Buffer.from([...f.files.values()][0],'base64').toString());assert.equal(saved.build.commit,'b'.repeat(40));assert.equal(saved.build.commit_resolution,'verified_repository_history');const text=JSON.stringify(saved);for(const secret of [auth.public_key,auth.credential,f.env.BENCHMARK_GITHUB_TOKEN,f.env.BENCHMARK_PAIRING_CODE])assert(!text.includes(secret));assert(!text.includes('device_id'));
 res=await worker.fetch(request('/upload',body),f.env);assert.equal(res.status,200);assert.equal((await res.json()).duplicate,true);assert.equal(f.commits.length,1);
});
test('signed report retries after server eviction recover the GitHub write without duplicates',async()=>{
 const f=fixture(),auth=await paired(f),body=await envelope(auth);let res=await f.inbox.fetch(request('/upload',body));assert.equal(res.status,200);for(const key of f.data.keys())if(key.startsWith('receipt:'))f.data.delete(key);const recreated=new BenchmarkInbox(f.state,f.env);res=await recreated.fetch(request('/upload',body));assert.equal(res.status,200,await res.clone().text());assert.equal((await res.json()).duplicate,true);assert.equal(f.commits.length,1);
});
test('a ten-minute report above GitHub JSON-content limits recovers after losing its receipt',async()=>{
 const f=fixture(),auth=await paired(f),r=makeRecorder(),game=fakeGame();for(let i=0;i<=36000;i++)r.record({now:i*1000/60,cpuMs:4,renderCpuMs:2,game,graphics,render});
 const body=await envelope(auth,r.report({now:600000}));let res=await f.inbox.fetch(request('/upload',body));assert.equal(res.status,200,await res.clone().text());assert(Buffer.from([...f.files.values()][0],'base64').length>1000000);
 for(const key of f.data.keys())if(key.startsWith('receipt:'))f.data.delete(key);res=await new BenchmarkInbox(f.state,f.env).fetch(request('/upload',body));assert.equal(res.status,200,await res.clone().text());assert.equal((await res.json()).duplicate,true);assert.equal(f.commits.length,1);
});
test('tampering, expiry, extra fields, path traversal and foreign origins cannot commit',async()=>{
 const f=fixture(),auth=await paired(f),good=await envelope(auth);
 for(const body of [{...good,signature:'bad'},{...good,credential:good.credential+'x'},{...good,timestamp:Date.now()-600000},{...good,report_json:good.report_json.replace('regular','veteran')},{...good,repository:'attacker/other'}]){const res=await worker.fetch(request('/upload',body),f.env);assert(res.status>=400);}
 let report=reportFixture();report.session.id='../evil';let res=await worker.fetch(request('/upload',await envelope(auth,report)),f.env);assert.equal(res.status,422);report=reportFixture();report.email='private@example.com';res=await worker.fetch(request('/upload',await envelope(auth,report)),f.env);assert.equal(res.status,422);res=await worker.fetch(request('/upload',good,'https://attacker.example'),f.env);assert.equal(res.status,403);assert.equal(f.commits.length,0);
});
test('concurrent retries serialise into a single Contents API write and preserve conflicting history',async()=>{
 const f=fixture(),auth=await paired(f),report=reportFixture(),body=await envelope(auth,report);const results=await Promise.all([f.inbox.fetch(request('/upload',body)),f.inbox.fetch(request('/upload',body))]);assert(results.every(r=>r.status===200));assert.equal(f.commits.length,1);report.activity.shots++;const conflict=await f.inbox.fetch(request('/upload',await envelope(auth,report)));assert.equal(conflict.status,409);assert.equal(f.commits.length,1);
});
test('CORS preflight permits only configured origin, size and pair rates are bounded',async()=>{
 const f=fixture();let res=await worker.fetch(new Request('https://worker.example/upload',{method:'OPTIONS',headers:{Origin:origin}}),f.env);assert.equal(res.status,204);assert.equal(res.headers.get('Access-Control-Allow-Origin'),origin);assert(!res.headers.has('Access-Control-Allow-Credentials'));
 res=await f.inbox.fetch(request('/upload',{value:'x'.repeat(2100000)}));assert.equal(res.status,413);for(let i=0;i<30;i++)await f.inbox.fetch(request('/pair',{code:'wrong',public_key:'bad'}));res=await f.inbox.fetch(request('/pair',{code:'wrong',public_key:'bad'}));assert.equal(res.status,429);
});
