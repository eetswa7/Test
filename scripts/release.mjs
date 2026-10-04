// Advance one complete offline release before each published checkpoint.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {TEXTURE_FILES} from '../dist/js/textures.js';
import {BLENDER_FILES} from '../dist/js/blender-assets.js';
const release=process.argv[2];if(!/^[1-9]\d*$/.test(release??''))throw new Error('Pass a numeric release');
const root=resolve('dist'),modules=(await readdir(`${root}/js`)).filter(n=>n.endsWith('.js')).sort();
for(const name of ['index.html',...modules.map(n=>`js/${n}`)]){
 const path=`${root}/${name}`;let text=await readFile(path,'utf8');text=text.replace(/\?v=\d+/g,`?v=${release}`).replace(/const RELEASE='\d+'/g,`const RELEASE='${release}'`).replace(/(['"]\.\/[^?'"\n]+\.js)(['"])/g,`$1?v=${release}$2`);await writeFile(path,text);
}
const assets=[...TEXTURE_FILES,...BLENDER_FILES];
const shell=['./','./index.html','./style.css','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest',...modules.map(n=>`./js/${n}`),'./vendor/three.module.min.js','./vendor/three.core.min.js','./vendor/gzip.js',...assets.map(n=>`./assets/${n}`)];
const path=`${root}/sw.js`;let text=await readFile(path,'utf8');text=text.replace(/const RELEASE='\d+'/g,`const RELEASE='${release}'`).replace(/const SHELL=\[[^;]+;/,`const SHELL=[${shell.map(p=>`'${p}'`).join(',')}];`);await writeFile(path,text);
console.log(`Prepared release ${release}: ${modules.length} game modules and ${assets.length} textures.`);
