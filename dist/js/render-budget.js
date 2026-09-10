// Pure budget functions keep pixel work bounded even on large external displays.
export function framebufferSize(width,height,dpr,scale,maxPixels){
 const ratio=Math.min(dpr,2)*scale,w=Math.max(2,Math.floor(width*ratio)),h=Math.max(2,Math.floor(height*ratio));
 const reduction=Math.min(1,Math.sqrt(maxPixels/(w*h)));
 return {width:Math.max(2,Math.floor(w*reduction)),height:Math.max(2,Math.floor(h*reduction))};
}
export function sceneryOcclusion(part,arena){
 if(part.ground||part.leaf!==undefined||part.emissive>0)return 1;
 const floor=part.y-part.h*.5;
 // Baked ambient attenuation under roofs; direct shadows remain dynamic.
 if(arena.indoors({x:part.x,y:part.y+part.h*.45,z:part.z}))return .76;
 return floor<.3&&part.h>.5?.94:1;
}
