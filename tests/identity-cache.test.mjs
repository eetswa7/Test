import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {Game} from '../dist/js/engine.js';
import {identityFor,canIdentify} from '../dist/js/combat-identity.js';

test('identity follows the player and game rules, including FFA and team changes',()=>{
 const g=new Game(),p=g.player,ally=g.actors[1],enemy=g.actors[4];
 assert.equal(identityFor(p,p,g.rules).key,'self');assert.equal(identityFor(ally,p,g.rules).key,'ally');assert.equal(identityFor(enemy,p,g.rules).key,'enemy');
 p.team=1;assert.equal(identityFor(enemy,p,g.rules).key,'ally');assert.equal(identityFor(ally,p,g.rules).key,'enemy');
 for(const mode of ['ffa','gun']){const f=new Game({mode});assert(f.actors.slice(1).every(a=>identityFor(a,f.player,f.rules).key==='enemy'));}
});
test('combat labels respect walls, smoke, death and flash blindness',()=>{
 const g=new Game(),p=g.player,t=g.actors[4];p.x=t.x=0;p.z=0;t.z=-10;p.y=t.y=0;p.yaw=p.pitch=0;g.arena.blocks=g.arena.blocks.filter(b=>b.ground);
 assert(canIdentify(g,t));g.arena.blocks.push({x:0,y:2,z:-5,w:5,h:4,d:1});assert(!canIdentify(g,t));g.arena.blocks.pop();
 g.smokes.push({x:0,y:0,z:-5,age:2});assert(!canIdentify(g,t));g.smokes.length=0;
 p.flashed=1;assert(!canIdentify(g,t));p.flashed=0;t.health=0;assert(!canIdentify(g,t));assert(!canIdentify(g,p));
});

const swSource=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
function worker(fetcher=async request=>({ok:true,redirected:false,url:String(request)})){
 const handlers={},state={matches:0,puts:0,activated:false,deleted:[]};
 const cache={match:async()=>{state.matches++;return 'cached release';},put:async()=>{state.puts++;}};
 const self={registration:{scope:'https://game.example/'},location:{origin:'https://game.example'},addEventListener:(type,fn)=>{handlers[type]=fn;},skipWaiting:async()=>{state.activated=true;},clients:{claim:async()=>{}}};
 vm.runInNewContext(swSource,{self,URL,Set,Promise,Error,Response,fetch:fetcher,caches:{open:async()=>cache,keys:async()=>['breachline-v7','breachline-v8','other-app'],delete:async name=>state.deleted.push(name)}});
 return {handlers,state};
}
test('offline cache never substitutes this release for another release module',async()=>{
 const {handlers,state}=worker();let response;
 for(const version of ['7','9'])handlers.fetch({request:{method:'GET',mode:'cors',url:`https://game.example/js/main.js?v=${version}`},respondWith:r=>{response=r;}});
 assert.equal(response,undefined);assert.equal(state.matches,0);
 handlers.fetch({request:{method:'GET',mode:'cors',url:'https://game.example/js/main.js?v=8'},respondWith:r=>{response=r;}});assert.equal(await response,'cached release');
 let release;handlers.message({data:{type:'VERSION'},ports:[{postMessage:r=>{release=r.release;}}]});assert.equal(release,'8');
});
test('an incomplete update cannot activate, and activation preserves unrelated caches',async()=>{
 const bad=worker(async url=>({ok:false,redirected:false,url:String(url)}));let installing;bad.handlers.install({waitUntil:p=>{installing=p;}});await assert.rejects(installing);assert.equal(bad.state.activated,false);
 const good=worker();good.handlers.install({waitUntil:p=>{installing=p;}});await installing;assert(good.state.puts>30);assert(good.state.activated);
 good.handlers.activate({waitUntil:p=>{installing=p;}});await installing;assert.deepEqual(good.state.deleted,['breachline-v7']);
});
