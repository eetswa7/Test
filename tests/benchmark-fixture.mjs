import {BenchmarkRecorder,browserInfo} from '../dist/js/benchmark-recorder.js';
import {BENCHMARK_BUILD} from '../dist/js/benchmark-build.js';
import {MAPS} from '../dist/js/maps.js';
export const fakeGame=()=>({config:{map:0,mode:'tdm',difficulty:'regular'},arena:{info:MAPS[0],indoors:()=>false},actors:[{dead:false},{dead:false}],player:{vx:0,vz:0,dead:false,weapon:{def:{id:0}}},grenades:[],smokes:[]});
export const graphics={requested_quality:'auto',effective_quality:'medium',frame_cap:60,effective_frame_cap:60,render_scale:1,width:1200,height:600,device_pixel_ratio:3,fov:80,camera_motion:true,dynamic_resolution:true,reason:'Measuring gameplay'};
export const render={draw_calls:40,canvas_draw_operations:null,triangles:25000,textures:12,geometries:8,main_render_passes:2,shadow_draw_calls:10,shadow_render_passes:null,texture_bytes_estimate:1024000};
export const makeRecorder=()=>new BenchmarkRecorder({build:BENCHMARK_BUILD,environment:browserInfo({userAgent:'Mozilla/5.0 (iPhone) Version/26.0 Mobile Safari/605.1.15'}),renderer:{backend:'WebGL2',vendor:'WebKit',renderer:'WebKit WebGL',version:'WebGL 2.0',shading_language:'WebGL GLSL ES 3.00'},now:0});
// Synthetic clock observations only. Never save these in benchmarks/.
export function reportFixture(){const r=makeRecorder(),game=fakeGame();for(let i=0;i<=1200;i++)r.record({now:i*1000/60,cpuMs:4,renderCpuMs:2,game,graphics,render});return r.report({now:20000});}
