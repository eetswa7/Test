export const TEXTURE_FILES=['surfaces-atlas.webp','foliage-atlas.webp','horizon.webp'];
export async function loadImages(){
 const images=await Promise.all(TEXTURE_FILES.map(file=>new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Could not load ${file}`));image.src=new URL(`../assets/${file}`,import.meta.url).href;
 })));
 return {surfaces:images[0],leaves:images[1],horizon:images[2]};
}
export class TexturePack {
 constructor(gl){this.gl=gl;this.ready=loadImages().then(images=>{this.images=images;this.surfaces=this.array(images.surfaces,4,256);this.leaves=this.array(images.leaves,2,512);this.horizon=this.image(images.horizon);return this;});}
 array(image,columns,size){
  const gl=this.gl,texture=gl.createTexture(),canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d',{willReadFrequently:true});
  gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,size,size,columns*columns,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  for(let i=0;i<columns*columns;i++){
   c.clearRect(0,0,size,size);c.drawImage(image,(i%columns)*image.width/columns,Math.floor(i/columns)*image.height/columns,image.width/columns,image.height/columns,0,0,size,size);
   gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,size,size,1,gl.RGBA,gl.UNSIGNED_BYTE,c.getImageData(0,0,size,size).data);
  }
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,columns===4?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,columns===4?gl.REPEAT:gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D_ARRAY,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  return texture;
 }
 image(image){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.MIRRORED_REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
 bind(program,location){const gl=this.gl;for(const [unit,name,target,texture]of [[1,'uSurfaces',gl.TEXTURE_2D_ARRAY,this.surfaces],[2,'uLeaves',gl.TEXTURE_2D_ARRAY,this.leaves],[3,'uEnvironment',gl.TEXTURE_2D,this.horizon]]){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(target,texture);gl.uniform1i(location(program,name),unit);}}
}
