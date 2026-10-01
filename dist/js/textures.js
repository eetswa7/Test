import {BAKED_FILES} from './blender-files.js?v=49';
const ORIGINAL_FILES=['surfaces-atlas.webp','foliage-atlas.webp','horizon.webp','weapon-finishes.webp'];
export const TEXTURE_FILES=[...ORIGINAL_FILES,...Object.values(BAKED_FILES).flat()];
export async function loadImages(){
 const original=await Promise.all(ORIGINAL_FILES.map(file=>new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Could not load ${file}`));image.src=new URL(`../assets/${file}`,import.meta.url).href;
 })));
 const baked=await Promise.all(Object.entries(BAKED_FILES).map(async([key,files])=>{
  const segments=await Promise.all(files.map(async file=>{const r=await fetch(new URL(`../assets/${file}`,import.meta.url));if(!r.ok)throw Error(`Could not load ${file}`);return r.arrayBuffer();}));
  const url=URL.createObjectURL(new Blob(segments,{type:'image/png'}));
  try{return [key,await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error(`Could not decode Blender ${key}`));image.src=url;})];}
  finally{URL.revokeObjectURL(url);}
 }));
 return {surfaces:original[0],leaves:original[1],horizon:original[2],weapon:original[3],...Object.fromEntries(baked)};
}
