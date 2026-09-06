import {readdir,readFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {makeCube,makeCylinder,makeSphere} from '../dist/js/geometry.js';
import {roundedBox,tube,leafCard,rockMesh} from '../dist/js/meshes.js';
import {TEXTURE_FILES} from '../dist/js/textures.js';
const root=resolve('dist');let files=0;
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,item.name);if(item.isDirectory()){await walk(p);continue;}if(!p.endsWith('.js'))continue;files++;const result=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const text=await readFile(p,'utf8');for(const match of text.matchAll(/(?:from\s+|import\s*)['"](\.\.?\/[^'"]+)['"]/g))await access(resolve(dirname(p),match[1].split('?')[0]));}}
await walk(root);const html=await readFile(resolve(root,'index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))await access(resolve(root,match[1].split('?')[0]));
const manifest=JSON.parse(await readFile(resolve(root,'manifest.webmanifest'),'utf8'));assert.equal(manifest.orientation,'landscape');assert.equal(manifest.display,'standalone');for(const i of manifest.icons)await access(resolve(root,i.src));
for(const make of [makeCube,makeCylinder,makeSphere,roundedBox,tube,leafCard,rockMesh]){const v=make();assert(v.every(Number.isFinite));assert.equal(v.length%24,0);for(let i=0;i<v.length;i+=24){const a=[v[i+8]-v[i],v[i+9]-v[i+1],v[i+10]-v[i+2]],b=[v[i+16]-v[i],v[i+17]-v[i+1],v[i+18]-v[i+2]],n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];assert(n[0]*v[i+3]+n[1]*v[i+4]+n[2]*v[i+5]>=-.00001,'Inward triangle winding');}}
for(const file of TEXTURE_FILES)await access(resolve(root,'assets',file));
const sw=await readFile(resolve(root,'sw.js'),'utf8');for(const m of sw.matchAll(/'\.\/([^']+)'/g))await access(resolve(root,m[1]));
for(const file of await readdir(resolve(root,'js')))if(file.endsWith('.js'))assert(sw.includes(`'./js/${file}'`),`Offline shell missing ${file}`);
console.log(`Validated ${files} JavaScript modules, geometry winding, local assets and Home Screen manifest.`);
