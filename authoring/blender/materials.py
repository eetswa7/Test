"""Editable Blender PBR graphs and offline Cycles bakes for the whole game.

The original diffuse artwork supplies material identity. Relief and physical
response follow that artwork: a visible mortar joint must not acquire a
second, unrelated procedural brick joint. Small surface detail is authored in
physical units, with restrained albedo variation and material-specific roughness.
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


# Atlas order is a runtime contract. Ranges are perceptual roughness; millimetre
# relief is baked into tangent normals, never added to runtime geometry.
SURFACES = (
    ('cast concrete',       .87, .065, .014, .24),
    ('weathered plaster',   .89, .055, .010, .22),
    ('limestone masonry',   .86, .070, .018, .32),
    ('fired brick',         .85, .080, .014, .32),
    ('asphalt aggregate',   .94, .035, .006, .16),
    ('compacted earth',     .97, .025, .010, .24),
    ('sand',                .96, .035, .006, .18),
    ('crushed gravel',      .92, .065, .018, .32),
    ('worn steel',          .52, .090, .002, .18),
    ('woven canvas',        .91, .035, .003, .22),
    ('seasoned timber',     .76, .100, .010, .30),
    ('oxidised sheet metal',.67, .050, .006, .28),
    ('forest floor',        .97, .025, .013, .25),
    ('dry grass',           .96, .030, .010, .24),
    ('terracotta roof',     .85, .060, .014, .30),
    ('weathered rock',      .87, .080, .020, .32),
)


def source_artwork(n, l, vector, tile, hero):
    """Read one source quadrant without sampling a neighbouring material."""
    art = Path(__file__).parent / 'textures'
    bank = ('architecture', 'ground', 'equipment', 'natural')[tile // 4] if not hero else 'equipment'
    # Replacement artwork is used only for its approved first quadrant. The
    # established soil/wood/fabric artwork keeps its exact source identity.
    if not hero and tile == 4: bank = 'road-surface'
    if (not hero and tile == 8) or (hero and tile == 0): bank = 'weapon-steel'
    image = bpy.data.images.load(str(art / (bank + '.png')), check_existing=True)
    image.pack(); image.use_fake_user = True
    tex = n.new('ShaderNodeTexImage'); tex.image = image; tex.extension = 'EXTEND'
    tex.label = 'Original diffuse artwork / neutral illumination'
    source_tile = tile % 4 if not hero else (0, 2, 1, 0)[tile]
    # A half-texel inset matters at the quadrant boundary: the old mapping mixed
    # beige plaster into concrete edges and gravel into the edge of asphalt.
    inset = .5 / image.size[0]
    atlas = n.new('ShaderNodeVectorMath'); atlas.operation = 'MULTIPLY_ADD'
    atlas.inputs[1].default_value = (.5 - 2 * inset, .5 - 2 * inset, 1)
    atlas.inputs[2].default_value = (source_tile % 2 * .5 + inset,
                                   (1 - source_tile // 2) * .5 + inset, 0)
    l.new(vector, atlas.inputs[0]); l.new(atlas.outputs[0], tex.inputs['Vector'])
    grey = n.new('ShaderNodeRGBToBW'); l.new(tex.outputs['Color'], grey.inputs[0])
    return tex.outputs['Color'], grey.outputs[0]


def surface_graph(mat, tile, hero=False):
    mat.use_nodes = True; n = mat.node_tree.nodes; l = mat.node_tree.links; n.clear()
    uv = n.new('ShaderNodeUVMap'); uv.uv_map = 'MaterialUV'; vector = uv.outputs[0]
    artwork, grey = source_artwork(n, l, vector, tile, hero)
    micro = noise(n, l, vector, 230 if hero else 180, 2)
    macro = noise(n, l, vector, 3.4, 2, .12)
    if hero:
        # Vertex colour owns wood, polymer and metal colour in the combined
        # viewmodel. Near-white texture modulation keeps their finish distinct.
        colour = mix(n, l, grey, (.78, .78, .78, 1), (.98, .98, .98, 1))
        if tile == 1:
            colour = mix(n, l, grey, (.67, .67, .67, 1), (.98, .98, .98, 1))
        elif tile == 3:
            # Polymer gets a moulded stipple, not the same cracked steel
            # photograph stretched across grips, magazines and rail covers.
            grey = micro
            colour = mix(n, l, micro, (.84, .84, .84, 1), (.92, .92, .92, 1))
        centre, variation, distance, strength = (
            (.72, .065, .0015, .16), (.80, .075, .004, .22),
            (.91, .035, .002, .20), (.81, .055, .001, .12))[tile]
        relief = .09 if tile in (1, 2) else .025
        mat['surface_identity'] = ('machined weapon steel', 'wood furniture', 'tactical fabric', 'moulded polymer')[tile]
    else:
        identity, centre, variation, distance, strength = SURFACES[tile]
        mat['surface_identity'] = identity
        # Two percent broad colour change breaks uniform repeats without
        # drowning the authored aggregate/paint in coloured noise.
        modulation = mix(n, l, macro, (.985, .985, .985, 1), (1.015, 1.015, 1.015, 1))
        product = n.new('ShaderNodeMixRGB'); product.blend_type = 'MULTIPLY'
        product.inputs[0].default_value = 1
        l.new(artwork, product.inputs[1]); l.new(modulation, product.inputs[2]); colour = product.outputs[0]
        relief = .11 if tile in (0, 1, 4, 5, 6, 8, 9, 11, 13) else .20

    height = math_node(n, l, 'ADD', math_node(n, l, 'MULTIPLY', grey, relief),
                       math_node(n, l, 'MULTIPLY', micro, .016 if hero else .023))
    rough = math_node(n, l, 'MINIMUM',
                      math_node(n, l, 'ADD', centre, math_node(n, l, 'MULTIPLY', micro, variation)), 1)
    # Cavity AO is deliberately weak. Static lighting supplies broad shadows;
    # the packed map should only deepen pores and joints by a few percent.
    cavity = math_node(n, l, 'MAXIMUM', math_node(n, l, 'SUBTRACT', .32, grey), 0)
    occlusion = math_node(n, l, 'SUBTRACT', 1, math_node(n, l, 'MULTIPLY', cavity, .14 if hero else .22))
    exposed_metal = 1
    if not hero and tile == 11:
        # Rust is a dielectric, while exposed zinc/steel remains metallic.
        # Derive the mask from the actual orange corrosion in the artwork.
        rgb = n.new('ShaderNodeSeparateColor'); rgb.mode = 'RGB'; l.new(artwork, rgb.inputs[0])
        warm = math_node(n, l, 'MAXIMUM', math_node(n, l, 'SUBTRACT', rgb.outputs[0], rgb.outputs[2]), 0)
        rust = math_node(n, l, 'MINIMUM', math_node(n, l, 'MULTIPLY', warm, 8), 1)
        rough = math_node(n, l, 'MINIMUM', math_node(n, l, 'ADD', rough, math_node(n, l, 'MULTIPLY', rust, .23)), 1)
        exposed_metal = math_node(n, l, 'SUBTRACT', 1, math_node(n, l, 'MULTIPLY', rust, .88))

    bsdf=n.new('ShaderNodeBsdfPrincipled');l.new(colour,bsdf.inputs['Base Color']);l.new(rough,bsdf.inputs['Roughness'])
    if not hero and tile in (8, 11):
        if hasattr(exposed_metal, 'node'): l.new(exposed_metal, bsdf.inputs['Metallic'])
        else: bsdf.inputs['Metallic'].default_value = exposed_metal
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=strength
    bump.inputs['Distance'].default_value=distance;l.new(height,bump.inputs['Height']);l.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
    bump.label = 'Restrained millimetre relief / colour-aligned wear'
    mat['relief_distance_metres'] = distance; mat['roughness_centre'] = centre
    output=n.new('ShaderNodeOutputMaterial');l.new(bsdf.outputs[0],output.inputs['Surface'])
    orm=n.new('ShaderNodeCombineXYZ');l.new(occlusion,orm.inputs[0]);l.new(rough,orm.inputs[1])
    if hasattr(exposed_metal, 'node'): l.new(exposed_metal, orm.inputs[2])
    else: orm.inputs[2].default_value = exposed_metal
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
    resolution=4096 if not hero else 4096
    images={suffix:bpy.data.images.new(name+'-'+suffix,width=resolution,height=resolution,alpha=False) for suffix in ('albedo','normal','orm')}
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
