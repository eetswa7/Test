# Optional Linux Mesa EGL compiler gate. No window, frames or GPU timings.
# Usage: node scripts/export-shader-check.mjs > /tmp/breach-shaders.json
#        python3 scripts/check-shaders.py /tmp/breach-shaders.json
import ctypes as c,json,sys
if len(sys.argv)!=2:
 sys.exit('Pass the JSON shader export path; requires libEGL with surfaceless GLES 3.')
E=c.CDLL('libEGL.so.1');E.eglGetProcAddress.argtypes=[c.c_char_p];E.eglGetProcAddress.restype=c.c_void_p
f=c.CFUNCTYPE(c.c_void_p,c.c_uint,c.c_void_p,c.POINTER(c.c_int))(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'));d=f(0x31DD,None,None)
def ef(n,r,a):
 x=getattr(E,n);x.restype=r;x.argtypes=a;return x
major=c.c_int();minor=c.c_int();assert ef('eglInitialize',c.c_uint,[c.c_void_p,c.c_void_p,c.c_void_p])(d,c.byref(major),c.byref(minor))
assert ef('eglBindAPI',c.c_uint,[c.c_uint])(0x30A0)
attrs=(c.c_int*7)(0x3040,0x40,0x3033,1,0x3024,8,0x3038);config=c.c_void_p();count=c.c_int();assert ef('eglChooseConfig',c.c_uint,[c.c_void_p,c.c_void_p,c.c_void_p,c.c_int,c.c_void_p])(d,attrs,c.byref(config),1,c.byref(count)) and count.value
ca=(c.c_int*3)(0x3098,3,0x3038);ctx=ef('eglCreateContext',c.c_void_p,[c.c_void_p,c.c_void_p,c.c_void_p,c.c_void_p])(d,config,None,ca)
assert ctx and ef('eglMakeCurrent',c.c_uint,[c.c_void_p]*4)(d,None,None,ctx)
def gl(n,r,*args): return c.CFUNCTYPE(r,*args)(E.eglGetProcAddress(n.encode()))
create=gl('glCreateShader',c.c_uint,c.c_uint);source=gl('glShaderSource',None,c.c_uint,c.c_int,c.POINTER(c.c_char_p),c.c_void_p);compile=gl('glCompileShader',None,c.c_uint);status=gl('glGetShaderiv',None,c.c_uint,c.c_uint,c.c_void_p);log=gl('glGetShaderInfoLog',None,c.c_uint,c.c_int,c.c_void_p,c.c_void_p);delete=gl('glDeleteShader',None,c.c_uint)
program=gl('glCreateProgram',c.c_uint);attach=gl('glAttachShader',None,c.c_uint,c.c_uint);link=gl('glLinkProgram',None,c.c_uint);pstatus=gl('glGetProgramiv',None,c.c_uint,c.c_uint,c.c_void_p);plog=gl('glGetProgramInfoLog',None,c.c_uint,c.c_int,c.c_void_p,c.c_void_p);pdelete=gl('glDeleteProgram',None,c.c_uint)
get_string=gl('glGetString',c.c_char_p,c.c_uint)
renderer=get_string(0x1F01).decode();version=get_string(0x1F02).decode()
with open(sys.argv[1]) as stream: variants=json.load(stream)
failures=[]
for v in variants:
 ids=[];errors=[]
 for stage,kind in [('vertex',0x8B31),('fragment',0x8B30)]:
  shader=create(kind);ids.append(shader);s=c.c_char_p(v[stage].encode());source(shader,1,c.byref(s),None);compile(shader);ok=c.c_int();status(shader,0x8B81,c.byref(ok))
  if not ok.value:
   b=c.create_string_buffer(12000);log(shader,len(b),None,b);errors.append(stage+': '+b.value.decode())
 if not errors:
  p=program()
  for shader in ids:attach(p,shader)
  link(p);ok=c.c_int();pstatus(p,0x8B82,c.byref(ok))
  if not ok.value:
   b=c.create_string_buffer(12000);plog(p,len(b),None,b);errors.append('link: '+b.value.decode())
  pdelete(p)
 for shader in ids:delete(shader)
 if errors:failures.append({'name':v['name'],'errors':errors})
print(json.dumps({'scope':'Offline GLSL ES compile/link only; no rendered frames or iPhone validation','renderer':renderer,'version':version,'variants':len(variants),'passed':len(variants)-len(failures),'failures':failures},indent=2));sys.exit(bool(failures))
