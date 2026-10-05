import {readFile,writeFile} from 'node:fs/promises';
import {writeParts} from './asset-parts.mjs';
const root='dist/assets/audio',manifest=JSON.parse(await readFile(root+'/manifest.json','utf8'));
manifest.files=await writeParts(await readFile(root+'/sound-bank.bin'),root+'/sound-bank');
await writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('dist/js/audio-files.js',`// Original, offline rendered sound design.\nexport const AUDIO_BANK=${JSON.stringify({sounds:manifest.sounds,bytes:manifest.bytes})};\nexport const AUDIO_PARTS=${JSON.stringify(manifest.files.map(f=>'audio/'+f.path))};\nexport const AUDIO_FILES=[...AUDIO_PARTS,'audio/manifest.json'];\n`);
console.log('Packed audio',manifest.files.length,'segments');
