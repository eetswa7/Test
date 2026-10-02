"""Lossless transport compression of native Blender bakes. Pixels are unchanged."""
from pathlib import Path
from PIL import Image
import os
import tempfile

root=Path('dist/assets/blender')
for name in ('surfaces-albedo','weapons-albedo','foliage','sky','effects','surfaces-normal','surfaces-orm','weapons-normal','weapons-orm'):
    source=Image.open(root/(name+'.png')).convert('RGBA')
    target=root/(name+'.webp')
    fd,temporary=tempfile.mkstemp(dir=root,suffix='.tmp');os.close(fd)
    source.save(temporary,format='WEBP',lossless=True,exact=True,method=6)
    decoded=Image.open(temporary).convert('RGBA')
    if source.tobytes()!=decoded.tobytes():raise RuntimeError('Texture pixels changed: '+name)
    os.replace(temporary,target)
print('Verified nine lossless WebP Blender textures.')
