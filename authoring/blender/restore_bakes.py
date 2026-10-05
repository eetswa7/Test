"""Publish complete packed images atomically after Blender finishes saving."""
import bpy
import os
from pathlib import Path

root=Path('dist/assets/blender')
names={'surfaces-albedo','surfaces-normal','surfaces-orm','weapons-albedo','weapons-normal','weapons-orm','foliage','sky','effects'}
for image in bpy.data.images:
    if image.name not in names and not image.name.startswith('lightmap-'):continue
    if not image.packed_file:raise RuntimeError('Missing packed bake: '+image.name)
    data=bytes(image.packed_file.data)
    if data[:8]!=b'\x89PNG\r\n\x1a\n':raise RuntimeError('Invalid packed bake: '+image.name)
    target=root/(image.name+'.png');temporary=target.with_suffix('.png.tmp')
    with temporary.open('wb') as file:file.write(data);file.flush();os.fsync(file.fileno())
    temporary.replace(target)
print('PUBLISHED_PACKED_BAKES',flush=True)
