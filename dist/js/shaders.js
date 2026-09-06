export const vertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in mat4 aModel;
layout(location=7) in vec4 aColor;
layout(location=8) in vec4 aMaterial;
uniform mat4 uVP;
uniform mat4 uShadow;
out vec3 vWorld;out vec3 vNormal;out vec4 vColor;out vec4 vMaterial;out vec4 vShadow;out vec2 vUV;
void main(){vec4 p=aModel*vec4(aPosition,1.);vWorld=p.xyz;
vec3 scales=vec3(dot(aModel[0].xyz,aModel[0].xyz),dot(aModel[1].xyz,aModel[1].xyz),dot(aModel[2].xyz,aModel[2].xyz));
vNormal=normalize(mat3(aModel)*(aNormal/max(scales,vec3(.00001))));vColor=aColor;vMaterial=aMaterial;vUV=aUV;
vShadow=uShadow*vec4(p.xyz+vNormal*.028,1.);gl_Position=uVP*p;}`;
export const fragment=`#version 300 es
precision highp float;
in vec3 vWorld;in vec3 vNormal;in vec4 vColor;in vec4 vMaterial;in vec4 vShadow;in vec2 vUV;
uniform vec3 uEye;uniform vec3 uSun;uniform vec3 uFog;uniform vec3 uSky;
uniform highp sampler2DShadow uDepth;uniform float uShadowOn;uniform float uViewModel;
out vec4 outColor;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
vec3 n=normalize(vNormal),v=normalize(uEye-vWorld),l=normalize(uSun),h=normalize(v+l);float ndl=max(dot(n,l),0.),ndv=max(dot(n,v),.001);
vec3 base=vColor.rgb;float pattern=vMaterial.z;
if(pattern>.5&&uViewModel<.5){float grain=noise(vWorld*6.0),weather=noise(vWorld*.24);base*=.87+grain*.17+weather*.13;
 if(pattern>1.5&&pattern<2.5){vec2 uv=abs(n.y)>.7?vWorld.xz:vec2(vWorld.x+vWorld.z,vWorld.y);uv.y*=2.;uv.x+=mod(floor(uv.y),2.)*.6;vec2 f=fract(uv);float edge=min(min(f.x,1.-f.x),min(f.y,1.-f.y));float aa=max(fwidth(uv.x),fwidth(uv.y));base*=mix(.72,1.,smoothstep(.018,.018+aa*1.5,edge));}
 if(pattern>2.5&&pattern<3.5){float seam=abs(sin((vWorld.x+vWorld.z)*14.));base*=.89+.11*smoothstep(.03,.25,seam);}
 if(pattern>3.5){base*=.86+.14*noise(vec3(vWorld.x*32.,vWorld.y*2.,vWorld.z*2.));}
}
float rough=clamp(vMaterial.x,.12,1.),metal=vMaterial.y;float a=rough*rough,a2=a*a,ndh=max(dot(n,h),0.),vdh=max(dot(v,h),0.);float den=ndh*ndh*(a2-1.)+1.;float D=a2/(3.14159*den*den+.0001);float k=(rough+1.)*(rough+1.)/8.;float G=ndl/(ndl*(1.-k)+k)*ndv/(ndv*(1.-k)+k);vec3 f0=mix(vec3(.04),base,metal),F=f0+(1.-f0)*pow(1.-vdh,5.);vec3 spec=D*G*F/max(4.*ndl*ndv,.001);
float shadow=1.;vec3 sc=vShadow.xyz/vShadow.w*.5+.5;if(uShadowOn>.5&&uViewModel<.5&&sc.x>0.&&sc.x<1.&&sc.y>0.&&sc.y<1.&&sc.z<1.){float bias=max(.00045*(1.-ndl),.00014);shadow=0.;for(int x=0;x<2;x++)for(int y=0;y<2;y++)shadow+=texture(uDepth,vec3(sc.xy+(vec2(x,y)-.5)/1024.,sc.z-bias))*.25;}
vec3 ambient=mix(vec3(.15,.16,.16),uSky*.57+.15,n.y*.5+.5);float ao=mix(.7,1.,smoothstep(0.,2.,vWorld.y));
vec3 lit=base*ambient*ao+(base*(1.-metal)*.8+spec)*ndl*vec3(2.8,2.55,2.13)*mix(.18,1.,shadow);
lit+=base*vMaterial.w;lit=aces(lit*1.05);float fog=1.-exp(-length(uEye-vWorld)*.009);if(uViewModel>.5)fog=0.;lit=mix(lit,uFog,fog);
outColor=vec4(pow(lit,vec3(.88)),vColor.a);
}`;
export const shadowVertex=`#version 300 es
precision highp float;layout(location=0)in vec3 aPosition;layout(location=3)in mat4 aModel;uniform mat4 uVP;void main(){gl_Position=uVP*aModel*vec4(aPosition,1.);}`;
export const shadowFragment=`#version 300 es
precision highp float;void main(){}`;
export const skyVertex=`#version 300 es
precision highp float;out vec2 vUV;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p*2.-1.;gl_Position=vec4(vUV,1.,1.);}`;
export const skyFragment=`#version 300 es
precision highp float;in vec2 vUV;uniform vec3 uSky;uniform vec3 uFog;uniform vec3 uSun;uniform vec2 uAngle;uniform vec2 uLens;uniform float uTime;out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){vec3 d=normalize(vec3(vUV.x*uLens.x*uLens.y,vUV.y*uLens.y,-1.));float sp=sin(uAngle.y),cp=cos(uAngle.y);d=vec3(d.x,d.y*cp-d.z*sp,d.y*sp+d.z*cp);float sy=sin(-uAngle.x),cy=cos(-uAngle.x);d=vec3(d.x*cy+d.z*sy,d.y,-d.x*sy+d.z*cy);
vec3 c=mix(uFog,uSky,clamp(d.y*1.5,0.,1.));float sun=max(dot(d,normalize(uSun)),0.);c+=vec3(1.,.79,.48)*(pow(sun,500.)*.8+pow(sun,12.)*.09);
vec2 p=d.xz/max(.12,d.y)*1.8+uTime*.0006;float cloud=noise(p)*.5+noise(p*2.1)*.25+noise(p*4.2)*.125;c=mix(c,vec3(.89,.9,.87),smoothstep(.47,.68,cloud)*smoothstep(0.,.28,d.y)*.62);outColor=vec4(c,1.);}`;
