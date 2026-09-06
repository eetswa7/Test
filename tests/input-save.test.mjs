import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchInput,CONTROL_LAYOUT} from '../dist/js/input.js';
import {DEFAULT_SETTINGS,SaveStore} from '../dist/js/save.js';

const classes=()=>({add(){},remove(){},toggle(){}});
function fixture(width=844,height=390){
 const buttons=Object.fromEntries(Object.keys(CONTROL_LAYOUT).map(key=>[key,{dataset:{action:key},style:{},classList:classes()}]));
 const knob={style:{}},stick={style:{}};
 const layer={style:{setProperty(){}},classList:classes(),addEventListener(){},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width,height}),querySelector(q){return q==='#stick'?stick:q==='#stick-knob'?knob:buttons[q.match(/"(.+)"/)[1]];},querySelectorAll(){return[];}};
 globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){},pointerLockElement:null};Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[]},configurable:true});
 const input=new TouchInput({},layer,{...DEFAULT_SETTINGS,layout:{}});input.active=true;
 const ev=(id,x,y,action)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,preventDefault(){},target:{closest:()=>buttons[action]??null}});
 return{input,ev,buttons};
}
test('simultaneous move, look and fire are tracked independently',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,90,260));input.pointerMove(ev(1,90,210));input.pointerDown(ev(2,600,160));input.pointerMove(ev(2,630,145));input.pointerDown(ev(3,740,200,'fire'));const f=input.sample(1/60);assert(f.mz>.9);assert(f.lx>0);assert(f.ly>0);assert(f.fire);assert(f.firePressed);input.pointerUp(ev(3,740,200,'fire'));assert(input.sample(1/60).mz>.9);});
test('quick fire taps survive release before the next animation frame',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,700,200,'fire'));input.pointerUp(ev(1,700,200,'fire'));const f=input.sample(1/60);assert(f.fire&&f.firePressed);assert(!input.sample(1/60).fire);});
test('dragging the fire button aims while holding fire',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,700,200,'fire'));input.pointerMove(ev(1,745,175,'fire'));const f=input.sample(1/60);assert(f.fire&&f.lx>0&&f.ly>0);});
test('ADS supports both tap and hold without a stuck state',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,670,120,'ads'));input.pointerUp(ev(1,670,120,'ads'));assert(input.sample(.016).ads);input.pointerDown(ev(2,670,120,'ads'));input.pointerUp(ev(2,670,120,'ads'));assert(!input.sample(.016).ads);input.settings.adsMode='hold';input.pointerDown(ev(3,670,120,'ads'));assert(input.sample(.016).ads);input.pointerUp(ev(3,670,120,'ads'));assert(!input.sample(.016).ads);});
test('cancel/reset releases all input after an interruption',()=>{const{input,ev}=fixture();input.pointerDown(ev(1,90,260));input.pointerMove(ev(1,90,190));input.pointerDown(ev(2,700,200,'fire'));input.reset();const f=input.sample(.016);assert.equal(f.mz,0);assert.equal(f.lx,0);assert(!f.fire&&!f.ads);assert.equal(input.pointers.size,0);});
test('touch layout clamps dragged buttons and mirrors left-handed positions',()=>{for(const [width,height]of [[667,375],[844,390],[932,430]]){const{input,ev,buttons}=fixture(width,height);input.editing=true;input.pointerDown(ev(1,width*.9,height*.5,'fire'));input.pointerMove(ev(1,width*2,height*2,'fire'));assert.equal(input.settings.layout.fire.x,.945);assert.equal(input.settings.layout.fire.y,.91);input.settings.leftHanded=true;input.layout();assert(Math.abs(parseFloat(buttons.fire.style.left)-5.5)<.01);}});
test('saved loadouts, settings and progression round-trip',()=>{let data='';const storage={getItem:()=>data,setItem:(k,v)=>data=v},s=new SaveStore(storage);s.data.loadout.primary=3;s.data.settings.leftHanded=true;s.finish({xp:750,win:true,kills:4,deaths:1,streak:3,weaponKills:{3:4}});const loaded=new SaveStore(storage);assert.equal(loaded.data.loadout.primary,3);assert(loaded.data.settings.leftHanded);assert.equal(loaded.data.xp,750);assert.equal(loaded.data.weaponXP[3],400);assert.equal(loaded.level,2);});
test('corrupt saves and quota failures do not stop gameplay',()=>{const bad=new SaveStore({getItem:()=>'{bad',setItem(){throw Error('quota');}});assert.equal(bad.data.loadout.primary,0);assert(!bad.persist());const malformed=new SaveStore({getItem:()=>JSON.stringify({version:1,loadout:{primary:999,secondary:-9},settings:{sensitivity:900,fov:-20}})});assert.equal(malformed.data.loadout.primary,9);assert.equal(malformed.data.loadout.secondary,10);assert.equal(malformed.data.settings.fov,65);});
