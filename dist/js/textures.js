export const TEXTURE_FILES=['surfaces-atlas.webp','foliage-atlas.webp','horizon.webp'];
export async function loadImages(){
 const images=await Promise.all(TEXTURE_FILES.map(file=>new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Could not load ${file}`));image.src=new URL(`../assets/${file}`,import.meta.url).href;
 })));
 return {surfaces:images[0],leaves:images[1],horizon:images[2]};
}
