import {Arena,MAPS} from '../dist/js/maps.js';
import {rng,direction} from '../dist/js/math.js';
const report=[];
for(const map of MAPS){
 const arena=new Arena(map.id),random=rng(730+map.id),rays=[];
 for(let i=0;i<2500;i++)rays.push({o:{x:(random()-.5)*map.size*1.9,y:.7+random()*2.4,z:(random()-.5)*map.size*1.9},d:direction(random()*Math.PI*2,(random()-.5)*.8),limit:80});
 const run=()=>{let candidates=0;const start=performance.now();for(const {o,d,limit}of rays){arena.trace(o,d,limit);candidates+=arena.collisionCells?arena.rayGrid.tested:arena.blocks.length;}return{ms:performance.now()-start,candidates};};
 run();const grid=run(),cells=arena.collisionCells;arena.collisionCells=null;run();const scan=run();arena.collisionCells=cells;
 report.push({map:map.name,rays:rays.length,gridMs:+grid.ms.toFixed(2),fullScanMs:+scan.ms.toFixed(2),candidateReductionPercent:+((1-grid.candidates/scan.candidates)*100).toFixed(1)});
}
console.log(JSON.stringify({scope:'Container CPU ray workload, no iPhone or GPU timing.',report},null,2));
