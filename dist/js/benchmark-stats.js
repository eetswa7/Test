// Fixed-size histograms: no per-frame allocation, sort, or growing frame list.
// Percentiles and the slowest 1% are explicitly histogram estimates.
export const HISTOGRAM_BINS=1040;
export function bucket(ms){
 if(ms<64)return Math.min(511,Math.floor(ms*8));
 if(ms<256)return 512+Math.floor((ms-64)*2);
 if(ms<512)return 896+Math.floor((ms-256)/2);
 return Math.min(1039,1024+Math.floor(Math.log2(ms/512)));
}
export function bounds(i){
 if(i<512)return [i/8,(i+1)/8];
 if(i<896)return [64+(i-512)/2,64+(i-511)/2];
 if(i<1024)return [256+(i-896)*2,256+(i-895)*2];
 return [512*2**(i-1024),512*2**(i-1023)];
}
export const round=(v,digits=3)=>Number.isFinite(v)?Number(v.toFixed(digits)):null;
export class TimingStats {
 constructor(){this.counts=new Uint32Array(HISTOGRAM_BINS);this.sums=new Float64Array(HISTOGRAM_BINS);this.reset();}
 reset(){this.count=0;this.sum=0;this.min=Infinity;this.max=0;this.counts.fill(0);this.sums.fill(0);}
 add(ms){if(!Number.isFinite(ms)||ms<0)return;const i=bucket(ms);this.count++;this.sum+=ms;this.min=Math.min(this.min,ms);this.max=Math.max(this.max,ms);this.counts[i]++;this.sums[i]+=ms;}
 percentile(p){if(!this.count)return null;const wanted=Math.max(1,Math.ceil(this.count*p));let n=0;for(let i=0;i<HISTOGRAM_BINS;i++){n+=this.counts[i];if(n>=wanted)return Math.min(this.max,bounds(i)[1]);}return this.max;}
 lowFPS(){if(!this.count||!this.sum)return null;let left=Math.max(1,Math.ceil(this.count*.01)),n=left,sum=0;for(let i=HISTOGRAM_BINS-1;i>=0&&left;i--){const take=Math.min(left,this.counts[i]);if(take)sum+=this.sums[i]*take/this.counts[i];left-=take;}return sum>0?1000*n/sum:null;}
 summary(includeHistogram=false){const value={count:this.count,mean_ms:round(this.count?this.sum/this.count:null),min_ms:round(this.count?this.min:null),max_ms:round(this.count?this.max:null),p50_ms:round(this.percentile(.5)),p90_ms:round(this.percentile(.9)),p95_ms:round(this.percentile(.95)),p99_ms:round(this.percentile(.99))};if(includeHistogram)value.histogram=Array.from(this.counts,(n,i)=>n?[i,n,round(this.sums[i])]:null).filter(Boolean);return value;}
 fps(){return {average:round(this.sum?this.count*1000/this.sum:null),median:round(this.count&&this.percentile(.5)>0?1000/this.percentile(.5):null),low_1_percent:round(this.lowFPS())};}
}
export class FrameStats {
 constructor(){this.frame=new TimingStats();this.cpu=new TimingStats();this.renderCPU=new TimingStats();this.gpu=new TimingStats();this.spikes=0;this.stutters=0;}
 add(frame,cpu,renderCPU,cap){this.frame.add(frame);this.cpu.add(cpu);this.renderCPU.add(renderCPU);if(frame>Math.max(50,2000/cap))this.spikes++;if(frame>1500/cap)this.stutters++;}
 summary(histogram=true){return {fps:this.frame.fps(),frame_time:this.frame.summary(histogram),cpu_frame:this.cpu.summary(),cpu_render:this.renderCPU.summary(),gpu:this.gpu.summary(),spikes:this.spikes,stutters:this.stutters};}
}
