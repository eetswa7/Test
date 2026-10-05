"""Original Blender assets. Run via npm run assets:blender (Blender 4.0+).

Game coordinates are metres, Y up, forward -Z. Blender coordinates are X,-Z,Y.
The glTF exporter restores game axes. Collision and animation belong to the game.
"""
import bpy
import json
import math
import sys
import hashlib
from pathlib import Path
from collections import defaultdict
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

# Distribution builds can embed Python while a cloud shell supplies a different
# stdlib path. Add the matching system extension directory only when it exists.
extension_dir = Path('/usr/lib') / f'python{sys.version_info.major}.{sys.version_info.minor}' / 'lib-dynload'
if extension_dir.exists():
    sys.path.append(str(extension_dir))
system_modules = Path('/usr/lib/python3/dist-packages')
if system_modules.exists():
    sys.path.append(str(system_modules))

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'dist/assets/blender'
SOURCE = Path(__file__).parent
OUT.mkdir(parents=True, exist_ok=True)
INPUT = json.loads((SOURCE / 'rig-input.json').read_text())
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 1
scene.cycles.use_denoising = False
scene.render.bake.margin = 0
scene.view_settings.view_transform = 'Standard'
library = bpy.data.collections.new('Runtime meshes (metres)')
scene.collection.children.link(library)
preview = bpy.data.collections.new('Asset gallery')
scene.collection.children.link(preview)
mesh_assets = {}
manifest = {'schema': 1, 'generator': 'Blender ' + bpy.app.version_string,
            'units': 'metres', 'up': 'Y', 'forward': '-Z',
            'ao': '8 deterministic hemisphere rays, 0.18 m radius for weapons',
            'meshes': {}, 'weapons': {}, 'files': []}
conversion = Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))


def linear(c):
    return c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4


def evaluated_geometry(obj):
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    mesh.calc_loop_triangles()
    verts = [v.co.copy() for v in mesh.vertices]
    tris = [tuple(t.vertices) for t in mesh.loop_triangles]
    bpy.data.meshes.remove(mesh)
    bpy.data.objects.remove(obj, do_unlink=True)
    return verts, tris


def bevel_box(width=.035, segments=2):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    if hasattr(obj.data,'use_auto_smooth'):obj.data.use_auto_smooth = True
    mod = obj.modifiers.new('Manufactured bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.affect = 'EDGES'
    mod.harden_normals = True
    mod = obj.modifiers.new('Weighted face normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    return evaluated_geometry(obj)


def lathe(rings, sides=16, phase=0, folds=0):
    # Ring profiles are in game Y-up coordinates. All closed meshes wind outward.
    verts = []
    for ri,(y,rx,rz) in enumerate(rings):
        for i in range(sides):
            a=i*math.tau/sides+phase
            f=1+folds*math.sin(i*2.3+ri*1.9)*math.sin(math.pi*ri/(len(rings)-1))
            verts.append(Vector((math.cos(a)*rx*f,y,math.sin(a)*rz*f)))
    tris=[]
    for r in range(len(rings)-1):
        for i in range(sides):
            a=r*sides+i;b=r*sides+(i+1)%sides;c=b+sides;d=a+sides
            tris.extend(((a,d,c),(a,c,b)))
    for r,top in ((0,False),(len(rings)-1,True)):
        centre=len(verts);verts.append(Vector((0,rings[r][0],0)))
        for i in range(sides):
            a=r*sides+i;b=r*sides+(i+1)%sides
            tris.append((centre,b,a) if top else (centre,a,b))
    return verts,tris


def sphere(segments=16, rings=10):
    profile=[(-.5*math.cos(r*math.pi/rings),max(.001,.5*math.sin(r*math.pi/rings)),
              max(.001,.5*math.sin(r*math.pi/rings))) for r in range(rings+1)]
    return lathe(profile,segments)


def tube(sides=20):
    verts=[];tris=[]
    for radius,y in ((.5,-.5),(.5,.5),(.38,-.5),(.38,.5)):
        for i in range(sides):
            a=i*math.tau/sides;verts.append(Vector((math.cos(a)*radius,y,math.sin(a)*radius)))
    for i in range(sides):
        j=(i+1)%sides
        for a,b,c,d in ((i,i+sides,j+sides,j),(i+2*sides,j+2*sides,j+3*sides,i+3*sides),
                         (i,j,j+2*sides,i+2*sides),(i+sides,i+3*sides,j+3*sides,j+sides)):
            tris.extend(((a,b,c),(a,c,d)))
    return verts,tris


BASE = {}
# Native Blender modifier evaluation creates the edge topology, not shader fakes.
for key,w,s in [('box',.035,2),('world',.006,1),('soft',.09,2),('flat',.001,1)]:
    v,t=bevel_box(w,s)
    BASE[key]=([conversion.inverted() @ p for p in v],t)
BASE['sphere']=sphere(12,8)
BASE['cylinder']=lathe([(-.5,.48,.48),(-.48,.5,.5),(.48,.5,.5),(.5,.48,.48)],16)
BASE['tube']=tube()


def assemble(pieces):
    verts=[];tris=[];colors=[]
    for geom,position,scale,color in pieces:
        v,t=geom;start=len(verts)
        for p in v: verts.append(Vector((p.x*scale[0]+position[0],p.y*scale[1]+position[1],p.z*scale[2]+position[2])))
        tris.extend(tuple(i+start for i in tri) for tri in t)
        colors.extend([tuple(linear(c) for c in color)]*len(v))
    return verts,tris,colors


def cavity(verts,tris,radius=.32):
    bvh=BVHTree.FromPolygons(verts,tris,all_triangles=True)
    normals=[Vector((0,0,0)) for _ in verts]
    for a,b,c in tris:
        n=(verts[b]-verts[a]).cross(verts[c]-verts[a])
        for i in (a,b,c): normals[i]+=n
    values=[]
    for p,n in zip(verts,normals):
        if n.length<1e-8: values.append(1);continue
        n.normalize();t=n.cross(Vector((0,1,0)) if abs(n.y)<.9 else Vector((1,0,0))).normalized();b=n.cross(t)
        occluded=0
        for i in range(8):
            z=(i+.5)/8;a=i*2.3999632297;r=math.sqrt(1-z*z)
            direction=(t*math.cos(a)*r+b*math.sin(a)*r+n*z).normalized()
            hit,_,_,d=bvh.ray_cast(p+n*.00008,direction,radius)
            if hit is not None: occluded+=(1-d/radius)*z
        values.append(max(.42,1-occluded*.16))
    return values


def object_mesh(name,verts,tris,colors=None,bake=True,radius=.32,physical=None):
    previous=mesh_assets.get(name)
    if previous:
        old_mesh=previous.data;bpy.data.objects.remove(previous,do_unlink=True)
        if old_mesh.users==0:bpy.data.meshes.remove(old_mesh)
    occlusion=cavity(verts,tris,radius) if bake else [1]*len(verts)
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata([conversion@p for p in verts],[],tris)
    mesh.update()
    if hasattr(mesh,'use_auto_smooth'):
        mesh.use_auto_smooth = True
        mesh.auto_smooth_angle = .5
    # Hard topology retains face normals. Rounded/folded assets are smoothed below.
    uv=mesh.uv_layers.new(name='UVMap')
    color=mesh.color_attributes.new(name='BakedColourAO',type='FLOAT_COLOR',domain='CORNER')
    mesh.color_attributes.active_color=color
    if physical:mesh.uv_layers.new(name='BreachMaterial')
    # CustomData allocation invalidates previously held RNA layer references.
    # Reacquire after adding all layers so UV writes cannot corrupt vertex colour.
    uv=mesh.uv_layers['UVMap'];color=mesh.color_attributes['BakedColourAO']
    mesh.uv_layers.active=uv;uv.active_render=True
    rm=mesh.uv_layers.get('BreachMaterial')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index;p=verts[vi]
            n=conversion.inverted().to_3x3()@poly.normal
            axis=max(range(3),key=lambda i:abs(n[i]))
            coord=(p.z,p.y) if axis==0 else (p.x,p.z) if axis==1 else (p.x,p.y)
            uv.data[li].uv=(coord[0]+.5,coord[1]+.5)
            c=colors[vi] if colors else (1,1,1)
            color.data[li].color=(*[x*occlusion[vi] for x in c],1)
            if rm:rm.data[li].uv=(physical[vi][0],1-physical[vi][1]) # glTF flips UV V.
    obj=bpy.data.objects.new(name,mesh);library.objects.link(obj)
    obj['blender_asset']=True;obj['units']='metres';obj['baked_ao']=bake
    mesh_assets[name]=obj
    manifest['meshes'][name]={'triangles':len(tris),'vertices':len(verts),'vertexMaterial':bool(physical)}
    return obj


def register(name,near,far=None,smooth=False):
    for level,geometry in (('near',near),('far',far or near)):
        obj=object_mesh(name+'__'+level,*geometry)
        if smooth:
            for p in obj.data.polygons:p.use_smooth=True
    return name


def pieces_model(name,pieces,far=None):
    register(name,assemble(pieces),assemble(far) if far else None)


WHITE=(1,1,1);DARK=(.56,.56,.56);EDGE=(.88,.88,.88)
register('architecture',BASE['world'],BASE['flat'])
register('hard',BASE['box'],BASE['world'])
register('soft',BASE['soft'],BASE['box'])
register('sphere',BASE['sphere'],sphere(10,6),True)
register('cylinder',BASE['cylinder'],lathe([(-.5,.5,.5),(.5,.5,.5)],10),True)
register('tube',BASE['tube'],tube(12))
register('surface',([Vector((-.5,0,.5)),Vector((.5,0,.5)),Vector((.5,0,-.5)),Vector((-.5,0,-.5))],[(0,1,2),(0,2,3)]))
register('torso',lathe([(-.5,.33,.35),(-.33,.38,.42),(-.12,.44,.46),(.16,.48,.5),(.39,.49,.42),(.5,.35,.28)],16,folds=.045),
         lathe([(-.5,.33,.35),(.12,.48,.5),(.4,.49,.4),(.5,.35,.28)],10),True)
register('limb',lathe([(-.5,.32,.34),(-.37,.40,.39),(-.25,.43,.42),(0,.5,.5),(.26,.48,.43),(.38,.44,.44),(.5,.42,.38)],12,folds=.05),
         lathe([(-.5,.32,.34),(0,.5,.5),(.5,.42,.38)],8),True)
boot=[(BASE['soft'],(0,.02,.02),(.83,.94,.60),WHITE),
      (BASE['soft'],(0,-.20,-.08),(.95,.58,.83),WHITE),
      (BASE['box'],(0,-.40,0),(1,.2,1),DARK),
      (BASE['soft'],(0,-.13,-.29),(.82,.45,.38),WHITE)]
for y in (-.05,.09,.23):boot.append((BASE['flat'],(0,y,-.298),(.58,.055,.027),DARK))
pieces_model('boot',boot,boot[:3])
vest=[(BASE['soft'],(0,0,.04),(.99,.99,.72),WHITE),
      (BASE['box'],(0,.05,-.37),(.78,.75,.2),EDGE)]
for x in (-.31,0,.31):
    vest.append((BASE['soft'],(x,-.23,-.40),(.28,.38,.18),WHITE))
    vest.append((BASE['flat'],(x,-.1,-.493),(.25,.038,.014),DARK))
for y in (.24,.10,-.04):vest.append((BASE['flat'],(0,y,-.479),(.82,.022,.025),DARK))
pieces_model('vest',vest,vest[:2])
pack=[(BASE['soft'],(0,0,.08),(1,1,.76),WHITE),(BASE['soft'],(0,-.17,-.36),(.75,.45,.22),EDGE)]
for x in (-.3,.3):pack.append((BASE['flat'],(x,0,-.485),(.05,.82,.024),DARK))
pieces_model('pack',pack,pack[:2])
head=[(sphere(18,12),(0,.025,.04),(.84,.95,.80),WHITE),
      (BASE['soft'],(0,-.26,-.16),(.60,.37,.55),WHITE),
      (BASE['soft'],(0,.01,-.35),(.18,.31,.25),EDGE)]
for x in (-.40,.40):head.append((BASE['sphere'],(x,0,.04),(.19,.32,.22),WHITE))
pieces_model('head',head,head[:2])
helmet=lathe([(-.5,.49,.48),(-.29,.5,.5),(.03,.47,.47),(.24,.37,.36),(.43,.18,.18),(.5,.025,.025)],18)
register('helmet',helmet,lathe([(-.5,.49,.48),(-.12,.49,.5),(.34,.31,.30),(.5,.025,.025)],10),True)
glove=[(BASE['soft'],(0,-.02,.08),(.88,.8,.58),WHITE)]
for i in range(4):glove.append((BASE['soft'],(-.31+i*.205,.04,-.27),(.18,.84,.44),WHITE))
glove.append((BASE['sphere'],(.39,-.12,.01),(.21,.48,.45),EDGE))
pieces_model('glove',glove,glove[:1])
crate=[(BASE['world'],(0,0,0),(.94,.94,.94),WHITE)]
for axis in (0,2):
    for side in (-1,1):
        for y in (-.34,0,.34):
            pos=[0,y,0];pos[axis]=side*.483;size=[.99,.09,.035];size[axis]=.035;size[2-axis]=.99
            crate.append((BASE['world'],pos,size,EDGE))
        for k in (-.33,.33):
            pos=[0,0,0];pos[axis]=side*.483;pos[2-axis]=k;size=[.075,.95,.075];size[axis]=.035
            crate.append((BASE['world'],pos,size,DARK))
pieces_model('crate',crate,crate[:1])
for longitudinal in ('x','z'):
    container=[(BASE['world'],(0,0,0),(.97,.97,.97),WHITE)]
    axis=0 if longitudinal=='x' else 2;sideaxis=2-axis
    for side in (-1,1):
        for i in range(13):
            pos=[0,0,0];pos[axis]=-.46+i*.077;pos[sideaxis]=side*.491
            scale=[.018,.93,.018];scale[sideaxis]=.018
            container.append((BASE['world'],pos,scale,EDGE))
    for y in (-.479,.479):container.append((BASE['world'],(0,y,0),(1,.042,1),DARK))
    pieces_model('cargo_'+longitudinal,container,container[:1])
drum=[(BASE['cylinder'],(0,0,0),(.96,.96,.96),WHITE)]
for y in (-.465,-.24,.24,.465):drum.append((BASE['cylinder'],(0,y,0),(1,.048,1),EDGE))
drum.append((BASE['cylinder'],(.18,.483,.04),(.14,.034,.14),DARK))
pieces_model('drum',drum,drum[:1])
rock_v,rock_t=sphere(14,8)
for i,p in enumerate(rock_v):
    p*=.86+.1*math.sin(p.x*13+p.z*9)+.07*math.cos(p.y*17-p.x*7)
register('rock',(rock_v,rock_t),sphere(8,5))
strata=lathe([(-.5,.35,.36),(-.36,.49,.43),(-.26,.45,.47),(-.15,.5,.5),(.04,.42,.47),(.16,.44,.44),(.28,.31,.34),(.5,.18,.19)],12,folds=.055)
register('strata',strata,lathe([(-.5,.4,.4),(-.1,.5,.5),(.24,.35,.4),(.5,.18,.18)],8))
conifer=lathe([(-.5,.35,.35),(-.37,.5,.5),(-.24,.25,.25),(-.22,.42,.42),(-.04,.17,.17),(0,.33,.33),(.18,.11,.11),(.23,.24,.24),(.45,.04,.04),(.5,.002,.002)],12,phase=.12,folds=.1)
conifer_far=lathe([(-.5,.5,.5),(-.18,.26,.26),(-.15,.4,.4),(.13,.13,.13),(.15,.23,.23),(.5,.001,.001)],8)
def crown_colour(geometry):
    v,t=geometry
    return v,t,[tuple(linear(c) for c in (.24+(p.y+.5)*.09,.31+(p.y+.5)*.13,.19+(p.y+.5)*.07)) for p in v]
register('conifer',crown_colour(conifer),crown_colour(conifer_far))
for level,segments in (('near',4),('far',1)):
    verts=[];tris=[]
    for i in range(segments+1):
        y=-.5+i/segments;z=math.sin(i/segments*math.pi)*.07
        verts.extend((Vector((-.5,y,z)),Vector((.5,y,z))))
    for i in range(segments):tris.extend(((i*2,i*2+1,i*2+3),(i*2,i*2+3,i*2+2)))
    obj=object_mesh('leaf__'+level,verts,tris,bake=False)
    for loop in obj.data.loops:
        p=verts[loop.vertex_index];obj.data.uv_layers.active.data[loop.index].uv=(p.x+.5,p.y+.5)


def group_signature(p):
    return p.get('tag','static')

def manufactured_vertex(v,p,key):
    if key not in ('box','flat'):return v
    width=.035 if key=='box' else .001
    dims=(p['w'],p['h'],p['d']);radius=min(.0018,min(dims)*.08)
    return Vector([(math.copysign(d*.5-radius,x)+(x-math.copysign(.5-width,x))*radius/width)/d for x,d in zip(v,dims)])

sys.path.insert(0,str(SOURCE))
from art_geometry import author_shared,hero_part
manifest['props']=author_shared(globals())
from production_assets import author_production
manifest['props']+=author_production(globals())
manifest['artRevision']=4
manifest['authorship']='Original Blender mesh authoring and native Cycles colour/normal/physical bakes'


# Build complete weapon cores, preserving movable component names. Each group is
# welded for a single indexed draw and inherits the exact existing joint matrix.
hand_shape_cache={}
for weapon in INPUT['weapons']:
    record={'name':weapon['name'],'coreCount':weapon['coreCount'],'handCount':len(weapon.get('hands',[]))}
    for section,source_parts in (('groups',weapon['parts']),('hands',weapon.get('hands',[]))):
      groups=defaultdict(list)
      for p in source_parts:groups[group_signature(p)].append(p)
      definitions=[]
      for gi,(signature,parts) in enumerate(groups.items()):
        anchor=parts[0];anchor_matrix=Matrix([anchor['matrix'][i:i+4] for i in range(0,16,4)]).transposed()
        inverse=anchor_matrix.inverted()
        vertices=[];triangles=[];colours=[];physical=[]
        for p in parts:
            key='cylinder' if p.get('mesh')=='cylinder' else 'tube' if p.get('mesh')=='tube' else 'sphere' if p.get('mesh')=='sphere' else 'flat' if p.get('mesh')=='cube' else 'box'
            designed=hero_part(p,BASE)
            if section=='hands':
                hand_kind='sleeve_z' if p.get('tile')==9 and p['d']>.15 else 'palm' if p.get('mesh')=='sphere' and p['w']>.055 and p['h']>.06 and p['d']>.055 else 'finger' if p.get('mesh')=='sphere' and p['w']<.035 else None
                if hand_kind:
                    mesh=mesh_assets[hand_kind+'__near'].data;mesh.calc_loop_triangles()
                    designed=([conversion.inverted()@v.co for v in mesh.vertices],[tuple(t.vertices) for t in mesh.loop_triangles])
            v,t=designed or BASE[key];matrix=Matrix([p['matrix'][i:i+4] for i in range(0,16,4)]).transposed()
            start=len(vertices);vertices.extend(matrix@(q if designed else manufactured_vertex(q,p,key)) for q in v)
            triangles.extend(tuple(i+start for i in tri) for tri i