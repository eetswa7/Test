import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../authoring/blender/source/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
const data=Buffer.concat(await Promise.all(manifest.files.map(file=>readFile(new URL(file.path,root)))));
if(data.length!==manifest.bytes||createHash('sha256').update(data).digest('hex')!==manifest.sha256)throw Error('Blender source integrity check failed');
await writeFile(new URL('../authoring/blender/breachline-assets.blend',import.meta.url),data);
console.log(`Restored editable Blender source: ${data.length} verified bytes.`);
