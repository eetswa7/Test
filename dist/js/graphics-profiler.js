// Non-blocking timer queries. Unsupported/disjoint GPU timings remain null.
export class GraphicsProfiler {
  constructor(gl){
    this.gl=gl;this.extension=gl?.getExtension?.('EXT_disjoint_timer_query_webgl2')??null;
    this.pending=[];this.current=null;this.tick=0;this.gpuMs=null;this.cpuMs=0;this.renderCpuMs=0;
    this.frameP95=0;this.samples=new Float32Array(120);this.count=0;this.cursor=0;this.gpuAge=Infinity;
  }
  begin(){
    const gl=this.gl,ext=this.extension;this.gpuAge++;if(this.gpuAge>120)this.gpuMs=null;
    if(!ext)return;
    if(gl.getParameter(ext.GPU_DISJOINT_EXT)){this.clearQueries();this.gpuMs=null;return;}
    while(this.pending.length&&gl.getQueryParameter(this.pending[0],gl.QUERY_RESULT_AVAILABLE)){
      const query=this.pending.shift(),ms=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(query);
      if(Number.isFinite(ms)&&ms>0){this.gpuMs=this.gpuMs===null?ms:this.gpuMs+(ms-this.gpuMs)*.25;this.gpuAge=0;}
    }
    if(++this.tick%12!==0||this.pending.length>=3)return;
    const query=gl.createQuery();if(!query)return;
    gl.beginQuery(ext.TIME_ELAPSED_EXT,query);this.current=query;
  }
  end(){if(!this.current)return;this.gl.endQuery(this.extension.TIME_ELAPSED_EXT);this.pending.push(this.current);this.current=null;}
  record(cpuMs,elapsed,active){
    this.cpuMs=this.cpuMs?this.cpuMs+(cpuMs-this.cpuMs)*.05:cpuMs;
    if(!active||elapsed<=0||elapsed>.25)return;
    this.samples[this.cursor++%120]=elapsed*1000;this.count=Math.min(120,this.count+1);
    if(this.cursor%120===0){const sorted=Array.from(this.samples.subarray(0,this.count)).sort((a,b)=>a-b);this.frameP95=sorted[Math.floor((sorted.length-1)*.95)];}
  }
  clearQueries(){if(this.current){this.gl.endQuery(this.extension.TIME_ELAPSED_EXT);this.gl.deleteQuery(this.current);this.current=null;}for(const query of this.pending)this.gl.deleteQuery(query);this.pending.length=0;}
  dispose(){this.clearQueries();}
}

// Estimate owned texture storage including mip chains. Driver overhead is unknown.
export function textureBytes(textures){
  let bytes=0;const seen=new Set();
  for(const t of textures){if(!t||seen.has(t))continue;seen.add(t);
    if(t.isCompressedTexture){for(const mip of t.mipmaps??[])bytes+=mip.data?.byteLength??0;continue;}
    const image=t.image;if(!image?.width||!image?.height)continue;
    const componentBytes=t.type===1015?4:t.type===1016?2:1;
    bytes+=image.width*image.height*4*componentBytes*(t.generateMipmaps?4/3:1);
  }return Math.ceil(bytes);
}
