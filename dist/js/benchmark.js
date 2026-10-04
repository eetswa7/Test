import {Game,emptyInput} from './engine.js';
import {BenchmarkRecorder,browserInfo,rendererInfo,graphicsSnapshot,LIMITS} from './benchmark-recorder.js';
import {BenchmarkStore} from './benchmark-store.js';
import {BenchmarkUploader} from './benchmark-upload.js';
import {StressSequence,STRESS_SCENARIO} from './benchmark-stress.js';
import {BENCHMARK_BUILD} from './benchmark-build.js';
import {TimingStats,round} from './benchmark-stats.js';

export class BenchmarkController {
 constructor(app){
  this.app=app;this.enabled=false;this.saving=false;this.store=new BenchmarkStore();this.uploader=new BenchmarkUploader(this.store,message=>this.notify(message));this.uploader.playing=()=>this.app.playing&&!this.app.game.paused;this.nextHUD=0;this.nextCheckpoint=0;this.overhead=new TimingStats();
  this.ready=this.restore().catch(e=>this.notify(`Benchmark storage unavailable: ${e.message}. Manual export is available.`));
  globalThis.addEventListener?.('online',()=>this.uploader.kick());
  globalThis.addEventListener?.('pagehide',()=>{this.recorder?.pause('page_hidden');this.checkpoint();});
  globalThis.document?.addEventListener('visibilitychange',()=>{if(document.hidden){this.recorder?.pause('page_hidden');this.checkpoint();}else this.uploader.kick();});
 }
 notify(message){this.app.ui?.toast(message);const el=document.getElementById('benchmark-status');if(el)el.textContent=message;}
 async restore(){await this.store.open();const active=await this.store.get('active');if(active){active.session.interrupted=true;active.session.reason='recovered_checkpoint';await this.uploader.queue(active);await this.store.remove('active');}this.uploader.kick();}
 async toggle(value){if(this.saving)return;if(value)await this.start();else await this.stop();this.syncUI();}
 async start(kind='gameplay',scenario=null){
  if(this.enabled)return;await this.ready;
  const pending=(await this.store.list('report:')).filter(r=>r.value.state!=='uploaded');if(pending.length>=20)throw new Error('Export or upload pending reports before starting another benchmark');
  this.recorder=new BenchmarkRecorder({build:BENCHMARK_BUILD,environment:browserInfo(),renderer:rendererInfo(this.app.renderer),kind,scenario});this.recorder.gpuSupported=!!this.app.renderer.profiler?.extension;
  this.enabled=true;this.overhead.reset();this.nextCheckpoint=performance.now()+60000;this.nextHUD=0;this.graphics=null;this.latestStats=null;
  const profiler=this.app.renderer.profiler;if(profiler){profiler.sampleListener=(ms,tag)=>this.recorder?.gpuSample(ms,tag);profiler.tagProvider=()=>this.gpuTag();}
  if(!this.store.persistent)this.notify('Browser storage is unavailable. Export this report before closing Safari.');
  this.syncUI();
 }
 async stop(reason='toggle_off'){
  if(!this.enabled||this.saving)return;this.saving=true;this.enabled=false;this.syncUI();
  const recorder=this.recorder;this.recorder=null;const profiler=this.app.renderer.profiler;if(profiler){profiler.sampleListener=null;profiler.tagProvider=null;}
  try{
   if(this.checkpointPromise)await this.checkpointPromise;
   const report=recorder.report({reason});report.instrumentation={cpu_overhead_ms:this.overhead.summary(),checkpoint_period_ms:60000,checkpoint_max_ms:round(this.checkpointMax??0),raw_observations:report.raw.samples.length};
   if(this.stress)report.session.scenario={...report.session.scenario,completed:this.stress.done,simulation_ticks:this.stress.tick,effect_counts:this.stress.effectCounts};
   this.uploader.latest=report;try{await this.uploader.queue(report);await this.store.remove('active');}catch(e){this.notify('Upload Failed: browser storage could not save this report. Export JSON before closing Safari.');}
   if(this.stress)this.restoreStress();this.notify('Benchmark saved. Upload pending.');this.uploader.kick();
  }finally{this.saving=false;this.syncUI();}
 }
 beginFrame(now,active){
  const started=performance.now();if(!active){this.recorder?.pause('inactive');return;}
  this.frameNow=now;if(this.recorder?.game!==this.app.game){this.recorder.pause('match_changed');this.recorder.game=this.app.game;this.recorder.gameplayMs=0;this.recorder.nextPopulation=0;}
  this.overhead.add(performance.now()-started);
 }
 events(events){this.recorder?.observeEvents(events,this.frameNow??performance.now());}
 snapshot(){
  const r=this.app.renderer,s=this.app.store.data.settings,g=this.graphics;
  if(g&&g.requested_quality===s.quality&&g.effective_quality===(r.appliedQuality||r.quality||'unavailable')&&g.frame_cap===(s.frameRate===30?30:60)&&g.render_scale===(r.renderScale??1)&&g.width===(r.canvas?.width??r.width??0)&&g.height===(r.canvas?.height??r.height??0)&&g.device_pixel_ratio===(globalThis.devicePixelRatio??1)&&g.fov===(s.fov??80)&&g.camera_motion===(s.motion!==false))return g;
  return this.graphics=graphicsSnapshot(r,s);
 }
 gpuTag(){if(!this.recorder||!this.app.playing||this.app.game.paused)return null;this.recorder.ensureContext(this.app.game,this.snapshot(),this.frameNow);return this.recorder.gpuTag(this.frameNow);}
 endFrame(now,cpuMs,rendered,active){
  if(!this.recorder)return;const started=performance.now();if(!active||!rendered){if(!active)this.recorder.pause('inactive');return;}
  const r=this.app.renderer,graphics=this.snapshot();
  const capped=this.recorder.record({now,cpuMs,renderCpuMs:r.profiler?.renderCpuMs??null,game:this.app.game,graphics,render:{draw_calls:r.compatibility?null:r.drawCalls??null,canvas_draw_operations:r.compatibility?r.drawCalls:null,triangles:r.compatibility?null:r.triangles??null,textures:r.renderer?.info?.memory?.textures??null,geometries:r.renderer?.info?.memory?.geometries??null,main_render_passes:r.renderPasses??null,shadow_draw_calls:r.compatibility?null:r.shadowDraws??null,shadow_render_passes:null,texture_bytes_estimate:r.textureMemory??null}});
  if(now>=this.nextHUD){this.nextHUD=now+500;const el=document.getElementById('benchmark-watermark');if(el){const seconds=Math.floor(this.recorder.activeMs/1000),stats=this.recorder.phaseStats[this.recorder.lastPhase].frame;el.textContent=`● BENCHMARK MODE${this.stress?' / STRESS':''}\n${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} · ${stats.sum?Math.round(1000*stats.count/stats.sum):'…'} FPS${this.stress?' · '+this.stress.phase:''}`;}}
  if(now>=this.nextCheckpoint){this.nextCheckpoint=now+60000;const run=()=>this.checkpoint();if(globalThis.requestIdleCallback)requestIdleCallback(run,{timeout:2000});else setTimeout(run,0);}
  this.overhead.add(performance.now()-started);if(capped||this.stress?.done)void this.stop(capped?'duration_limit':'stress_complete').catch(e=>this.notify(e.message));
 }
 checkpoint(){
  if(!this.recorder||this.checkpointPromise)return this.checkpointPromise;const recorder=this.recorder,t=performance.now(),report=recorder.report({now:this.frameNow??t,reason:'checkpoint',interrupted:true});this.checkpointMax=Math.max(this.checkpointMax??0,performance.now()-t);
  this.checkpointPromise=this.store.put('active',report).catch(()=>{}).finally(()=>{this.checkpointPromise=null;});return this.checkpointPromise;
 }
 async startStress(){
  if(this.enabled||this.app.playing||this.saving)throw new Error('Start the stress test from the main menu with Benchmark Mode off');
  const app=this.app;await Promise.resolve(app.renderer.ready);this.savedStress={game:app.game,config:app.config,resultShown:app.resultShown};
  try{
   app.game=new Game({...app.config,mode:'tdm',loadout:{...app.store.data.loadout}},{seed:STRESS_SCENARIO.seed});app.renderer.setArena(app.game.arena);await app.renderer.prepareMatch?.(app.game);this.stress=new StressSequence();app.playing=true;app.resultShown=false;app.accumulator=0;app.pending=emptyInput();app.last=0;app.framePacer.reset();app.input.reset();app.input.active=false;app.ui.play();
   await this.start('scripted',{...STRESS_SCENARIO,map:app.game.config.map,difficulty:app.game.config.difficulty,loadout:{...app.game.config.loadout}});
  }catch(e){this.restoreStress();throw e;}
 }
 stressInput(){return this.stress?.input(this.app.game);}
 restoreStress(){const saved=this.savedStress;if(!saved)return;this.stress=null;this.savedStress=null;this.app.game=saved.game;this.app.config=saved.config;this.app.resultShown=saved.resultShown;this.app.renderer.setArena(saved.game.arena);this.app.renderer.weaponKey='';this.app.playing=false;this.app.last=0;this.app.accumulator=0;this.app.pending=emptyInput();this.app.input.reset();this.app.input.active=false;this.app.framePacer.reset();this.app.ui.menu();}
 syncUI(){
  const toggle=document.getElementById('benchmark-toggle');if(toggle){toggle.checked=this.enabled;toggle.disabled=this.saving;}
  document.getElementById('benchmark-watermark')?.classList.toggle('hidden',!this.enabled);
  const stress=document.getElementById('benchmark-stress');if(stress)stress.disabled=this.enabled||this.app.playing||this.saving;
 }
 bindUI(){
  const toggle=document.getElementById('benchmark-toggle');if(!toggle)return;toggle.onchange=()=>this.toggle(toggle.checked).catch(e=>{this.notify(e.message);this.syncUI();});
  document.getElementById('benchmark-stress').onclick=()=>this.startStress().catch(e=>this.notify(e.message));
  document.getElementById('benchmark-export').onclick=()=>this.uploader.exportLatest().catch(e=>this.notify(e.message));
  document.getElementById('benchmark-retry').onclick=async()=>{try{for(const row of await this.store.list('report:'))if(row.value.state!=='uploaded'){row.value.next_attempt=0;await this.store.put(row.key,row.value);}this.uploader.kick();}catch(e){this.notify(e.message);}};
  document.getElementById('benchmark-setup').onclick=async()=>{
   const endpoint=await this.uploader.configuredEndpoint();this.app.ui.modal('BENCHMARK UPLOAD SETUP','ONE-TIME PAIRING','<label class="field-label">Upload endpoint<input id="benchmark-endpoint" type="url" placeholder="https://your-worker.workers.dev" autocomplete="off"></label><label class="field-label">One-time pairing code<input id="benchmark-code" type="password" autocomplete="off"></label><p>The signing key stays in this browser. GitHub credentials stay on the server.</p>',[['PAIR THIS BROWSER',async()=>{const code=document.getElementById('benchmark-code').value;document.getElementById('benchmark-code').value='';try{const url=document.getElementById('benchmark-endpoint').value;const pending=await this.store.get('pairing');if(pending?.endpoint===url.replace(/\/$/,''))await this.uploader.finishPairing(code,pending);else await this.uploader.pair(url,code);this.app.ui.closeModal();this.notify('Upload setup complete. Reports will upload automatically.');}catch(e){this.notify(e.message);}},true],['CANCEL',()=>this.app.ui.closeModal()]]);document.getElementById('benchmark-endpoint').value=endpoint;
  };
  this.syncUI();
 }
}
