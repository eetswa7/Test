"""Export bounded WebP fallbacks and real mipmapped ASTC GPU textures.

Blender owns the imagery. This step splits bakes, creates mip levels and performs
transport/GPU compression only. No runtime procedural normal-map generation.
"""
from pathlib import Path
from PIL import Image
import concurrent.futures
import json, math, struct, subprocess, tempfile, hashlib

root=Path('dist/assets/production');root.mkdir(parents=True,exist_ok=True)
bakes=Path('dist/assets/blender');temporary=Path(tempfile.mkdtemp(prefix='breachline-astc-'))
jobs=[]
for bank,columns,count in [('surfaces',4,16),('weapons',2,4)]:
    atlases={suffix:Image.open(bakes/(bank+'-'+suffix+'.png')).convert('RGBA') for suffix in ('albedo','normal','orm')}
    for index in range(count):
        for suffix in atlases:
            image=atlases[suffix];edge=image.width//columns;x=index%columns*edge;y=index//columns*edge
            tile=image.crop((x,y,x+edge,y+edge))
            resolution=1024 if bank=='surfaces' else 2048 if index==0 else 1024
            tile=tile.resize((resolution,resolution),Image.Resampling.LANCZOS)
            jobs.append((bank,index,suffix,tile))

def encode(job):
    bank,index,suffix,tile=job;name=f'{bank}-{index}-{suffix}'
    fallback=tile.resize((512 if bank=='surfaces' else 1024 if index==0 else 512,)*2,Image.Resampling.LANCZOS)
    fallback.save(root/(name+'.webp'),format='WEBP',quality=94,method=6,lossless=suffix=='orm')
    block=4 if suffix=='normal' else 6 if suffix=='albedo' else 8
    # Compressed WebGL uploads cannot flip Y. Match ordinary image textures
    # before encoding every mip, rather than changing metric UVs at runtime.
    tile=tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    mipmaps=[];size=tile.width
    while True:
        source=temporary/(name+f'-{size}.png');target=temporary/(name+f'-{size}.astc')
        tile.save(source)
        cmd=['astcenc','-cs' if suffix=='albedo' else '-cl',str(source),str(target),f'{block}x{block}','-medium','-j','2','-silent']
        # Normal maps keep XY and Z explicitly. Swizzling here would need a
        # different shader decode and corrupt Safari's standard PBR normal path.
        subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL)
        payload=target.read_bytes()
        if len(payload)!=16+math.ceil(size/block)**2*16:raise RuntimeError('Invalid ASTC mip')
        mipmaps.append(payload[16:])
        if size==1:break
        size=max(1,size//2);tile=tile.resize((size,size),Image.Resampling.LANCZOS)
    width=job[3].width
    container=struct.pack('<4sHHBBH',b'BTX1',width,width,block,len(mipmaps),0)
    container+=b''.join(struct.pack('<I',len(m)) for m in mipmaps)+b''.join(mipmaps)
    (root/(name+'.btex')).write_bytes(container)
    return {'name':name,'width':width,'block':block,'mips':len(mipmaps),'astcBytes':len(container),'fallbackBytes':(root/(name+'.webp')).stat().st_size,'sha256':hashlib.sha256(container).hexdigest()}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    records=list(pool.map(encode,jobs))
for p in sorted(bakes.glob('lightmap-*.png')):
    Image.open(p).save(root/(p.stem+'.webp'),format='WEBP',lossless=True,exact=True,method=6)
(root/'manifest.json').write_text(json.dumps({'schema':1,'source':'Blender Cycles native bakes','textures':records,'astcGpuBytes':sum(r['astcBytes'] for r in records),'fallbackDownloadBytes':sum(r['fallbackBytes'] for r in records),'lightmaps':16,'lightmapEncoding':'linear RGBM range 6'},indent=2)+'\n')
print('Production texture compression complete',len(records),flush=True)
