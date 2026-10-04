import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validateReport} from '../server/benchmark/validation.js';
import {TimingStats,round} from '../dist/js/benchmark-stats.js';

export function groups(report){
 const result=new Map();
 for(const context of report.contexts){const f=context.stats.steady.frame_time,g=context.graphics;if(!f.count)continue;
  const key=JSON.stringify([report.session.kind,report.session.scenario?.id??null,context.map.id,context.mode,context.difficulty,context.players,g.requested_quality,g.effective_quality,g.frame_cap,g.effective_frame_cap??g.frame_cap,g.width,g.height,g.render_scale,g.device_pixel_ratio,g.fov,g.camera_motion]);
  let row=result.get(key);if(!row){row={key,map:context.map.name,mode:context.mode,graphics:g,stats:new TimingStats()};result.set(key,row);}
  const s=row.stats;if(!f.histogram)throw new Error('Steady frame histograms are required for comparisons');for(const [i,n,sum]of f.histogram){s.counts[i]+=n;s.sums[i]+=sum;s.count+=n;s.sum+=sum;}s.min=Math.min(s.min,f.min_ms);s.max=Math.max(s.max,f.max_ms);
 }
 return result;
}
export function compare(before,after){
 before=validateReport(before);after=validateReport(after);const old=groups(before),next=groups(after),rows=[];
 for(const [key,b]of next){const a=old.get(key);if(!a){rows.push({map:b.map,mode:b.mode,status:'no_matching_baseline',graphics:b.graphics});continue;}
  const aFPS=a.stats.fps(),bFPS=b.stats.fps(),aStats=a.stats.summary(),bStats=b.stats.summary();rows.push({map:b.map,mode:b.mode,graphics:b.graphics,status:a.stats.count<300||b.stats.count<300?'short_sample':'comparable_context',before:{frames:a.stats.count,fps:aFPS,frame_time:aStats},after:{frames:b.stats.count,fps:bFPS,frame_time:bStats},mean_frame_change_percent:round((bStats.mean_ms/aStats.mean_ms-1)*100),p95_frame_change_percent:round((bStats.p95_ms/aStats.p95_ms-1)*100),fps_cap_limited:aFPS.average>=(b.graphics.effective_frame_cap??b.graphics.frame_cap)*.95&&bFPS.average>=(b.graphics.effective_frame_cap??b.graphics.frame_cap)*.95});
 }
 return {schema:'breachline.benchmark.comparison.v1',before_session:before.session.id,after_session:after.session.id,before_build:before.build,after_build:after.build,environment_changed:JSON.stringify(before.environment)!==JSON.stringify(after.environment),scripted_scenario_changed:JSON.stringify(before.session.scenario)!==JSON.stringify(after.session.scenario),rows,notes:['Warm-up is excluded. Percentiles and 1% lows use the same v1 histogram estimator.','Each session stays independent. Map, mode, population, graphics, resolution, FPS cap and FOV must match.','Normal gameplay conditions can differ. A cap-limited result does not measure unused rendering headroom.','Use conditions, activity, render_samples and timeline to assess combat intensity and long-session changes.']};
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.length!==4)throw new Error('Usage: node scripts/compare-benchmarks.mjs baseline.json candidate.json');const reports=await Promise.all(process.argv.slice(2).map(async p=>JSON.parse(await readFile(p,'utf8'))));console.log(JSON.stringify(compare(...reports),null,2));}
