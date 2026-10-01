"""Native Blender material graphs and offline Cycles bakes for the whole game.

The colour, normal and packed physical atlases come from the same graphs, so
stone joints, fabric weave and rust affect light as well as colour. No source
photographs or runtime canvas painting is required.
"""
import bpy
import math
from pathlib import Path


def math_node(n, l, op, a, b=0):
    node = n.new('ShaderNodeMath'); node.operation = op
    for value, socket in ((a, node.inputs[0]), (b, node.inputs[1])):
        if hasattr(value, 'node'): l.new(value, socket)
        else: socket.default_value = value
    return node.outputs[0]


def mix(n, l, factor, a, b):
    node = n.new('ShaderNodeMixRGB'); node.blend_type = 'MIX'
    for value, socket in ((factor, node.inputs[0]), (a, node.inputs[1]), (b, node.inputs[2])):
        if hasattr(value, 'node'): l.new(value, socket)
        else: socket.default_value = value
    return node.outputs[0]


def noise(n, l, uv, scale, detail=3, distortion=0):
    node = n.new('ShaderNodeTexNoise')
    node.inputs['Scale'].default_value = scale; node.inputs['Detail'].default_value = detail
    node.inputs['Roughness'].default_value = .72; node.inputs['Distortion'].default_value = distortion
    l.new(uv, node.inputs['Vector']); return node.outputs['Fac']


def ramp(n, l, fac, stops):
    node = n.new('ShaderNodeValToRGB'); r = node.color_ramp
    for e in list(r.elements)[2:]: r.elements.remove(e)
    for i, (position, color) in enumerate(stops):
        e = r.elements[i] if i < 2 else r.elements.new(position)
        e.position = position; e.color = (*color[:3], color[3] if len(color) > 3 else 1)
    l.new(fac, node.inputs[0]); return node.outputs['Color']


# Linear-light shader colours. Atlas order retains the existing surface IDs.
PALETTE = [(.30,.31,.30),(.56,.52,.43),(.47,.42,.32),(.34,.29,.23),
           (.044,.048,.05),(.24,.18,.11),(.48,.36,.21),(.25,.24,.21),
           (.28,.30,.31),(.42,.43,.39),(.26,.12,.045),(.28,.105,.038),
           (.12,.18,.075),(.12,.20,.07),(.44,.40,.32),(.29,.28,.23)]


def surface_graph(mat, tile, hero=False):
    mat.use_nodes = True; n = mat.node_tree.nodes; l = mat.node_tree.links; n.clear()
    uv = n.new('ShaderNodeUVMap'); uv.uv_map = 'MaterialUV'; vector = uv.outputs[0]
    macro = noise(n,l,vector,4.1,4,.35); micro = noise(n,l,vector,190 if hero else 110,2)
    base = (.50,.51,.52) if hero else PALETTE[tile]
    colour = mix(n,l,macro,(*[c*.68 for c in base],1),(*[c*1.22 for c in base],1))
    height = math_node(n,l,'ADD',math_node(n,l,'MULTIPLY',macro,.07),math_node(n,l,'MULTIPLY',micro,.025))
    rough = math_node(n,l,'ADD',math_node(n,l,'MULTIPLY',micro,.12),.74)
    occlusion = math_node(n,l,'ADD',math_node(n,l,'MULTIPLY',macro,.06),.94)
    if not hero and tile in (1,2,3,14):
        brick = n.new('ShaderNodeTexBrick'); l.new(vector,brick.inputs['Vector'])
        brick.inputs['Scale'].default_value = 4 if tile != 14 else 7
        brick.inputs['Brick Width'].default_value = .6 if tile != 14 else .5
        brick.inputs['Row Height'].default_value = .29 if tile != 14 else .5
        brick.inputs['Mortar Size'].default_value = .011 if tile != 14 else .006
        brick.inputs['Mortar Smooth'].default_value = .006
        brick.inputs['Color1'].default_value = (*[c*.91 for c in base],1)
        brick.inputs['Color2'].default_value = (*[c*1.12 for c in base],1)
        brick.inputs['Mortar'].default_value = (*[c*.5 for c in base],1)
        if tile == 14: brick.offset = 0
        # Plaster exposes a restrained amount of its masonry, not a brick wall.
        colour = mix(n,l,.22 if tile==1 else .76,colour,brick.outputs['Color'])
        height = math_node(n,l,'SUBTRACT',height,math_node(n,l,'MULTIPLY',brick.outputs['Fac'],.20))
        occlusion = math_node(n,l,'SUBTRACT',occlusion,math_node(n,l,'MULTIPLY',brick.outputs['Fac'],.22))
    if not hero and tile in (0,4,5,6,7,15):
        cells=n.new('ShaderNodeTexVoronoi');cells.feature='DISTANCE_TO_EDGE'
        cells.inputs['Scale'].default_value=32 if tile in (0,4) else 19
        l.new(vector,cells.inputs['Vector'])
        flecks=ramp(n,l,cells.outputs['Distance'],[(0,(.15,.15,.15)),(.027,(.65,.65,.65)),(.12,(1,1,1))])
        colour=mix(n,l,.12 if tile in (0,6) else .22,colour,flecks)
        height=math_node(n,l,'ADD',height,math_node(n,l,'MULTIPLY',cells.outputs['Distance'],.19))
    if (not hero and tile==10) or (hero and tile==1):
        stretch=n.new('ShaderNodeVectorMath');stretch.operation='MULTIPLY';stretch.inputs[1].default_value=(2,20,1)
        l.new(vector,stretch.inputs[0]);grain=noise(n,l,stretch.outputs[0],3.5,4,2)
        colour=mix(n,l,grain,(*[c*.63 for c in base],1),(*[c*1.30 for c in base],1))
        height=math_node(n,l,'MULTIPLY',grain,.09);rough=math_node(n,l,'ADD',math_node(n,l,'MULTIPLY',micro,.12),.64)
    if (not hero and tile==9) or (hero and tile in (2,3)):
        wave=[]
        for axis in ('X','Y'):
            w=n.new('ShaderNodeTexWave');w.wave_type='BANDS';w.bands_direction=axis
            w.inputs['Scale'].default_value=86;w.inputs['Distortion'].default_value=.4
            l.new(vector,w.inputs['Vector']);wave.append(w.outputs['Fac'])
        weave=math_node(n,l,'MULTIPLY',*wave)
        colour=mix(n,l,math_node(n,l,'MULTIPLY',weave,.09),colour,(.28,.29,.26,1))
        height=math_node(n,l,'MULTIPLY',weave,.027 if hero else .065)
        rough=math_node(n,l,'ADD',math_node(n,l,'MULTIPLY',micro,.055),.87)
    if not hero and tile==11:
        rust=ramp(n,l,macro,[(.25,(.08,.045,.02)),(.51,(.34,.10,.025)),(.7,(.17,.12,.07))])
        colour=rust;rough=math_node(n,l,'ADD',math_node(n,l,'MULTIPLY',macro,.14),.76)
    if not hero and tile in (12,13):
        colour=mix(n,l,macro,(.055,.08,.025,1),(.18,.26,.095,1))
    if (not hero and tile==8) or (hero and tile==0):
        scratches=n.new('ShaderNodeTexWave');scratches.wave_type='BANDS';scratches.bands_direction='Y'
        scratches.inputs['Scale'].default_value=125;scratches.inputs['Distortion'].default_value=18
        l.new(vector,scratches.inputs['Vector'])
        fine=math_node(n,l,'MULTIPLY',scratches.outputs['Fac'],.018)
        height=math_node(n,l,'ADD',height,fine)
        rough=math_node(n,l,'ADD',math_node(n,l,'MULTIPLY',micro,.16),.54 if hero else .61)
    # Original source photography is input to Blender's material, as in a
    # conventional game-art workflow. It is baked with the authored height,
    # physical response and low-frequency colour into a new runtime atlas.
    source=Path(__file__).resolve().parents[2]/'dist/assets'/('weapon-finishes.webp' if hero else 'surfaces-atlas.webp')
    image=bpy.data.images.load(str(source),check_existing=True);image.pack();image.use_fake_user=True
    tex=n.new('ShaderNodeTexImage');tex.image=image;tex.extension='EXTEND'
    atlas=n.new('ShaderNodeVectorMath');atlas.operation='MULTIPLY_ADD';cols=2 if hero else 4
    atlas.inputs[1].default_value=(1/cols,1/cols,1);atlas.inputs[2].default_value=(tile%cols/cols,(cols-1-tile//cols)/cols,0)
    l.new(vector,atlas.inputs[0]);l.new(atlas.outputs[0],tex.inputs['Vector'])
    colour=mix(n,l,.12,tex.outputs['Color'],colour)
    bsdf=n.new('ShaderNodeBsdfPrincipled');l.new(colour,bsdf.inputs['Base Color']);l.new(rough,bsdf.inputs['Roughness'])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.25 if hero else .52
    bump.inputs['Distance'].default_value=.007 if hero else .036;l.new(height,bump.inputs['Height']);l.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
    output=n.new('ShaderNodeOutputMaterial');l.new(bsdf.outputs[0],output.inputs['Surface'])
    orm=n.new('ShaderNodeCombineXYZ');l.new(occlusion,orm.inputs[0]);l.new(rough,orm.inputs[1]);l.new(macro,orm.inputs[2])
    emit=n.new('ShaderNodeEmission');target=n.new('ShaderNodeTexImage');n.active=target
    return n,l,output,bsdf,emit,target,colour,orm.outputs[0]


def bake_atlas(scene, out, name, columns, hero=False):
    mesh=bpy.data.meshes.new(name+' / material bake grid');verts=[];faces=[]
    for tile in range(columns*columns):
        x=tile%columns;y=tile//columns;i=len(verts)
        verts.extend(((x*2,y*2,0),(x*2+1,y*2,0),(x*2+1,y*2+1,0),(x*2,y*2+1,0)));faces.append((i,i+1,i+2,i+3))
    mesh.from_pydata(verts,[],faces);mesh.update();mesh.uv_layers.new(name='MaterialUV');mesh.uv_layers.new(name='BakeUV')
    local=mesh.uv_layers['MaterialUV'];bake=mesh.uv_layers['BakeUV'];mesh.uv_layers.active=bake;bake.active_render=True
    for tile,poly in enumerate(mesh.polygons):
        for li,uv in zip(poly.loop_indices,((0,0),(1,0),(1,1),(0,1))):
            local.data[li].uv=uv;bake.data[li].uv=((tile%columns+uv[0])/columns,(columns-1-tile//columns+uv[1])/columns)
        poly.material_index=tile
    obj=bpy.data.objects.new(name+' / baking',mesh);scene.collection.objects.link(obj)
    images={suffix:bpy.data.images.new(name+'-'+suffix,width=1024,height=1024,alpha=False) for suffix in ('albedo','normal','orm')}
    for suffix,img in images.items():img.colorspace_settings.name='sRGB' if suffix=='albedo' else 'Non-Color';img.use_fake_user=True
    graphs=[]
    for tile in range(columns*columns):
        mat=bpy.data.materials.new(name+' / authored surface '+str(tile));mesh.materials.append(mat);graphs.append(surface_graph(mat,tile,hero))
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    scene.render.bake.use_clear=True;scene.render.bake.margin=0
    for suffix in ('albedo','normal','orm'):
        for n,l,output,bsdf,emit,target,colour,packed in graphs:
            target.image=images[suffix];n.active=target
            if suffix=='normal':l.new(bsdf.outputs[0],output.inputs['Surface'])
            else:l.new(colour if suffix=='albedo' else packed,emit.inputs['Color']);l.new(emit.outputs[0],output.inputs['Surface'])
        bpy.ops.object.bake(type='NORMAL' if suffix=='normal' else 'EMIT')
        img=images[suffix];img.filepath_raw=str(out/(img.name+'.png'));img.file_format='PNG';img.save();img.pack()
    obj.hide_render=True;obj.hide_set(True)
    print('BAKED_NATIVE_MATERIALS',name,flush=True)


def bake_auxiliary(scene,out,name,columns,kind):
    """UV-space Blender shader bakes for cutout vegetation, clouds and effects."""
    mesh=bpy.data.meshes.new(name+' / bake plane');mesh.from_pydata([(-1,-1,0),(1,-1,0),(1,1,0),(-1,1,0)],[],[(0,1,2,3)]);mesh.update()
    mesh.uv_layers.new(name='MaterialUV');mesh.uv_layers.new(name='BakeUV')
    for key in ('MaterialUV','BakeUV'):
        layer=mesh.uv_layers[key]
        for li,uv in zip(mesh.polygons[0].loop_indices,((0,0),(1,0),(1,1),(0,1))):layer.data[li].uv=uv
    mesh.uv_layers.active=mesh.uv_layers['BakeUV'];mesh.uv_layers['BakeUV'].active_render=True
    obj=bpy.data.objects.new(name+' / baking',mesh);scene.collection.objects.link(obj)
    mat=bpy.data.materials.new(name+' / native shader');mat.use_nodes=True;mesh.materials.append(mat)
    n=mat.node_tree.nodes;l=mat.node_tree.links;n.clear();uv=n.new('ShaderNodeUVMap');uv.uv_map='MaterialUV'
    global_sep=n.new('ShaderNodeSeparateXYZ');l.new(uv.outputs[0],global_sep.inputs[0])
    tile=math_node(n,l,'ADD',math_node(n,l,'FLOOR',math_node(n,l,'MULTIPLY',global_sep.outputs[0],columns)),math_node(n,l,'MULTIPLY',math_node(n,l,'FLOOR',math_node(n,l,'MULTIPLY',math_node(n,l,'SUBTRACT',1,global_sep.outputs[1]),columns)),columns))
    x=math_node(n,l,'FRACT',math_node(n,l,'MULTIPLY',global_sep.outputs[0],columns))
    y=math_node(n,l,'FRACT',math_node(n,l,'MULTIPLY',global_sep.outputs[1],columns))
    local=n.new('ShaderNodeCombineXYZ');l.new(x,local.inputs[0]);l.new(y,local.inputs[1]);vector=local.outputs[0]
    macro=noise(n,l,vector,6.5,5,.35);micro=noise(n,l,vector,47,2)
    if kind=='clouds':
        cloudy=ramp(n,l,macro,[(.39,(.11,.27,.46)),(.54,(.60,.65,.66)),(.68,(.83,.84,.81))])
        colour=mix(n,l,math_node(n,l,'MULTIPLY',y,.23),cloudy,(.07,.19,.34,1));alpha=1
    else:
        dx=math_node(n,l,'SUBTRACT',x,.5);dy=math_node(n,l,'SUBTRACT',y,.5)
        radius=math_node(n,l,'SQRT',math_node(n,l,'ADD',math_node(n,l,'MULTIPLY',dx,dx),math_node(n,l,'MULTIPLY',dy,dy)))
        fade=math_node(n,l,'MAXIMUM',math_node(n,l,'SUBTRACT',1,math_node(n,l,'MULTIPLY',radius,2.0)),0)
        alpha=math_node(n,l,'POWER',fade,2.5)
        if kind=='foliage':
            # Narrow leaf silhouettes and fine veins are authored as a shader
            # graph, then baked once into the cutout atlas.
            wave=n.new('ShaderNodeTexWave');wave.wave_type='BANDS';wave.bands_direction='Y';wave.inputs['Scale'].default_value=18;wave.inputs['Distortion'].default_value=5;l.new(vector,wave.inputs['Vector'])
            edges=math_node(n,l,'MULTIPLY',math_node(n,l,'ABSOLUTE',dx),2)
            spine=math_node(n,l,'SUBTRACT',1,math_node(n,l,'POWER',edges,.65))
            alpha=math_node(n,l,'MULTIPLY',math_node(n,l,'GREATER_THAN',spine,math_node(n,l,'MULTIPLY',wave.outputs['Fac'],.45)),math_node(n,l,'GREATER_THAN',fade,.05))
            colour=mix(n,l,micro,(.035,.065,.015,1),(.21,.32,.09,1))
        else:
            smoke=mix(n,l,macro,(.48,.49,.47,1),(.93,.92,.86,1))
            flash=mix(n,l,fade,(1,.16,.015,1),(1,.92,.66,1))
            crater=mix(n,l,fade,(.40,.38,.32,1),(.025,.022,.018,1))
            is_flash=math_node(n,l,'LESS_THAN',math_node(n,l,'ABSOLUTE',math_node(n,l,'SUBTRACT',tile,1)),.1)
            is_contact=math_node(n,l,'LESS_THAN',math_node(n,l,'ABSOLUTE',math_node(n,l,'SUBTRACT',tile,2)),.1)
            is_crater=math_node(n,l,'GREATER_THAN',tile,2.5)
            colour=mix(n,l,is_flash,smoke,flash);colour=mix(n,l,is_contact,colour,(0,0,0,1));colour=mix(n,l,is_crater,colour,crater)
            alpha=math_node(n,l,'MULTIPLY',alpha,math_node(n,l,'ADD',math_node(n,l,'MULTIPLY',macro,.65),.35))
    if kind in ('foliage','clouds'):
        source=Path(__file__).resolve().parents[2]/'dist/assets'/('foliage-atlas.webp' if kind=='foliage' else 'horizon.webp')
        original=bpy.data.images.load(str(source),check_existing=True);original.pack();original.use_fake_user=True
        tex=n.new('ShaderNodeTexImage');tex.image=original;l.new(uv.outputs[0],tex.inputs['Vector'])
        colour=mix(n,l,.08,tex.outputs['Color'],colour)
        if kind=='foliage':alpha=tex.outputs['Alpha']
    emit=n.new('ShaderNodeEmission');output=n.new('ShaderNodeOutputMaterial');l.new(emit.outputs[0],output.inputs['Surface'])
    target=n.new('ShaderNodeTexImage');n.active=target
    colour_image=bpy.data.images.new(name+'-colour',width=1024 if kind=='foliage' else 512,height=1024 if kind=='foliage' else 256 if kind=='clouds' else 512,alpha=False)
    alpha_image=bpy.data.images.new(name+'-alpha',width=colour_image.size[0],height=colour_image.size[1],alpha=False)
    colour_image.colorspace_settings.name='sRGB';alpha_image.colorspace_settings.name='Non-Color'
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    for img,value in ((colour_image,colour),(alpha_image,alpha)):
        target.image=img;n.active=target
        if hasattr(value,'node'):l.new(value,emit.inputs['Color'])
        else:emit.inputs['Color'].default_value=(value,value,value,1)
        bpy.ops.object.bake(type='EMIT')
    # Assemble channels from the native Cycles bakes without modifying imagery.
    import numpy as np
    pixels=np.empty(colour_image.size[0]*colour_image.size[1]*4,dtype=np.float32);colour_image.pixels.foreach_get(pixels)
    mask=np.empty_like(pixels);alpha_image.pixels.foreach_get(mask);pixels[3::4]=mask[0::4]
    image=bpy.data.images.new(name,width=colour_image.size[0],height=colour_image.size[1],alpha=True)
    image.colorspace_settings.name='sRGB';image.pixels.foreach_set(pixels);image.use_fake_user=True
    image.filepath_raw=str(out/(name+'.png'));image.file_format='PNG';image.save();image.pack()
    obj.hide_render=True;obj.hide_set(True)
    return image
