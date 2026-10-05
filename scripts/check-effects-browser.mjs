// Isolate the shipped instanced effect shader. These software WebGL frames are
// a visual/compilation check, not physical iPhone timing or gameplay validation.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const origin=process.env.ART_TEST_ORIGIN??'http://127.0.0.1:4180';
const server=process.env.ART_TEST_ORIGIN?null:spawn(process.execPath,['scripts/preview.mjs','--port','4180'],{stdio:['ignore','pipe','pipe']});
if(server)await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('preview ready'))resolve();});server.on('error',reject);});
let browser;
try{
browser=await chromium.launch({headless:true,executablePath:process.env.ART_TEST_BROWSER,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:600},serviceWorkers:'block'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.route('**/__effects',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>body{margin:0;background:#111}canvas{display:block}</style><canvas></canvas>'}));
 await page.goto(origin+'/__effects');
 const result=await page.evaluate(async()=>{
  const [T,{billboardVertex,billboardFragment},{loadImages}]=await Promise.all([import('/vendor/three.module.min.js'),import('/js/particles.js'),import('/js/textures.js')]);
  const renderer=new T.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});renderer.setSize(1280,600);renderer.toneMapping=T.ACESFilmicToneMapping;
  const scene=new T.Scene();scene.background=new T.Color(.15,.19,.22);
  const camera=new T.PerspectiveCamera(45,1280/600,.1,50);camera.position.set(0,1,10);camera.lookAt(0,0,0);
  const texture=new T.Texture((await loadImages(['effects'])).effects);texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;
  const samples=[];
  for(let i=0;i<6;i++)samples.push({position:[-4.0+(i%3)*.33,.5+Math.floor(i/3)*.2,-(i%2)*.25],tint:[.58,.60,.58],size:[1.9,1.9],alpha:.6,kind:i*.137});
  for(let kind=1;kind<=7;kind++)for(let i=0;i<8;i++){
   const rain=kind===5,snow=kind===6;
   samples.push({position:[-2.0+(kind-1)*.84+(i%3)*.16,.45+Math.floor(i/3)*.26,0],tint:kind===2?[2.4,1.4,.45]:kind===3?[.7,.48,.15]:kind===1?[.5,.48,.42]:[.72,.81,.87],size:rain?[.018,.48]:snow?[.055,.06]:kind===3?[.18,.05]:[.08,.11],alpha:.85,kind:kind+(i*.137)%1});
  }
  const plane=new T.PlaneGeometry(1,1),geometry=new T.InstancedBufferGeometry();geometry.setIndex(plane.index);
  for(const name of ['position','uv'])geometry.setAttribute(name,plane.getAttribute(name));
  for(const [name,key,size] of [['instancePosition','position',3],['instanceTint','tint',3],['instanceSize','size',2],['instanceAlpha','alpha',1],['instanceKind','kind',1]]){
   geometry.setAttribute(name,new T.InstancedBufferAttribute(new Float32Array(samples.flatMap(p=>p[key])),size));
  }
  geometry.instanceCount=samples.length;
  const material=new T.ShaderMaterial({uniforms:{uBreachEffects:{value:texture}},vertexShader:billboardVertex,fragmentShader:billboardFragment,transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,toneMapped:true});
  const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
  await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
  return {draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,particles:samples.length,webgl2:renderer.getContext() instanceof WebGL2RenderingContext};
 });
 // Exercise the actual texture-loader/readiness lifecycle separately from the
 // environment geometry, so this gate can also run while artists rebuild it.
 const loadingWarmup=await page.evaluate(async()=>{
  const [{Renderer},{MAPS}]=await Promise.all([import('/js/three-renderer.js'),import('/js/maps.js')]);
  const results=[];
  for(const forceFallback of [false,true]){
   const canvas=document.createElement('canvas');canvas.style.display='none';document.body.append(canvas);
   const originalExtension=WebGL2RenderingContext.prototype.getExtension;
   if(forceFallback)WebGL2RenderingContext.prototype.getExtension=function(name){return name==='WEBGL_compressed_texture_astc'?null:originalExtension.call(this,name);};
   let renderer;
   try{
    renderer=new Renderer(canvas,{quality:'medium',motion:false,fov:80,frameRate:60});
    const arena={info:MAPS[14],blocks:[],decor:[],indoors:()=>false};
    renderer.buildWorld=()=>{};renderer.setArena(arena);
    let enabledDuringWarmup=false,uploads=0;
    const originalUpload=renderer.renderer.initTexture.bind(renderer.renderer);
    renderer.renderer.initTexture=texture=>{uploads++;enabledDuringWarmup||=!!renderer.loaded;originalUpload(texture);};
    const originalCompile=renderer.renderer.compileAsync.bind(renderer.renderer);
    renderer.renderer.compileAsync=async(...args)=>{enabledDuringWarmup||=!!renderer.loaded;return originalCompile(...args);};
    await renderer.ready;
    results.push({forceFallback,uploads,enabledDuringWarmup,loaded:renderer.loaded,compressed:renderer.productionAssets.stats.compressed,textureEstimateBytes:renderer.textureMemory});
   }finally{WebGL2RenderingContext.prototype.getExtension=originalExtension;renderer?.dispose();canvas.remove();}
  }
  return results;
 });
 await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/runtime-effects.png'});
 await writeFile('test-results/runtime-effects-browser.json',JSON.stringify({kind:'software_WebGL_effect_validation',actual_iphone_data:false,errors,...result,loadingWarmup},null,2)+'\n');
 if(errors.length)throw Error(errors.join('\n'));
 if(result.draws!==1||!result.webgl2)throw Error('Effects must retain one WebGL2 instanced draw');
 if(loadingWarmup.some(r=>r.enabledDuringWarmup||!r.loaded||!r.uploads)||(loadingWarmup[1].compressed))throw Error('Render readiness must follow completed texture/shader warmup');
 console.log(JSON.stringify({...result,loadingWarmup}));
}finally{await browser?.close();server?.kill();}
