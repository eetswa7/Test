import {readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {writeParts} from './asset-parts.mjs';
const root='dist/assets/blender',name='breachline-library.glb';
const raw=await readFile(`${root}/${name}`),packed=gzipSync(raw,{level:9,mtime:0});
await writeFile(`${root}/${name}.gz`,packed);
const manifest=JSON.parse(await readFile(`${root}/manifest.json`,'utf8'));
for(const f of await readdir(root))if(/\.part\d+\.bin$/.test(f))await rm(`${root}/${f}`);
manifest.files=await writeParts(packed,`${root}/breachline-library`);
const libraryFiles=manifest.files.map(f=>`blender/${f.path}`),bakedFiles={};
manifest.library={parts:manifest.files.map(f=>f.path),bytes:packed.length,unpackedBytes:raw.length,sha256:createHash('sha256').update(packed).digest('hex')};
for(const [key,filename] of Object.entries({surfaceNormal:'surfaces-normal',surfaceORM:'surfaces-orm',weaponNormal:'weapons-normal',weaponORM:'weapons-orm'})){
 const parts=await writeParts(await readFile(`${root}/${filename}.png`),`${root}/${filename}`);
 manifest.files.push(...parts);bakedFiles[key]=parts.map(f=>`blender/${f.path}`);
}
await writeFile('dist/js/blender-files.js',`// Generated lossless asset segments. Rebuild with npm run assets:blender.\nexport const LIBRARY_FILES=${JSON.stringify(libraryFiles)};\nexport const BAKED_FILES=${JSON.stringify(bakedFiles)};\n`);
manifest.downloadBytes=manifest.files.reduce((n,f)=>n+f.bytes,0);
await writeFile(`${root}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
const source=await readFile('authoring/blender/breachline-assets.blend');
const sourceParts=await writeParts(source,'authoring/blender/source/breachline-assets');
await writeFile('authoring/blender/source/manifest.json',JSON.stringify({bytes:source.length,sha256:createHash('sha256').update(source).digest('hex'),files:sourceParts},null,2)+'\n');
console.log(`Packed Blender library: ${(raw.length/1048576).toFixed(2)} -> ${(packed.length/1048576).toFixed(2)} MiB, lossless.`);
