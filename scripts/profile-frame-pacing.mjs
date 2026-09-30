import {FramePacer} from '../dist/js/frame-pacer.js';

const seconds=20,rows=[];
for(const refreshHz of [30,45,60,75,90,120,144])for(const targetFPS of [30,60]){
 const pacer=new FramePacer();let previousTime=0,previousFrames=0,currentFrames=0;
 for(let i=0;i<refreshHz*seconds;i++){
  const now=1000+i*1000/refreshHz;
  if(!previousTime||now-previousTime>=1000/targetFPS-1){previousFrames++;previousTime=now;}
  if(pacer.accept(now,targetFPS))currentFrames++;
 }
 rows.push({refreshHz,targetFPS,previousAcceptedPerSecond:previousFrames/seconds,currentAcceptedPerSecond:currentFrames/seconds,expectedAcceptedPerSecond:Math.min(refreshHz,targetFPS)});
}
console.log(JSON.stringify({measurement:'Synthetic animation timestamps; no browser, GPU or physical device benchmark',durationSeconds:seconds,rows},null,2));
