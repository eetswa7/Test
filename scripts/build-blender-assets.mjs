import {spawnSync} from 'node:child_process';
const run=(command,args)=>{const result=spawnSync(command,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);};
run(process.execPath,['scripts/export-blender-input.mjs']);
run(process.env.BLENDER_BIN??'blender',['--background','--factory-startup','--python-exit-code','1','--python','authoring/blender/build_assets.py',...(process.argv.includes('--reuse-bakes')?['--','--reuse-bakes']:[])]);
run(process.execPath,['scripts/pack-blender-assets.mjs']);
