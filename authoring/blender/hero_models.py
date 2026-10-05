"""Original hero modelling: manufactured weapons, anatomical cloth and equipment.

All geometry is authored in the original unit component envelope. The production
builder applies the unchanged rig matrices afterwards. Native negative-space
machining, continuous profiles and sewn garment construction carry the image;
small separate detail meshes are merged into the existing material groups.
"""
import bpy
import math
from mathutils import Vector, Matrix


_component_cache = {}


def _extrude_outline(outline, widths, axis=0):
    """Extrude an ordered planar contour; Blender triangulates the end faces."""
    vertices=[]
    for width in widths:
        for a,b in outline:
            vertices.append(Vector((width,a,b) if axis==0 else (a,width,b)))
    count=len(outline);faces=[tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]
    for i in range(count):
        j=(i+1)%count;faces.append((i,j,j+count,i+count))
    mesh=bpy.data.meshes.new('Hero contour / editable extrusion')
    mesh.from_pydata(vertices,[],faces);mesh.update();mesh.calc_loop_triangles()
    geometry=([p.co.copy() for p in mesh.vertices],[tuple(p.vertices) for p in mesh.loop_triangles])
    bpy.data.meshes.remove(mesh)
    return geometry


def _profile(rings, sides=12, axis=1):
    vertices=[];triangles=[]
    for position,rx,rz,cx,cz in rings:
        for i in range(sides):
            a=math.tau*i/sides
            q=Vector((cx+math.cos(a)*rx,position,cz+math.sin(a)*rz))
            vertices.append(q if axis==1 else Vector((q.x,-q.z,q.y)))
    for row in range(len(rings)-1):
        for i in range(sides):
            a=row*sides+i;b=row*sides+(i+1)%sides
            triangles.extend(((a,a+sides,b+sides),(a,b+sides,b)))
    for row,upper in ((0,False),(len(rings)-1,True)):
        q=Vector((rings[row][3],rings[row][0],rings[row][4]));centre=len(vertices)
        vertices.append(q if axis==1 else Vector((q.x,-q.z,q.y)))
        for i in range(sides):
            a=row*sides+i;b=row*sides+(i+1)%sides
            triangles.append((centre,b,a) if upper else (centre,a,b))
    return vertices,triangles


def _chamfer_profile(rings, axis=2):
    perimeter=((-1,-.70),(-.70,-1),(.70,-1),(1,-.70),(1,.68),(.72,1),(-.72,1),(-1,.68))
    vertices=[];triangles=[]
    for z,rx,ry,cy in rings:
        for x,y in perimeter:vertices.append(Vector((x*rx,y*ry+cy,z)))
    for row in range(len(rings)-1):
        for i in range(8):
            a=row*8+i;b=row*8+(i+1)%8;triangles.extend(((a,b,b+8),(a,b+8,a+8)))
    for row,front in ((0,True),(len(rings)-1,False)):
        centre=len(vertices);vertices.append(Vector((0,rings[row][3],rings[row][0])))
        for i in range(8):
            a=row*8+i;b=row*8+(i+1)%8
            triangles.append((centre,b,a) if front else (centre,a,b))
    if axis==1:vertices=[Vector((q.x,q.z,-q.y)) for q in vertices]
    return vertices,triangles


def _machining(geometry,p,cuts=(),radius=.0011,segments=2):
    """Boolean and bevel in metres; normalised bevels distort skinny receivers."""
    dimensions=Vector((p['w'],p['h'],p['d']))
    vertices,triangles=geometry;mesh=bpy.data.meshes.new('Hero / pre-machined mesh')
    mesh.from_pydata([tuple(q[i]*dimensions[i] for i in range(3)) for q in vertices],[],triangles)
    mesh.update();obj=bpy.data.objects.new('Hero / manufacturing operations',mesh)
    bpy.context.scene.collection.objects.link(obj)
    # Recalculate before native booleans. The contour authoring direction may
    # differ between slide, cloth and transverse receiver construction.
    import bmesh
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for i,(position,size) in enumerate(cuts):
        bpy.ops.mesh.primitive_cube_add(size=1)
        cutter=bpy.context.object;cutter.location=tuple(position[j]*dimensions[j] for j in range(3))
        cutter.scale=tuple(size[j]*dimensions[j] for j in range(3))
        bpy.context.view_layer.objects.active=cutter
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        bevel=cutter.modifiers.new('Slot cutter edge radius','BEVEL');bevel.width=min(.0009,min(cutter.dimensions)*.17);bevel.segments=2
        bpy.context.view_layer.objects.active=obj
        boolean=obj.modifiers.new('Machined cavity '+str(i),'BOOLEAN');boolean.operation='DIFFERENCE';boolean.solver='EXACT';boolean.object=cutter
        bpy.ops.object.modifier_apply(modifier=boolean.name)
        cutter_mesh=cutter.data;bpy.data.objects.remove(cutter,do_unlink=True)
        if cutter_mesh.users==0:bpy.data.meshes.remove(cutter_mesh)
    bevel=obj.modifiers.new('Physical edge highlight','BEVEL');bevel.width=min(radius,min(dimensions)*.055)
    bevel.segments=segments;bevel.limit_method='ANGLE';bevel.angle_limit=.48;bevel.use_clamp_overlap=True
    evaluated=bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()));evaluated.calc_loop_triangles()
    result=([Vector(tuple(q.co[i]/dimensions[i] for i in range(3))) for q in evaluated.vertices],
            [tuple(q.vertices) for q in evaluated.loop_triangles])
    bpy.data.meshes.remove(evaluated);bpy.data.objects.remove(obj,do_unlink=True)
    if mesh.users==0:bpy.data.meshes.remove(mesh)
    return result


def weapon_component(p,base,weapon=None):
    tag=p.get('tag','');kind=(weapon or {}).get('kind','');identity=(weapon or {}).get('id',0)
    width,height,depth=p['w'],p['h'],p['d'];metal=p.get('metal',0)
    wood=p.get('tile')==10;role=None
    # Primitive overlays from the original rig represented holes with black
    # rectangles and magazine/grip moulding with thick attached plates. Native
    # manufacturing now owns those surfaces; keep their member indices while
    # omitting the covered geometry, so animation/collision contracts survive.
    thin_side=abs(p['x'])>.02 and width<.006
    if p.get('mesh') not in ('cylinder','tube','sphere') and thin_side:
        if tag=='magazine' and height>.014 and depth>.025:return ([],[])
        if not tag and max(p.get('color',(1,1,1)))<.085 and height>.008 and depth>.014:return ([],[])
    if p.get('mesh')=='sphere':return base['sphere']
    if p.get('mesh')=='tube':return base['tube']
    if p.get('mesh')=='cylinder':
        # Cylinders carry actual barrel, bolt and pump axes from the original rig.
        # Broad drum magazines and pump grips need shoulders rather than caps.
        if tag=='magazine' and width>.12:role='drum'
        elif tag=='pump' and width>.055:role='pump'
        elif height>width*3 and width>.024:role='barrel'
        else:return base['cylinder']
    elif tag=='magazine' and height>.055 and width>.035 and depth>.04:role='magazine'
    elif tag=='slide' and width>.055 and height>.055 and depth>.15:role='slide'
    elif width>.039 and height>.12 and depth<.13 and p['y']<-.05 and abs(p['x'])<.02:role='grip'
    elif abs(p['x'])<.02 and width>.055 and .030<height<.057 and depth>.15 and -.05<p['y']<0 and p['z']<.12:role='lower_receiver'
    elif abs(p['x'])<.02 and width>.055 and height>.057 and depth>.13:
        if p['z']<-.13:role='handguard'
        elif p['z']>.14:role='stock'
        else:role='receiver'
    elif abs(p['x'])<.02 and p['z']>.17 and width>.05 and height>.10 and depth>.065:role='stock'
    elif kind=='MELEE' and depth>.1 and width<.03 and height>.035:role='blade'
    if not role:return None
    cache_key=(role,identity if role in ('receiver','handguard','stock','magazine') else kind,wood,
               round(width,5),round(height,5),round(depth,5),round(p.get('z',0),4),round(p.get('y',0),4))
    if cache_key in _component_cache:return _component_cache[cache_key]
    cuts=[];radius=.0012;segments=2
    if role=='receiver':
        # Forged sides, shoulders, a narrowed forward trunnion and charging
        # channel replace the uniform hexagonal construction blank.
        rx=.49 if kind not in ('SMG','PISTOL') else .465
        geometry=_chamfer_profile([(-.5,.36,.32,-.02),(-.43,.43,.43,0),(-.31,rx,.48,0),(.24,rx,.50,0),(.38,.44,.48,0),(.5,.37,.36,-.04)])
        # Right ejection recess and opposite bolt release seat remain behind
        # the independently animated bolt already present in the game rig.
        cuts=[((.491,.14,-.09),(.14,.29,.34)),((-.491,-.075,.22),(.10,.17,.13))]
        if kind in ('RIFLE','LMG','MARKSMAN'):cuts.append(((0,.48,-.09),(.27,.07,.65)))
        # The bolt runs inside the opened longitudinal ejection channel. Broad
        # receiver planes retain realistic metal highlights between recesses.
        cuts.append(((.493,-.255,.07),(.035,.095,.60)))
    elif role=='lower_receiver':
        outline=[(-.34,-.5),(-.46,-.34),(-.43,-.08),(-.50,.19),(-.37,.40),(-.13,.50),(.29,.50),(.47,.37),(.50,-.38),(.31,-.50)]
        geometry=_extrude_outline(outline,(-.47,.47))
        cuts=[((0,-.45,.065),(.66,.25,.28))]+[((sign*.476,-.10,.05),(.050,.24,.55)) for sign in (-1,1)]
    elif role=='handguard':
        geometry=_chamfer_profile([(-.5,.395,.38,0),(-.465,.47,.46,0),(-.38,.49,.49,0),(.38,.49,.49,0),(.46,.465,.46,0),(.5,.40,.37,0)])
        if not wood:
            # Hollow front mouth reveals real wall thickness and the existing
            # barrel inside. Staggered slots go completely through the sides.
            cuts.append(((0,0,-.12),(.69,.61,.88)))
            slot_count=min(5,max(3,int(depth/.056)))
            for row in (0,1):
                for i in range(slot_count):
                    z=-.36+i*.72/(slot_count-1)+(row*.017 if i<slot_count-1 else 0)
                    cuts.append(((0,-.17+row*.33,z),(1.10,.11,.085 if slot_count>3 else .105)))
            radius=.0008;segments=1
        else:
            # Carved wood has a rounded belly, rear hand stop and shallow
            # longitudinal relief rather than an industrial perforated cage.
            cuts=[((sign*.48,-.05,0),(.055,.25,.76)) for sign in (-1,1)]
            radius=.0018
    elif role=='slide':
        geometry=_chamfer_profile([(-.5,.365,.36,-.02),(-.45,.48,.49,0),(.37,.48,.49,0),(.5,.39,.37,0)])
        cuts=[((.49,.18,-.07),(.13,.36,.27))]
        for side in (-1,1):
            for i in range(5):cuts.append(((side*.484,-.02,.13+i*.058),(.058,.64,.022)))
        radius=.00065;segments=1
    elif role=='magazine':
        # The source curved magazine comprises two overlapping sections. Their
        # mating faces must keep the full stamped width, rather than giving
        # each half a tapered collar which reads as a detached second magazine.
        rings=[(-.5,.495,.495,0),(-.40,.495,.495,0),(-.12,.495,.495,0),(.32,.495,.495,0),(.5,.495,.495,0)]
        source=(weapon or {}).get('parts',[])
        magazines=[q for q in source if q.get('tag')=='magazine' and q.get('mesh') not in ('cylinder','tube') and q['h']>.055 and q['w']>.035 and q['d']>.04]
        upper=max(magazines,key=lambda q:q['y']+q['h']*.5,default=None)
        if upper is p:
            supports=[q for q in source if not q.get('tag') and abs(q['x'])<.02 and q['d']>.13 and q['h']>.03 and q['y']>-.06 and q['z']-q['d']*.5<=p['z']<=q['z']+q['d']*.5]
            if supports:
                bottom=min(q['y']-q['h']*.5 for q in supports)
                feed_top=max(.5,(bottom+.004-p['y'])/height)
                if feed_top>.51:
                    # Insert the existing upper section into the lower receiver;
                    # its anchor and reload travel remain exactly unchanged.
                    rings.extend(((max(.505,feed_top-.025),.475,.475,0),(feed_top,.465,.475,0)))
        geometry=_chamfer_profile(rings,axis=1)
        for side in (-1,1):
            for z in (-.24,0,.24):cuts.append(((side*.491,-.065,z),(.052,.62,.08)))
        radius=.0006;segments=1
    elif role=='grip':
        # Palm swell, beavertail shoulder, finger rake and heel. The original
        # attachment pitch retains each weapon's particular ergonomic angle.
        geometry=_profile([(-.5,.34,.40,0,.045),(-.43,.44,.45,0,.015),(-.23,.48,.48,0,0),(.02,.45,.475,0,0),(.25,.40,.43,0,-.015),(.41,.37,.395,0,-.035),(.5,.33,.37,0,-.07)],16)
        if not wood:
            for y in (-.31,-.10,.11):cuts.append(((0,y,-.49),(.69,.055,.066)))
        radius=.00065;segments=1
    elif role=='stock':
        geometry=_chamfer_profile([(-.5,.325,.32,.10),(-.32,.39,.36,.06),(-.10,.46,.43,0),(.28,.485,.49,0),(.43,.47,.49,0),(.5,.39,.43,0)])
        if not wood and depth>.12 and height>.075:
            cuts=[((0,-.16,-.07),(1.1,.35,.42))]
        radius=.0016
    elif role in ('barrel','pump','drum'):
        sides=24 if role=='drum' else 20
        if role=='barrel':rings=[(-.5,.42,.42,0,0),(-.47,.47,.47,0,0),(-.40,.465,.465,0,0),(.39,.465,.465,0,0),(.44,.50,.50,0,0),(.49,.50,.50,0,0),(.5,.42,.42,0,0)]
        else:rings=[(-.5,.36,.36,0,0),(-.44,.46,.46,0,0),(-.31,.5,.5,0,0),(.31,.5,.5,0,0),(.44,.46,.46,0,0),(.5,.36,.36,0,0)]
        geometry=_profile(rings,sides);radius=.00045;segments=1
    else:
        geometry=_extrude_outline([(-.43,.5),(-.50,.26),(-.43,-.35),(-.12,-.5),(.05,-.37),(.16,.1),(.35,.33),(.33,.5)],(-.10,.10))
        radius=.0002;segments=1
    result=_machining(geometry,p,cuts,radius,segments)
    _component_cache[cache_key]=result
    return result


def author_heroes(api):
    """Editable operator/hand/optic masters with silhouette-preserving LODs."""
    B=api['BASE'];lathe=api['lathe'];sphere=api['sphere'];register=api['register']
    object_mesh=api['object_mesh'];assemble=api['assemble']
    white=(1,1,1);fabric=(.79,.81,.74);dark=(.35,.38,.32);edge=(.65,.68,.59)
    def model(name,items,far=None,smooth=False):
        for level,pieces in (('near',items),('far',far or items)):
            v,t,c=assemble([p[:4] for p in pieces]);physical=[]
            for p in pieces:physical.extend([p[4] if len(p)>4 else (.88,0)]*len(p[0][0]))
            obj=object_mesh(name+'__'+level,v,t,c,physical=physical)
            if smooth:
                for polygon in obj.data.polygons:polygon.use_smooth=True
            # Area-weighted manufactured normals flatten broad cloth panels and
            # knuckles. Organic surfaces retain their continuous smooth normals;
            # only hard manufactured masters receive the face weighting modifier.
            if not smooth:
                normals=obj.modifiers.new('Hero machined normals','WEIGHTED_NORMAL');normals.keep_sharp=True
    def soft(pos,size,color=white,rm=(.94,0)):
        return B['soft'],pos,size,color,rm
    def strip(pos,size,color=edge,rm=(.86,.03)):
        return B['box'],pos,size,color,rm
    def seam(start,end,r=.006,color=dark):
        a,b=Vector(start),Vector(end);direction=b-a
        rotation=Vector((0,1,0)).rotation_difference(direction.normalized())
        # A stitched cord is a few pixels across in gameplay. Eight radial
        # sides retain that silhouette with one quarter of the former geometry.
        cord=lathe([(-.5,.5,.5),(.5,.5,.5)],8)
        g=([rotation@Vector((q.x*r,q.y*direction.length,q.z*r))+(a+b)*.5 for q in cord[0]],cord[1])
        return g,(0,0,0),(1,1,1),color,(.96,0)

    def cloth(rings,sides=24,wrinkle=.025,centre=-.24,frequency=34):
        v,t=lathe(rings,sides)
        for q in v:
            angle=math.atan2(q.z,q.x)
            compression=math.exp(-((q.y-centre)*5.6)**2)+.40*math.exp(-((q.y-.40)*9)**2)
            crease=math.sin(q.y*frequency+math.sin(angle*2)*1.7)+.28*math.sin(q.y*67-angle*3)
            radial=1+wrinkle*crease*compression
            q.x*=radial;q.z*=radial
            # Compression creases run around the joint, while a shallow sewn
            # seam follows the outer arm/leg rather than random surface noise.
            q.x*=1-.013*math.exp(-((angle-.1)*9)**2)
        return v,t
    limb_rings=[(-.5,.325,.335),(-.44,.36,.36),(-.34,.425,.415),(-.23,.45,.43),(-.10,.47,.445),(.08,.49,.45),(.22,.47,.43),(.35,.435,.405),(.44,.405,.385),(.5,.365,.35)]
    near=cloth(limb_rings,24,.063);far=cloth([limb_rings[i] for i in (0,2,4,6,8,9)],12,.023)
    register('limb',near,far,True)
    # Each anatomical segment has its own mass distribution. The shoulder,
    # biceps, calf and ankle no longer share the same capsule, and compression
    # folds collect at the actual elbow/knee rather than along the whole limb.
    anatomy={
        'thigh':[(-.5,.335,.35),(-.41,.39,.39),(-.28,.415,.41),(-.10,.455,.45),(.10,.48,.475),(.28,.50,.48),(.42,.47,.44),(.5,.39,.37)],
        'shin':[(-.5,.27,.31),(-.40,.295,.345),(-.25,.33,.39),(-.08,.405,.465),(.13,.485,.49),(.29,.48,.45),(.41,.405,.37),(.5,.36,.35)],
        'upperarm':[(-.5,.31,.335),(-.39,.34,.37),(-.23,.39,.425),(-.05,.46,.47),(.14,.5,.475),(.30,.495,.455),(.43,.45,.415),(.5,.39,.365)],
        'forearm':[(-.5,.255,.285),(-.43,.285,.31),(-.31,.325,.355),(-.13,.39,.405),(.05,.46,.445),(.21,.5,.465),(.38,.46,.415),(.5,.37,.36)]
    }
    for name,rings in anatomy.items():
        surface=cloth(rings,24,.055,-.35 if name in ('thigh','upperarm') else .36)
        far=cloth([rings[i] for i in (0,2,4,6,7)],10,.018)
        pieces=[(surface,(0,0,0),(1,1,1),white,(.96,0))]
        if name=='forearm':
            cuff=lathe([(-.5,.27,.30),(-.46,.31,.33),(-.40,.31,.33),(-.365,.285,.31)],16)
            pieces.append((cuff,(0,0,0),(1,1,1),dark,(.90,0)))
            pieces.append(soft((.12,-.435,-.26),(.31,.060,.044),edge))
        model(name,pieces,[(far,(0,0,0),(1,1,1),white,(.96,0))],True)
    torso_rings=[(-.5,.365,.34),(-.42,.36,.39),(-.28,.375,.435),(-.11,.44,.46),(.06,.475,.43),(.22,.495,.405),(.35,.43,.35),(.45,.33,.28),(.5,.265,.245)]
    register('torso',cloth(torso_rings,28,.047,-.35),lathe([torso_rings[i] for i in (0,2,4,6,8)],12),True)
    # Flattened metacarpals, thenar/palm swell and soft dorsal knuckle armour.
    # Finger pieces remain under the original pose/trigger rig.
    palm_rings=[(-.5,.27,.28),(-.40,.37,.31),(-.24,.45,.345),(-.07,.485,.37),(.11,.48,.395),(.29,.45,.37),(.43,.355,.305),(.5,.275,.25)]
    palm=lathe(palm_rings,24)
    p=[(palm,(0,0,.035),(1,1,1),white,(.95,0))]
    for x,y in ((-.31,.16),(-.105,.23),(.105,.22),(.295,.13)):
        p.append(soft((x,y,-.315),(.18,.23,.075),edge,(.82,0)))
        p.append(seam((x-.077,y-.1,-.344),(x+.075,y-.1,-.344),.0045))
    p.append(soft((.315,-.17,.12),(.22,.38,.30),fabric))
    p.append(strip((0,-.415,-.29),(.47,.035,.055),dark))
    p.append(seam((-.35,-.28,-.28),(-.405,.27,-.25),.005))
    p.append(seam((.35,-.28,-.28),(.385,.23,-.27),.005))
    model('palm',p,p[:1]+p[-4:-3],True)
    fingers=lathe([(-.5,.245,.24),(-.43,.35,.34),(-.29,.425,.405),(-.08,.46,.435),(.12,.435,.405),(.32,.385,.34),(.46,.255,.23),(.5,.17,.16)],12)
    f=[(fingers,(0,0,0),(1,1,1),white,(.92,0))]
    for y in (-.12,.16):f.append(seam((-.25,y,-.367),(.25,y,-.367),.009,dark))
    model('finger',f,f[:1],True)
    # Wrist cuff and authored cloth buckling replace a smooth elongated oval.
    sleeve_rings=[(-.5,.34,.335),(-.46,.355,.35),(-.40,.40,.385),(-.29,.445,.42),(-.17,.47,.455),(-.045,.495,.46),(.10,.49,.455),(.24,.47,.445),(.38,.445,.405),(.5,.40,.365)]
    sleeve=cloth(sleeve_rings,28,.075,-.33,39)
    rot=Matrix.Rotation(math.pi/2,3,'X')
    s=[(sleeve,(0,0,0),(1,1,1),white,(.97,0)),
       (lathe([(-.5,.365,.365),(-.47,.405,.405),(-.42,.405,.405),(-.385,.37,.37)],24),(0,0,0),(1,1,1),dark,(.90,0)),
       strip((.27,-.43,-.285),(.29,.065,.065),edge)]
    s.append(seam((-.40,-.28,-.20),(-.385,.43,-.19),.006))
    s.append(seam((.395,-.25,.17),(.395,.44,.14),.006))
    rotated=[(([rot@v for v in q[0][0]],q[0][1]),rot@Vector(q[1]),(q[2][0],q[2][2],q[2][1]),q[3],q[4]) for q in s]
    model('sleeve_z',rotated,rotated[:2],True)
    # The actor hand envelope contains a complete posed mitten silhouette.
    g=[(palm,(0,.01,.03),(.83,.87,.77),white,(.94,0))]
    for i,x in enumerate((-.30,-.10,.10,.29)):
        g.append((fingers,(x,-.29,-.13),(.20,.45,.31),edge,(.92,0)))
        g.append(soft((x,.07,-.31),(.17,.18,.07),dark))
    g.append(soft((.365,-.08,-.12),(.23,.49,.26),edge))
    model('glove',g,g[:1]+g[-1:],True)

    # Armour cut follows clavicles and ribs, with shoulder straps, layered
    # plate pockets and stitched pouches, rather than a single soft cube.
    vest_outline=[(-.42,-.34),(-.50,-.23),(-.50,.28),(-.35,.45),(-.17,.48),(.17,.48),(.35,.45),(.50,.28),(.50,-.23),(.42,-.34)]
    # Outline above is X/Y; use Y-axis extrusion then rotate into a breastplate.
    vest_blank=_extrude_outline([(x,y) for x,y in vest_outline],(-.32,.30),axis=1)
    r=Matrix.Rotation(-math.pi/2,3,'X');vest_blank=([r@q for q in vest_blank[0]],vest_blank[1])
    v=[(vest_blank,(0,0,.09),(.91,.94,.90),white,(.93,0))]
    v.append(soft((0,.08,-.315),(.77,.70,.18),fabric))
    for side in (-1,1):
        v.append(soft((side*.32,.38,-.05),(.135,.25,.38),edge))
        v.append(strip((side*.33,.39,-.24),(.15,.11,.045),dark,(.65,.08)))
        v.append(soft((side*.405,-.07,.005),(.115,.43,.62),fabric))
    for x in (-.285,0,.285):
        v.append(soft((x,-.255,-.385),(.26,.345,.20),white))
        v.append(strip((x,-.13,-.486),(.235,.032,.018),dark))
        v.append(seam((x-.11,-.405,-.482),(x+.11,-.405,-.482),.005))
    for y in (.275,.17,.065):
        for x in (-.24,0,.24):v.append(strip((x,y,-.407),(.207,.022,.015),edge))
    v.append(strip((0,.365,-.414),(.275,.065,.014),dark))
    model('vest',v,v[:2]+v[8:14],True)

    # Cranial/mandible volume is an anatomical closed surface. Balaclava and
    # goggles in the established body rig still provide faction readability.
    head=lathe([(-.5,.18,.22),(-.43,.255,.30),(-.31,.33,.375),(-.17,.375,.415),(-.025,.415,.435),(.13,.42,.42),(.29,.395,.365),(.43,.295,.28),(.5,.14,.13)],28)
    h=[(head,(0,0,.03),(.94,1,.94),white,(.76,0))]
    h.append(soft((0,-.09,-.376),(.105,.235,.135),(.96,.89,.79),(.71,0)))
    h.append(soft((0,-.32,-.292),(.34,.17,.13),white,(.80,0)))
    for side in (-1,1):h.append((sphere(12,8),(side*.405,-.035,.02),(.11,.255,.16),(.92,.85,.73),(.78,0)))
    model('head',h,h[:3],True)

    helmet=lathe([(-.5,.445,.46),(-.41,.485,.49),(-.24,.5,.5),(-.06,.48,.47),(.13,.41,.40),(.31,.29,.28),(.44,.14,.13),(.5,.015,.015)],32)
    hp=[(helmet,(0,0,0),(1,1,1),white,(.83,.04))]
    for side in (-1,1):
        hp.append(soft((side*.415,-.275,.035),(.14,.17,.41),dark,(.63,.09)))
        for z in (-.11,.025,.16):hp.append(strip((side*.484,-.26,z),(.026,.045,.049),edge,(.53,.24)))
        hp.append(soft((side*.32,.03,.03),(.17,.18,.32),fabric))
    hp.append(strip((0,-.28,-.46),(.215,.23,.05),edge,(.51,.48)))
    hp.append(strip((0,-.26,-.49),(.115,.11,.025),dark,(.44,.57)))
    model('helmet',hp,hp[:1]+hp[-2:],True)

    # Open optical housing. Coordinates are transverse X/Z, extruded along Y;
    # runtime rotates it around X exactly like the existing tube optic.
    outer=[(-.5,.50),(-.5,-.25),(-.38,-.47),(-.22,-.5),(.22,-.5),(.38,-.47),(.5,-.25),(.5,.50)]
    inner=[(-.37,.32),(-.37,-.20),(-.28,-.34),(-.17,-.36),(.17,-.36),(.28,-.34),(.37,-.20),(.37,.32)]
    vertices=[];faces=[]
    for y,contour in ((-.5,outer),(.5,outer),(-.5,inner),(.5,inner)):
        vertices.extend(Vector((x,y,z)) for x,z in contour)
    for i in range(8):
        j=(i+1)%8
        for a,b,c,d in ((i,j,j+8,i+8),(i+16,i+24,j+24,j+16),(i,j,j+16,i+16),(i+8,i+24,j+24,j+8)):
            faces.extend(((a,b,c),(a,c,d)))
    dummy={'w':.096,'h':.034,'d':.084}
    hood=_machining((vertices,faces),dummy,(),.0007,2)
    model('optic_hood',[(hood,(0,0,0),(1,1,1),white,(.38,.25))])
    return []
