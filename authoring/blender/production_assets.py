"""Metre-scaled hard-surface and cloth modelling for the production art kit.

Lofted sections, recessed panels, open mechanical frames and shaped fabric are
exported as indexed meshes. The simulation keeps its original collision rig.
"""
import math
import bpy
from mathutils import Vector, Matrix


def profile_mesh(sections, axis=2):
    """A manufactured chamfered extrusion, with independently shaped sections."""
    verts=[];tris=[]
    for depth,rx,ry in sections:
        for x,y in ((-.84,-1),(.84,-1),(1,-.84),(1,.84),(.84,1),(-.84,1),(-1,.84),(-1,-.84)):
            q=(x*rx,y*ry,depth)
            verts.append(Vector(q if axis==2 else (q[2],q[1],q[0]) if axis==0 else (q[0],q[2],q[1])))
    for row in range(len(sections)-1):
        for i in range(8):
            a=row*8+i;b=row*8+(i+1)%8;tris.extend(((a,b,b+8),(a,b+8,a+8)))
    for row,flip in ((0,True),(len(sections)-1,False)):
        idx=len(verts);q=[0,0,0];q[axis]=sections[row][0];verts.append(Vector(q))
        for i in range(8):
            a=row*8+i;b=row*8+(i+1)%8;tris.append((idx,b,a) if flip else (idx,a,b))
    if axis!=2:tris=[(a,c,b) for a,b,c in tris]
    return verts,tris


def author_production(api):
    B=api['BASE'];lathe=api['lathe'];sphere=api['sphere'];register=api['register']
    assemble=api['assemble'];object_mesh=api['object_mesh'];linear=api['linear']
    flat=([Vector(p) for p in ((-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5),(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5))],[(0,2,1),(0,3,2),(4,5,6),(4,6,7),(0,1,5),(0,5,4),(3,7,6),(3,6,2),(0,4,7),(0,7,3),(1,2,6),(1,6,5)])
    def model(name,items,far=None,smooth=False):
        for level,pieces in (('near',items),('far',far or items)):
            v,t,c=assemble([p[:4] for p in pieces]);physical=[]
            for p in pieces:physical.extend([p[4] if len(p)>4 else (.78,0)]*len(p[0][0]))
            obj=object_mesh(name+'__'+level,v,t,c,physical=physical)
            if smooth:
                for face in obj.data.polygons:face.use_smooth=True
            normals=obj.modifiers.new('Production face normals','WEIGHTED_NORMAL');normals.keep_sharp=True
    def box(pos,size,c=(1,1,1),rm=(.8,0),soft=False):return (B['soft'] if soft else flat if min(size)<.035 else B['world'],pos,size,c,rm)
    def tube(pos,size,c=(.55,.57,.56),rm=(.38,.7),rotate=None):
        g=B['tube']
        if rotate:
            rot=Matrix.Rotation(rotate[1],3,rotate[0]);g=([rot@v for v in g[0]],g[1])
        return (g,pos,size,c,rm)
    def rod(a,b,r=.01,c=(.55,.57,.56),rm=(.47,.65)):
        a=Vector(a);b=Vector(b);d=b-a;q=Vector((0,1,0)).rotation_difference(d.normalized());
        return (([q@Vector((v.x*r,v.y*d.length,v.z*r))+(a+b)*.5 for v in B['cylinder'][0]],B['cylinder'][1]),(0,0,0),(1,1,1),c,rm)
    def screw(x,y,z,r=.017):return (lathe([(-.5,.42,.42),(-.2,.5,.5),(.3,.5,.5),(.5,.38,.38)],8),(x,y,z),(r,r*.28,r),(.38,.4,.39),(.34,.8))
    grey=(.81,.83,.81);edge=(.55,.57,.54);black=(.16,.18,.17)

    from environment_models import author_environment
    environment_props=author_environment(api,{'model':model,'box':box,'rod':rod,
        'tube':tube,'profile':profile_mesh})

    signs=[]
    for map_id,label in enumerate(('OLD QUARTER','FOUNDRY','DUSTLINE','RELAY','BREAKWATER','CITADEL','SWITCHYARD','CANOPY','FROSTLINE','IRON QUARRY','SKYBRIDGE','MONSOON','EMBERWORKS','CROSSFIRE','BLACKSITE','TEST SITE')):
        name='site_sign_'+str(map_id);signs.append(name)
        pieces=[box((0,0,0),(1,.86,.8),(.18,.23,.24),(.52,.35)),box((0,-.33,.43),(.97,.023,.025),(.67,.56,.30),(.61,.15))]
        for text,y,height in ((label,.065,.20),('RESTRICTED ACCESS',-.18,.071)):
            curve=bpy.data.curves.new('Facility typography','FONT');curve.body=text;curve.align_x='CENTER';curve.align_y='CENTER';curve.size=height
            curve.extrude=.001;curve.resolution_u=3
            obj=bpy.data.objects.new('Facility sign lettering',curve);bpy.context.scene.collection.objects.link(obj)
            deps=bpy.context.evaluated_depsgraph_get();mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(deps));mesh.calc_loop_triangles()
            scale=min(1,.89/max(.01,max(v.co.x for v in mesh.vertices)-min(v.co.x for v in mesh.vertices)))
            geometry=([Vector((v.co.x*scale,v.co.y+y,.422+v.co.z)) for v in mesh.vertices],[tuple(t.vertices) for t in mesh.loop_triangles])
            pieces.append((geometry,(0,0,0),(1,1,1),(.88,.91,.83),(.84,0)))
            bpy.data.meshes.remove(mesh);bpy.data.objects.remove(obj,do_unlink=True);bpy.data.curves.remove(curve)
        model(name,pieces,pieces)

    # Sculpted fabric folds with irregular compression at shoulder, elbow and
    # knee. Smooth anatomy underneath gives a natural silhouette in motion.
    def cloth(rings,sides=24,folds=.08):
        v,t=lathe(rings,sides)
        for q in v:
            a=math.atan2(q.z,q.x);crease=folds*(math.sin(q.y*43+a*2.8)+.35*math.sin(q.y*79-a*4))
            compression=(1-abs(q.y)*1.4)*(.30+.7*math.exp(-((q.y+.23)*5)**2))
            q.x*=1+crease*compression;q.z*=1+crease*compression
        return v,t
    register('limb',cloth([(-.5,.32,.33),(-.42,.38,.38),(-.26,.46,.44),(-.12,.48,.46),(.11,.49,.47),(.26,.46,.43),(.39,.42,.40),(.5,.37,.34)]),cloth([(-.5,.32,.33),(-.23,.46,.44),(.19,.48,.45),(.5,.37,.34)],12,.04),True)
    register('torso',cloth([(-.5,.35,.34),(-.37,.37,.40),(-.13,.44,.46),(.17,.50,.43),(.33,.45,.36),(.46,.35,.31),(.5,.30,.26)],28,.055),lathe([(-.5,.35,.34),(.19,.5,.43),(.5,.30,.26)],12),True)
    sleeve=cloth([(-.5,.38,.38),(-.40,.43,.42),(-.27,.49,.45),(-.1,.50,.48),(.13,.48,.46),(.31,.42,.42),(.46,.37,.36),(.5,.34,.33)],24,.1)
    rot=Matrix.Rotation(math.pi/2,3,'X');register('sleeve_z',([rot@q for q in sleeve[0]],sleeve[1]),sphere(12,8),True)

    # Raised knuckle panels and continuous finger profiles replace balloon hands.
    palm=lathe([(-.5,.29,.26),(-.36,.43,.35),(-.08,.49,.39),(.24,.46,.42),(.43,.36,.36),(.5,.27,.29)],24)
    p=[(palm,(0,0,.03),(1,1,1),(1,1,1),(.9,0))]
    for x in (-.32,-.1,.12,.32):p.append(box((x,.11,-.37),(.15,.26,.06),(.67,.69,.62),(.86,0),True))
    model('palm',p,p[:1],True)
    finger=lathe([(-.5,.25,.24),(-.43,.37,.33),(-.20,.45,.39),(-.04,.49,.43),(.12,.46,.43),(.27,.43,.37),(.41,.34,.29),(.5,.19,.18)],18)
    register('finger',finger,lathe([(-.5,.25,.24),(0,.48,.42),(.5,.19,.18)],10),True)

    # Helmet, plate carrier and pouches retain the exact established rig anchors.
    p=[(lathe([(-.5,.48,.47),(-.31,.5,.5),(-.1,.48,.48),(.13,.40,.4),(.33,.28,.27),(.48,.09,.09),(.5,.003,.003)],32),(0,0,0),(1,1,1),(.85,.86,.80),(.81,.04))]
    for s in (-1,1):
        p.append(box((s*.43,-.22,.02),(.10,.16,.39),(.38,.43,.36),(.61,.18)))
        for z in (-.09,.04,.17):p.append(box((s*.487,-.22,z),(.018,.08,.025),black,(.6,.2)))
    p.append(box((0,-.26,-.475),(.22,.25,.048),(.46,.49,.44),(.44,.6)))
    model('helmet',p,p[:1],True)
    p=[box((0,0,.02),(.9,.92,.67),(1,1,1),(.93,0),True),box((0,.09,-.32),(.79,.73,.19),(.88,.9,.84),(.86,0),True)]
    for x in (-.30,0,.30):
        p.append((profile_mesh([(-.5,.42,.40),(-.42,.49,.49),(.34,.48,.5),(.5,.43,.41)],axis=1),(x,-.22,-.405),(.285,.4,.2),(1,1,1),(.95,0)))
        p.append(box((x,-.04,-.506),(.235,.045,.017),black,(.9,0)))
    for y in (.28,.16,.04,-.08):
        for x in (-.25,0,.25):p.append(box((x,y,-.426),(.22,.024,.013),(.66,.70,.62),(.96,0)))
    for s in (-1,1):p.append(box((s*.30,.33,-.19),(.11,.30,.32),(.7,.75,.66),(.94,0),True))
    model('vest',p,p[:2]+p[2:8])
    stack=lathe([(-.5,.5,.5),(-.47,.49,.49),(-.37,.43,.43),(.38,.29,.29),(.46,.31,.31),(.5,.32,.32)],32)
    p=[(stack,(0,0,0),(1,1,1),(.77,.76,.68),(.91,0))]
    for y in (-.40,-.05,.26,.47):p.append(tube((0,y,0),(.92 if y<-.3 else .65,.013,.92 if y<-.3 else .65),(.41,.47,.46),(.65,.35)))
    for x in (-.02,.02):p.append(rod((x,-.4,-.32),(x,.46,-.32),.01))
    for i in range(22):p.append(rod((-.02,-.4+i*.039,-.325),(.02,-.4+i*.039,-.325),.006))
    model('cooling_stack',p,p[:5],True)

    return [*environment_props,'cooling_stack',*signs]
