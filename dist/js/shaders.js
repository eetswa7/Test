export const vertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in mat4 aModel;
layout(location=7) in vec4 aColor;
layout(location=8) in vec4 aMaterial;
uniform mat4 uVP,uShadow;
uniform float uTime;
out vec3 vWorld,vNormal;out vec4 vColor,vMaterial,vShadow;out vec2 vUV;
void main(){
 vec4 p=aModel*vec4(aPosition,1.);
 if(aMaterial.z<-.5)p.x+=sin(uTime*1.2+p.z*.4+p.x*.7)*.055*pow(1.-aUV.y,2.);
 vec3 scales=vec3(dot(aModel[0].xyz,aModel[0].xyz),dot(aModel[1].xyz,aModel[1].xyz),dot(aModel[2].xyz,aModel[2].xyz));
 vNormal=normalize(mat3(aModel)*(aNormal/max(scales,vec3(.00001))));vWorld=p.xyz;vColor=aColor;vMaterial=aMaterial;vUV=aUV;
 vShadow=uShadow*vec4(p.xyz+vNormal*.014,1.);gl_Position=uVP*p;
}`;
export const fragment=`#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec3 vWorld,vNormal;in vec4 vColor,vMaterial,vShadow;in vec2 vUV;
uniform vec3 uEye,uSun,uFog,uSky;
uniform highp sampler2DShadow uDepth;
uniform sampler2DArray uSurfaces,uLeaves;
uniform sampler2D uEnvironment;
uniform float uShadowOn,uViewModel,uShadowSize;
out vec4 outColor;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec2 environmentUV(vec3 d){return vec2(abs(fract(atan(d.z,d.x)/6.28318)*2.-1.),clamp(.74-asin(clamp(d.y,-1.,1.))*.6,.01,.99));}
float shadowTerm(float ndl){
 vec3 sc=vShadow.xyz/vShadow.w*.5+.5;
 if(uShadowOn<.5||uViewModel>.5||sc.x<0.||sc.x>1.||sc.y<0.||sc.y>1.||sc.z>1.||sc.z<0.)return 1.;
 float shadow=0.,bias=max(.00028*(1.-ndl),.00012);
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)shadow+=texture(uDepth,vec3(sc.xy+vec2(x,y)/uShadowSize,sc.z-bias));
 return shadow/9.;
}
void main(){
 vec3 n=normalize(vNormal),view=normalize(uEye-vWorld),sun=normalize(uSun);
 float tile=vMaterial.z,leaf=step(tile,-.5),alpha=vColor.a;
 vec3 base=vColor.rgb;float textureHeight=0.;
 if(leaf>.5){
  vec4 tex=texture(uLeaves,vec3(clamp(vUV,.001,.999),-tile-1.));if(tex.a<.58)discard;
  base=pow(tex.rgb,vec3(2.2))*vColor.rgb;n=gl_FrontFacing?n:-n;
 }else if(tile>.5){
  vec3 an=abs(n);vec2 uv=an.y>an.x&&an.y>an.z?vWorld.xz:an.x>an.z?vWorld.zy:vWorld.xy;
  float scale=uViewModel>.5?9.:.42;if(tile==5.||tile==6.||tile==7.||tile==8.||tile==13.||tile==14.)scale=.7;
  vec3 tex=texture(uSurfaces,vec3(uv*scale,tile-1.)).rgb;
  textureHeight=dot(tex,vec3(.299,.587,.114));base=pow(tex,vec3(2.2))*mix(vec3(1.),vColor.rgb,.65);
  vec3 dpdx=dFdx(vWorld),dpdy=dFdy(vWorld),r1=cross(dpdy,n),r2=cross(n,dpdx);float det=dot(dpdx,r1);
  vec3 grad=(r1*dFdx(textureHeight)+r2*dFdy(textureHeight))*sign(det)/max(abs(det),.0001);
  n=normalize(n-grad*(uViewModel>.5?.0008:.026));
 }
 float ndl=max(dot(n,sun),0.),ndv=max(dot(n,view),.001),shadow=shadowTerm(ndl);
 float rough=clamp(vMaterial.x+(textureHeight-.5)*.09,.14,1.),metal=vMaterial.y*(1.-leaf);
 vec3 h=normalize(view+sun);float ndh=max(dot(n,h),0.),vdh=max(dot(view,h),0.),a=rough*rough,a2=a*a,d=ndh*ndh*(a2-1.)+1.;
 float D=a2/(3.14159*d*d+.0001),k=(rough+1.)*(rough+1.)/8.,G=ndl/(ndl*(1.-k)+k)*ndv/(ndv*(1.-k)+k);
 vec3 F0=mix(vec3(.04),base,metal),F=F0+(1.-F0)*pow(1.-vdh,5.);
 vec3 specular=D*G*F/max(4.*ndl*ndv,.001);
 vec3 skyLight=mix(vec3(.095,.10,.075),vec3(.33,.40,.47),n.y*.5+.5);
 float contact=mix(.66,1.,smoothstep(0.,1.7,max(vWorld.y,0.)));
 vec3 reflection=pow(texture(uEnvironment,environmentUV(reflect(-view,n))).rgb,vec3(2.2));
 vec3 lit=base*skyLight*contact*(1.-metal*.5);
 lit+=(base*(1.-metal)/3.14159+specular)*ndl*vec3(3.7,3.35,2.78)*mix(.07,1.,shadow);
 lit+=reflection*F0*(.26+(1.-rough)*.60);
 if(leaf>.5)lit+=base*(.13+.35*pow(max(dot(-sun,view),0.),3.))*mix(.5,1.,shadow);
 if(uViewModel>.5)lit+=base*.26+vec3(.08,.1,.11)*pow(max(dot(n,normalize(vec3(-.5,.8,1.))),0.),3.)*metal;
 lit+=base*max(vMaterial.w,0.);
 vec3 color=pow(aces(lit*1.15),vec3(1./2.2));
 float fog=uViewModel>.5?0.:1.-exp(-length(uEye-vWorld)*.0048);color=mix(color,uFog,fog);
 outColor=vec4(color,alpha);
}`;
export const shadowVertex=`#version 300 es
precision highp float;
layout(location=0)in vec3 aPosition;layout(location=2)in vec2 aUV;layout(location=3)in mat4 aModel;layout(location=8)in vec4 aMaterial;
uniform mat4 uVP;uniform float uTime;out vec2 vUV;out float vLeaf;
void main(){vec4 p=aModel*vec4(aPosition,1.);vUV=aUV;vLeaf=aMaterial.z;if(vLeaf<-.5)p.x+=sin(uTime*1.2+p.z*.4+p.x*.7)*.055*pow(1.-aUV.y,2.);gl_Position=uVP*p;}`;
export const shadowFragment=`#version 300 es
precision highp float;precision highp sampler2DArray;
in vec2 vUV;in float vLeaf;uniform sampler2DArray uLeaves;
void main(){if(vLeaf<-.5&&texture(uLeaves,vec3(clamp(vUV,.001,.999),-vLeaf-1.)).a<.58)discard;}`;
export const skyVertex=`#version 300 es
precision highp float;out vec2 vUV;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p*2.-1.;gl_Position=vec4(vUV,1.,1.);}`;
export const skyFragment=`#version 300 es
precision highp float;
in vec2 vUV;uniform sampler2D uEnvironment;uniform vec3 uSky,uFog,uSun;uniform vec2 uAngle,uLens;uniform float uTime;out vec4 outColor;
void main(){
 vec3 d=normalize(vec3(vUV.x*uLens.x*uLens.y,vUV.y*uLens.y,-1.));float sp=sin(uAngle.y),cp=cos(uAngle.y);d=vec3(d.x,d.y*cp-d.z*sp,d.y*sp+d.z*cp);
 float sy=sin(-uAngle.x),cy=cos(-uAngle.x);d=vec3(d.x*cy+d.z*sy,d.y,-d.x*sy+d.z*cy);
 vec2 uv=vec2(abs(fract(atan(d.z,d.x)/6.28318)*2.-1.),clamp(.74-asin(clamp(d.y,-1.,1.))*.6,.01,.99));
 vec3 c=texture(uEnvironment,uv).rgb;
 c=mix(c,mix(uFog,uSky,smoothstep(0.,.5,d.y)),.13);outColor=vec4(c,1.);
}`;
export const postFragment=`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uScene;uniform vec2 uPixel;out vec4 outColor;
void main(){
 vec2 uv=vUV*.5+.5;vec3 c=texture(uScene,uv).rgb;
 vec3 n=texture(uScene,uv+vec2(0,uPixel.y)).rgb,s=texture(uScene,uv-vec2(0,uPixel.y)).rgb,e=texture(uScene,uv+vec2(uPixel.x,0)).rgb,w=texture(uScene,uv-vec2(uPixel.x,0)).rgb;
 vec3 l=vec3(.299,.587,.114);float hi=max(dot(c,l),max(max(dot(n,l),dot(s,l)),max(dot(e,l),dot(w,l)))),lo=min(dot(c,l),min(min(dot(n,l),dot(s,l)),min(dot(e,l),dot(w,l))));
 float edge=smoothstep(.05,.22,hi-lo);c=mix(c,(n+s+e+w+c*4.)/8.,edge*.7);
 c=mix(vec3(dot(c,l)),c,1.045);float vignette=1.-dot(uv-.5,uv-.5)*.17;outColor=vec4(clamp(c*vignette,0.,1.),1.);
}`;
