// Advance one complete offline release before each published checkpoint.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const release=process.argv[2];if(!/^[1-9]\d*$/.test(release??''))throw new Error('Pass a numeric release');
const root=resolve('dist'),modules=(await readdir(`${root}/js`)).filter(n=>n.endsWith('.js')).sort();
for(const name of ['index.html',...modules.map(n=>`js/${n}`)]){
 const path=`${root}/${name}`;let text=await readFile(path,'utf8');text=text.replace(/\?v=\d+/g,`?v=${release}`).replace(/const RELEASE='\d+'/g,`const RELEASE='${release}'`);await writeFile(path,text);
}
const assets=(await readdir(`${root}/assets`)).filter(n=>/\.(webp|png|jpg)$/.test(n));
const shell=['./','./index.html','./style.css','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest',...modules.map(n=>`./js/${n}`),'./vendor/three.module.min.js','./vendor/three.core.min.js',...assets.map(n=>`./assets/${n}`)];
const path=`${root}/sw.js`;let text=await readFile(path,'utf8');text=text.replace(/const RELEASE='\d+'/g,`const RELEASE='${release}'`).replace(/const SHELL=\[[^;]+;/,`const SHELL=[${shell.map(p=>`'${p}'`).join(',')}];`);await writeFile(path,text);
console.log(`Prepared release ${release}: ${modules.length} game modules and ${assets.length} textures.`);
