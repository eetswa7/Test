// All tiers keep the same simulation, silhouettes and viewmodel assets.
export const QUALITY = Object.freeze({
  low: { pixels:850000, scale:.7, dpr:1.35, shadow:0, shadowHz:0, shadowHalf:24, effects:70, smokeLayers:4, foliage:.55, range:65, anisotropy:2 },
  medium: { pixels:1400000, scale:.9, dpr:1.65, shadow:1024, shadowHz:15, shadowHalf:24, effects:130, smokeLayers:5, foliage:.8, range:85, anisotropy:4 },
  high: { pixels:2200000, scale:1, dpr:1.85, shadow:1536, shadowHz:24, shadowHalf:28, effects:200, smokeLayers:6, foliage:1, range:110, anisotropy:4 },
  ultra: { pixels:2600000, scale:1, dpr:2, shadow:2048, shadowHz:30, shadowHalf:30, effects:200, smokeLayers:6, foliage:1, range:125, anisotropy:8 }
});
const tiers=Object.keys(QUALITY);
export class GraphicsQuality {
  constructor(requested='auto'){this.reset(requested);}
  reset(requested='auto'){
    this.requested=QUALITY[requested]?requested:'auto';
    this.tier=this.requested==='auto'?'medium':this.requested;
    this.scale=1;this.warmup=2;this.slow=0;this.fast=0;this.cooldown=0;this.frameMs=16.67;this.targetFPS=60;this.reason='Measuring gameplay';
  }
  sample(elapsed,cpuMs,gpuMs,active=true,targetFPS=60){
    // Never learn from menus, background gaps, debugger stalls or map loading.
    if(!active||!Number.isFinite(elapsed)||elapsed<=0||elapsed>.25){this.slow=this.fast=0;return;}
    targetFPS=targetFPS===30?30:60;
    const budget=1000/targetFPS;
    if(targetFPS!==this.targetFPS){this.targetFPS=targetFPS;this.frameMs=budget;this.warmup=2;this.slow=this.fast=this.cooldown=0;}
    if(this.warmup>0){this.warmup-=elapsed;return;}
    this.frameMs+=(elapsed*1000-this.frameMs)*.04;
    this.cooldown=Math.max(0,this.cooldown-elapsed);
    const gpuValid=Number.isFinite(gpuMs)&&gpuMs>0;
    const overloaded=this.frameMs>budget*1.17||(gpuValid&&gpuMs>budget*.93)||cpuMs>budget*.9;
    // Promotion requires measured work headroom at the chosen frame budget.
    const headroom=this.frameMs<budget*1.05&&cpuMs>0&&cpuMs<budget*.6&&(!gpuValid||gpuMs<budget*.66);
    this.slow=overloaded?this.slow+elapsed:Math.max(0,this.slow-elapsed);
    this.fast=headroom?this.fast+elapsed:0;
    if(this.cooldown>0)return;
    if(this.slow>2.5){
      if(cpuMs>budget*.9&&(!gpuValid||gpuMs<budget*.72))this.lowerTier();
      else if(this.scale>.75){this.scale=Math.max(.7,Math.round((this.scale-.08)*100)/100);this.reason='Reducing pixel cost';}
      else this.lowerTier();
      this.slow=this.fast=0;this.cooldown=3;
    }else if(this.fast>18){
      if(this.scale<1){this.scale=Math.min(1,Math.round((this.scale+.04)*100)/100);this.reason='Recovering resolution';}
      else if(this.requested==='auto'&&this.tier!=='ultra'){
        this.tier=tiers[tiers.indexOf(this.tier)+1];this.reason='Measured headroom';
      }
      this.fast=0;this.cooldown=8;
    }
  }
  lowerTier(){const index=tiers.indexOf(this.tier);if(index>0){this.tier=tiers[index-1];this.scale=Math.min(1,this.scale+.12);this.reason='Reducing scene cost';}else{this.scale=Math.max(.6,this.scale-.05);this.reason='Minimum scene cost';}}
}
