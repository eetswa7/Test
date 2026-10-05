import {readFile,writeFile,mkdir,readdir,rm,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {basename,dirname} from 'node:path';
export async function writeParts(data,prefix,chunkBytes=2097150){
 if(!Number.isSafeInteger(chunkBytes)||chunkBytes<1)throw Error('Invalid asset segment size');
 await mkdir(dirname(prefix),{recursive:true});
 const files=[];
 for(let offset=0,i=0;offset<data.length;offset+=chunkBytes,i++){
  const chunk=data.subarray(offset,offset+chunkBytes),path=`${prefix}.part${String(i).padStart(3,'0')}.bin`;
  await writeFile(path+'.tmp',chunk);await rename(path+'.tmp',path);
 files.push({path:basename(path),bytes:chunk.length,sha256:createHash('sha256').update(chunk).digest('hex')});
 }
 const current=new Set(files.map(file=>file.path)),stem=basename(prefix)+'.part';
 for(const file of await readdir(dirname(prefix)))if(file.startsWith(stem)&&/^\d+\.bin$/.test(file.slice(stem.length))&&!current.has(file))await rm(`${dirname(prefix)}/${file}`);
 return files;
}
export async function readRuntimeLibrary(){
 const root=new URL('../dist/assets/',import.meta.url),{LIBRARY_FILES}=await import('../dist/js/blender-files.js');
 return Buffer.concat(await Promise.all(LIBRARY_FILES.map(path=>readFile(new URL(path,root)))));
}
