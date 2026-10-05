// Render the shipped gameplay renderer at repeatable player camera positions.
// Software WebGL screenshots and scene counts are not physical iPhone timings.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const stage=process.argv[2]??'current',origin=process.env.ART_TEST_ORIGIN??'http://127.0.0.1:4173';
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4173'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);server.on('exit',c=>{if(c)reject(Error('Preview failed'));});});
const browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:600},deviceScaleFactor:1,serviceWorkers:'block'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.route('**/__art',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block}</style><canvas id="view"></canvas>'}));
await page.goto(origin+'/__art');
await page.evaluate(async()=>{
 const [{Renderer},{Game},{Weapon},{MAPS}]=await Promise.all([import('/js/three-renderer.js'),import('/js/engine.js'),import('/js/weapons.js'),import('/js/maps.js')]);
 window.art={Renderer,Game,Weapon,MAPS};
 const game=new Game({map:14,mode:'domination'},{seed:817});
 const renderer=new Renderer(document.querySelector('canvas'),{quality:'high',motion:false,fov:80,frameRate:60});
 renderer.setArena(game.arena);await renderer.ready;window.art.game=game;window.art.renderer=renderer;
});
await mkdir('test-results/'+stage,{recursive:true});
const shots=[
 {name:'blacksite-approach',map:14,x:0,z:27,yaw:0,pitch:.02},
 {name:'blacksite-interior',map:14,x:0,z:9,yaw:0,pitch:0},
 {name:'blacksite-yard',map:14,x:-31,z:25,yaw:-.12,pitch:0},
 {name:'weapon-close',map:14,x:0,z:27,yaw:0,pitch:0,weapon:1},
];
if(process.argv.includes('--all-maps'))for(let map=0;map<16;map++)shots.push({name:'map-'+map,map,menu:true});
if(process.argv.includes('--all-weapons'))for(let weapon=0;weapon<30;weapon++)shots.push({name:'weapon-'+weapon,map:14,x:0,z:27,yaw:0,pitch:0,weapon});
const results=[];
try{
 for(const shot of shots){
  const stats=await page.evaluate(async shot=>{
   const {game,renderer,Game,Weapon}=window.art;
   let g=window.art.game;
   if(g.arena.info.id!==shot.map){g=new Game({map:shot.map,mode:'tdm'},{seed:817});window.art.game=g;renderer.setArena(g.arena);}
   const p=g.player;Object.assign(p,{x:shot.x??15,y:0,z:shot.z??25,yaw:shot.yaw??0,pitch:shot.pitch??0,vx:0,vz:0,ads:0});
   p.weapons[0]=new Weapon(shot.weapon??0,{optic:1});p.slot=0;renderer.weaponKey='';renderer.cameraY=null;g.time=2;
   await renderer.prepareMatch(g);
   for(let i=0;i<8;i++)renderer.render(g,1/60,!!shot.menu);
   return {map:g.arena.info.name,draws:renderer.drawCalls,triangles:renderer.triangles,shadowDraws:renderer.lastShadowDraws,textureEstimateBytes:renderer.textureMemory,programs:renderer.shaderPrograms,geometryCount:renderer.blenderAssets.geometries.size};
  },shot);
  await page.screenshot({path:'test-results/'+stage+'/'+shot.name+'.png'});results.push({name:shot.name,...stats});console.log(shot.name,JSON.stringify(stats));
 }
 await writeFile('test-results/'+stage+'/scene-counts.json',JSON.stringify({kind:'software_WebGL_visual_validation',actual_iphone_data:false,errors,results},null,2)+'\n');
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();server?.kill();}
