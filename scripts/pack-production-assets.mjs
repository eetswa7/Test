import {readFile,writeFile} from 'node:fs/promises';
import {writeParts} from './asset-parts.mjs';
const root='dist/assets/production',assets={surfaces:[],weapons:[],lightmaps:[]},files=[];
async function pack(name){const parts=await writeParts(await readFile(`${root}/${name}`),`${root}/${name.replace(/\.[^.]+$/,'')}`);files.push(...parts);return parts.map(p=>'production/'+p.path);}
for(const [bank,count]of [['surfaces',16],['weapons',4]])for(let i=0;i<count;i++){
 const maps={};for(const suffix of ['albedo','normal','orm']){
  const stem=`${bank}-${i}-${suffix}`;
  const fallback=await readFile(`${root}/${stem}.webp`),gpu=await readFile(`${root}/${stem}.btex`);
  if(fallback.length<32||fallback.toString('ascii',8,12)!=='WEBP'||fallback.readUInt32LE(4)+8!==fallback.length)throw Error('Incomplete production fallback: '+stem);
  if(gpu.length<32||gpu.toString('ascii',0,4)!=='BTX1')throw Error('Incomplete production GPU texture: '+stem);
  // Distinct stems keep GPU and fallback containers independently selectable.
  const gpuParts=await writeParts(gpu,`${root}/${stem}-astc`);
  const fallbackParts=await writeParts(fallback,`${root}/${stem}-webp`);
  files.push(...gpuParts,...fallbackParts);maps[suffix]={astc:gpuParts.map(p=>'production/'+p.path),webp:fallbackParts.map(p=>'production/'+p.path)};
 }
 assets[bank].push(maps);
}
for(let i=0;i<16;i++)assets.lightmaps.push(await pack(`lightmap-${i}.webp`));
const manifest=JSON.parse(await readFile(root+'/manifest.json','utf8'));manifest.files=files;manifest.downloadBytes=files.reduce((n,f)=>n+f.bytes,0);
await writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('dist/js/production-files.js',`// Native Cycles bakes with full ASTC mip chains and WebP fallback.\nexport const PRODUCTION_ASSETS=${JSON.stringify(assets)};\nexport const PRODUCTION_FILES=${JSON.stringify([...files.map(f=>'production/'+f.path),'production/manifest.json'])};\n`);
console.log('Packed production artwork',manifest.downloadBytes,'bytes');
