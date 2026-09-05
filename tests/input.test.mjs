import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// No browser is launched. This fixture checks event ownership and lifecycle
// regressions against the actual game module, with Canvas drawing stubbed out.
const registry=new Map(),windowEvents=new Map(),documentEvents=new Map();
const context=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(obj,key)=>key in obj?obj[key]:(()=>{}),set:(obj,key,value)=>(obj[key]=value,true)});
class Classes{constructor(){this.set=new Set();}add(...a){a.forEach(x=>this.set.add(x));}remove(...a){a.forEach(x=>this.set.delete(x));}contains(x){return this.set.has(x);}toggle(x,force){const yes=force??!this.set.has(x);yes?this.set.add(x):this.set.delete(x);return yes;}}
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.dataset={};this.attributes={};this.classList=new Classes();this.listeners=new Map();this.textContent='';this.clientWidth=390;this.clientHeight=844;}
 set id(x){this._id=x;registry.set(x,this);}get id(){return this._id;}
 set className(s){this.classList=new Classes();this.classList.add(...s.split(/\s+/));}
 set innerHTML(s){this._html=s;for(const m of s.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)){const el=new Element(m[1]);el.id=m[2];this.children.push(el);}}get innerHTML(){return this._html||'';}
 append(...els){this.children.push(...els);}appendChild(el){this.children.push(el);}replaceChildren(...els){this.children=els;}
 setAttribute(k,v){this.attributes[k]=v;}getContext(){return context;}focus(){document.activeElement=this;}
 addEventListener(n,fn){if(!this.listeners.has(n))this.listeners.set(n,[]);this.listeners.get(n).push(fn);}
 getBoundingClientRect(){return{left:0,top:0,width:this.id==='stick'?102:390,height:this.id==='stick'?102:844};}
 setPointerCapture(){}querySelectorAll(){return this.children.flatMap(c=>[...(c.tagName==='BUTTON'?[c]:[]),...c.querySelectorAll()]);}
 emit(name,data={}){const e={type:name,pointerId:1,clientX:51,clientY:51,code:'',preventDefault(){},currentTarget:this,...data};for(const fn of this.listeners.get(name)||[])fn(e);return e;}
 click(){this.onclick?.({currentTarget:this});this.emit('click');}
}
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
for(const m of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)){const el=new Element(m[1]);el.id=m[2];if(m[0].includes('hidden'))el.classList.add('hidden');}
const el=id=>registry.get(id);
globalThis.document={getElementById:el,createElement:tag=>new Element(tag),body:new Element('body'),hidden:false,activeElement:null,addEventListener:(name,fn)=>documentEvents.set(name,fn)};
globalThis.window=globalThis;globalThis.devicePixelRatio=3;
globalThis.addEventListener=(name,fn)=>windowEvents.set(name,fn);
globalThis.matchMedia=()=>({matches:false});
globalThis.location={protocol:'http:'};
const storage=new Map([['nightwatch-v2',JSON.stringify({settings:{sound:false}})]]);
globalThis.localStorage={getItem:key=>storage.get(key),setItem:(key,val)=>storage.set(key,val)};
let pending,now=1000;globalThis.requestAnimationFrame=fn=>{pending=fn;};
await import('../dist/game.js');
function frames(n){for(let i=0;i<n;i++){now+=1000/60;const f=pending;f(now);}}
const rounds=()=>Number(el('ammo-1').textContent.split(' ')[0]);
function begin(){el('launch').click();el('weapon-1').click();frames(1);}

test('game boots and starts at an iPhone-sized viewport without exceptions',()=>{assert.equal(el('missions').children.length,5);begin();assert.equal(el('hud').classList.contains('hidden'),false);assert.equal(el('menu').classList.contains('hidden'),true);assert.equal(el('mission-title').textContent,'Broken Arrow');assert.equal(rounds(),120);frames(20);});
test('sensor and fire use separate pointer IDs; cancelling sensor preserves fire',()=>{
 begin();el('stick').emit('pointerdown',{pointerId:11,clientX:80,clientY:50});el('fire').emit('pointerdown',{pointerId:22});frames(35);const a=rounds();assert.ok(a<120);el('stick').emit('pointercancel',{pointerId:11});frames(35);assert.ok(rounds()<a);el('fire').emit('pointercancel',{pointerId:22});frames(12);const stopped=rounds();frames(50);assert.equal(rounds(),stopped);assert.equal(el('fire').classList.contains('firing'),false);
});
test('lost pointer capture stops firing without needing pointerup',()=>{begin();el('fire').emit('pointerdown',{pointerId:31});frames(30);el('fire').emit('lostpointercapture',{pointerId:31});frames(12);const a=rounds();frames(60);assert.equal(rounds(),a);});
test('backgrounding pauses, clears held input, and resumes without phantom fire',()=>{begin();el('fire').emit('pointerdown',{pointerId:41});frames(30);document.hidden=true;documentEvents.get('visibilitychange')();const before=rounds();frames(120);assert.equal(rounds(),before);assert.equal(el('modal').classList.contains('hidden'),false);document.hidden=false;documentEvents.get('visibilitychange')();el('modal-actions').children[0].click();frames(60);assert.equal(rounds(),before);assert.equal(el('fire').classList.contains('firing'),false);});
test('orientation resize releases an active fire pointer',()=>{begin();el('fire').emit('pointerdown',{pointerId:51});frames(30);el('world').clientWidth=844;el('world').clientHeight=390;windowEvents.get('resize')();frames(12);const a=rounds();frames(60);assert.equal(rounds(),a);});
test('pinching changes zoom and touch cancellation does not crash the sensor',()=>{begin();el('world').emit('pointerdown',{pointerId:61,clientX:100,clientY:150});el('world').emit('pointerdown',{pointerId:62,clientX:200,clientY:150});el('world').emit('pointermove',{pointerId:62,clientX:270,clientY:150});assert.equal(el('zoom').textContent,'1.7×');el('world').emit('pointercancel',{pointerId:61});el('world').emit('pointercancel',{pointerId:62});frames(10);});
test('settings and each sensor mode run without resetting a paused sortie',()=>{begin();el('pause').click();const current=rounds();el('modal-actions').children[1].click();for(const row of el('modal-content').children){const button=row.children.find(c=>c.tagName==='BUTTON');if(button&&button.attributes['aria-label']!=='Sound')button.click();}el('modal-actions').children[0].click();el('modal-actions').children[0].click();for(let i=0;i<3;i++){el('thermal').click();frames(1);}assert.equal(el('thermal').textContent,'WHOT');assert.equal(rounds(),current);assert.equal(el('modal').classList.contains('hidden'),true);});
