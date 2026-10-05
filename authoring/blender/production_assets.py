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
    def model(name,items,far=None,smooth=False):
        for level,pieces in (('near',items),('far',far or items)):
            v,t,c=assemble([p[:4] for p in pieces]);physical=[]
            for p in pieces:physical.extend([p[4] if len(p)>4 else (.78,0)]*len(p[0][0]))
            obj=object_mesh(name+'__'+level,v,t,c,physical=physical)
            if smooth:
                for face in obj.data.polygons:face.use_smooth=True
            normals=obj.modifiers.new('Production face normals','WEIGHTED_NORMAL');normals.keep_sharp=True
    def box(pos,size,c=(1,1,1),rm=(.8,0),soft=False):return (B['soft'] if soft else B['world'],pos,size,c,rm)
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

    # Real recessed glazing inside open facade reveals, rather than glass
    # rectangles painted on a solid unit cube. The opaque backing is behind it.
    for style in ('urban','industrial','desert'):
        p=[box((0,0,.015),(.98,.98,.90),grey,(.87,.02))]
        for sign in (-1,1):
            for row in range(3):
                y=-.27+row*.255
                for column in range(3):
                    x=-.32+column*.32
                    # A cavity, glazing, jamb, lintel, sill and mullion in metres
                    # are all part of the one material/geometry group.
                    p.append(box((x,y,sign*.455),(.235,.185,.018),black,(.24,.04)))
                    p.append(box((x,y,sign*.463),(.209,.160,.009),(.14,.23,.27),(.14,.02)))
                    for dx in (-.124,.124):p.append(box((x+dx,y,sign*.478),(.020,.211,.044),edge,(.75,.1)))
                    for dy in (-.100,.100):p.append(box((x,y+dy,sign*.477),(.257,.020,.049),grey,(.86,0)))
                    p.append(box((x,y,sign*.469),(.008,.170,.021),(.37,.42,.41),(.44,.4)))
                    p.append(box((x,y-.119,sign*.489),(.278,.017,.056),(.63,.64,.59),(.87,0)))
            for x in (-.491,.491):p.append(box((x,0,sign*.466),(.017,.99,.05),edge,(.83,.1)))
            for y in (-.46,.475):p.append(box((0,y,sign*.48),(1,.030,.06),edge,(.84,0)))
            if style=='industrial':
                for x in (-.47,-.16,.16,.47):p.append(box((x,0,sign*.495),(.009,.96,.011),(.68,.70,.68),(.64,.35)))
            if style=='urban':
                for y in (-.385,.13):
                    p.append(box((0,y,sign*.50),(.92,.02,.09),(.64,.64,.6),(.88,0)))
                    for x in (-.45,-.15,.15,.45):p.append(rod((x,y,sign*.53),(x,y+.05,sign*.53),.006))
        p.extend([box((0,-.481,0),(1,.035,1),(.55,.56,.52),(.92,0)),box((0,.492,0),(1,.027,1),(.75,.77,.73),(.89,0))])
        model('building_'+style,p,p[:1]+[q for q in p[1:] if q[2][0]>.19 or q[2][1]>.2])

    # Cast, tapered Jersey barrier with lifting eyes and chipped corners.
    g=profile_mesh([(-.5,.5,.5),(-.46,.5,.5),(-.18,.5,.43),(.05,.5,.28),(.45,.49,.19),(.5,.46,.18)],axis=1)
    p=[(g,(0,0,0),(1,1,1),(1,1,1),(.94,0))]
    for x in (-.30,.30):p.append(tube((x,.493,0),(.05,.025,.05),black,(.66,.15)))
    model('barrier_x',p,p[:1])
    rot=Matrix.Rotation(math.pi/2,3,'Y');model('barrier_z',[(([rot@v for v in q[0][0]],q[0][1]),rot@Vector(q[1]),(q[2][2],q[2][1],q[2][0]),q[3],q[4]) for q in p])

    # Open freight door hardware, corner castings and true pressed corrugation.
    for axis in ('x','z'):
        p=[box((0,0,0),(.95,.96,.93),(1,1,1),(.68,.35))]
        for sign in (-1,1):
            for i in range(18):
                x=-.465+i*.055
                p.append((profile_mesh([(-.5,.008,.44),(-.47,.010,.44),(.47,.010,.44),(.5,.008,.44)],axis=1),(x,0,sign*.47),(1,1,.035),(.91,.93,.92),(.6,.35)))
            for x in (-.47,.47):p.append(box((x,0,sign*.491),(.022,1,.018),(.59,.64,.62),(.6,.55)))
        for end in (-1,1):
            for y in (-.48,.48):p.append(box((end*.486,y,0),(.027,.04,1),(.63,.67,.65),(.5,.55)))
            if end==1:
                for z in (-.24,.24):
                    p.append(box((.49,0,z),(.018,.91,.455),(.88,.91,.9),(.61,.28)))
                    p.append(rod((.505,-.42,z),(.505,.42,z),.012,black))
                    for y in (-.30,.27):p.append(box((.511,y,z),(.026,.07,.045),(.64,.69,.67),(.44,.7)))
        for x in (-.475,.475):
            for z in (-.475,.475):
                for y in (-.472,.472):p.append(box((x,y,z),(.05,.055,.05),(.46,.50,.49),(.5,.75)))
        if axis=='z':
            rot=Matrix.Rotation(math.pi/2,3,'Y');p=[(([rot@v for v in q[0][0]],q[0][1]),rot@Vector(q[1]),(q[2][2],q[2][1],q[2][0]),q[3],q[4]) for q in p]
        model('cargo_'+axis,p,p[:1]+p[-8:])

    # A turbine/generator has curved casting, flywheel, maintenance access,
    # vented radiator, fuel pipes and a skid. This replaces the old green cube.
    p=[box((0,-.43,0),(1,.14,.96),black,(.58,.55))]
    body=profile_mesh([(-.5,.35,.32),(-.44,.45,.39),(.36,.45,.39),(.47,.32,.30),(.5,.27,.27)])
    p.append((body,(0,-.025,.02),(.96,.98,.88),(.57,.60,.53),(.69,.23)))
    for sign in (-1,1):
        for i in range(10):p.append(box((sign*.462,-.18+i*.048,.07),(.024,.016,.56),black,(.65,.12)))
        p.append(box((sign*.467,.21,-.15),(.035,.15,.34),(.72,.73,.68),(.57,.4)))
        for z in (-.26,-.06):p.append(screw(sign*.489,.21,z,.028))
    p.append((sphere(20,10),(0,.05,-.405),(.58,.60,.17),(.24,.27,.25),(.4,.6)))
    for x in (-.26,.26):
        p.append(tube((x,.39,.12),(.11,.30,.11),(.33,.35,.3)))
        p.append(rod((x,.40,.14),(x,.40,-.19),.035,black))
    for z in (-.34,.34):p.append(box((0,-.34,z),(.88,.08,.11),(.38,.42,.38),(.53,.5)))
    model('generator',p,p[:2]+p[-4:])

    # Folded steel ventilation grille with actual depth and shadow slots.
    p=[box((0,0,.035),(.96,.95,.80),(.67,.72,.7),(.67,.25))]
    for x in (-.475,.475):p.append(box((x,0,-.395),(.04,.99,.20),grey,(.6,.35)))
    for y in (-.48,.48):p.append(box((0,y,-.395),(1,.03,.20),grey,(.6,.35)))
    for i in range(10):p.append(box((0,-.405+i*.090,-.395),(.92,.025,.18),(.34,.4,.38),(.54,.4)))
    model('vent',p,p[:5])

    # Open I-section roof truss, intended to be scaled along its span.
    p=[]
    for y in (-.45,.45):
        p.extend([box((0,y,0),(1,.045,.18),grey,(.54,.45)),box((0,y,0),(1,.12,.018),(.55,.6,.58),(.6,.35))])
    for i in range(8):
        x=-.5+i*.125;p.append(rod((x,-.43,0),(x+.125,.43,0),.018,grey))
        p.append(rod((x,.43,0),(x+.125,-.43,0),.015,edge))
    model('roof_truss',p,p[:4]+p[4::2])

    # Control gear, cables and meter housings are flat wall-mounted objects.
    p=[box((0,0,0),(.98,.97,.72),(.57,.63,.62),(.65,.2)),box((0,0,-.38),(.86,.87,.05),(.68,.72,.7),(.55,.35))]
    for x in (-.28,.28):
        p.append(box((x,.15,-.42),(.22,.24,.022),(.11,.19,.19),(.18,.01)))
        p.append(box((x,.15,-.438),(.18,.18,.008),(.34,.46,.43),(.19,0)))
        for y in (-.13,-.26):p.append((sphere(10,6),(x,y,-.427),(.05,.05,.029),(.3,.42,.29),(.37,.1)))
        for y in (-.39,.39):p.append(screw(x,y,-.414,.017))
    model('switchgear',p,p[:4])

    # A guard lamp is a proper fixture, with flanges and a recessed diffuser.
    p=[box((0,0,0),(1,.68,.80),(.56,.63,.64),(.42,.5)),box((0,-.36,0),(.83,.11,.65),(.94,.96,.91),(.4,0))]
    for x in (-.42,.42):p.append(box((x,-.39,0),(.025,.12,.7),(.46,.52,.51),(.48,.55)))
    model('light_fixture',p)

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

    # Pressed automotive bodywork, windscreen rake and axle-mounted tyres.
    body=profile_mesh([(-.5,.37,.12),(-.43,.45,.16),(-.25,.46,.18),(.35,.46,.18),(.48,.42,.14),(.5,.36,.11)])
    p=[(body,(0,-.12,0),(1,1,1),(.63,.66,.60),(.51,.32)),box((0,.18,.035),(.78,.53,.74),(.68,.72,.65),(.6,.2),True)]
    p.append(box((0,.21,-.353),(.68,.245,.018),(.15,.23,.26),(.13,.02)))
    for s in (-1,1):
        p.append(box((s*.397,.24,-.08),(.016,.22,.45),(.15,.22,.24),(.15,.02)))
        p.append(box((s*.433,-.02,.02),(.025,.014,.38),(.35,.4,.37),(.54,.4)))
        p.append(box((s*.435,.11,.11),(.025,.022,.08),(.38,.42,.39),(.33,.72)))
        for z in (-.32,.32):
            tyre=lathe([(-.5,.37,.37),(-.39,.48,.48),(-.24,.5,.5),(.24,.5,.5),(.39,.48,.48),(.5,.37,.37)],24)
            rot=Matrix.Rotation(math.pi/2,3,'Z');tyre=([rot@q for q in tyre[0]],tyre[1])
            p.append((tyre,(s*.446,-.28,z),(.13,.34,.24),(.12,.13,.12),(.93,0)))
            p.append((sphere(16,8),(s*.514,-.28,z),(.016,.20,.14),(.49,.53,.5),(.31,.86)))
    p.extend([box((0,-.20,-.5),(.93,.07,.03),black,(.48,.55)),box((0,-.20,.49),(.93,.07,.032),black,(.5,.5))])
    for x in (-.30,.30):p.append(box((x,-.08,-.491),(.17,.066,.016),(.82,.83,.75),(.19,.08)))
    for y in (-.08,-.12,-.16):p.append(box((0,y,-.498),(.42,.014,.018),(.26,.3,.28),(.38,.7)))
    model('utility_van',p,p[:7]+p[7:15],True)
    return ['roof_truss','switchgear','light_fixture','cooling_stack']
