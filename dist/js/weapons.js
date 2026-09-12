import {clamp,lerp} from './math.js?v=25';
// All distances are metres. Rates and timings drive the simulation, models and audio.
const specs=[
 ['Kestrel AR','RIFLE',29,700,30,2.2,.019,.016,42,.19,1,true,1],
 ['Bastion 7','RIFLE',39,510,24,2.55,.030,.019,50,.25,1,true,2],
 ['Raptor C','RIFLE',23,950,32,2.1,.015,.022,34,.18,1,true,3],
 ['Vesper 9','SMG',21,1150,36,1.65,.016,.028,20,.12,1,true,1],
 ['Lynx PDW','SMG',25,760,28,1.8,.012,.017,31,.14,1,true,2],
 ['Breach 12','SHOTGUN',18,68,7,.52,.065,.076,12,.23,8,false,1],
 ['Tempest S','SHOTGUN',13,188,8,2.7,.044,.09,10,.23,8,false,3],
 ['Longbow M','SNIPER',90,48,5,3,.082,.065,100,.38,1,false,2],
 ['Warden D','MARKSMAN',53,214,15,2.45,.038,.038,75,.26,1,false,1],
 ['Atlas L','LMG',31,612,80,4.5,.025,.035,55,.34,1,true,3],
 ['Sable P','PISTOL',31,316,15,1.3,.024,.027,23,.1,1,false,1],
 ['Dire 50','PISTOL',59,167,7,1.65,.061,.035,32,.15,1,false,2],
 ['Field blade','MELEE',125,92,1,0,0,0,2.2,.1,1,false,1],
 ['Harrow B3','RIFLE',30,840,27,2.3,.018,.018,48,.21,1,false,1],
 ['Marten 45','SMG',34,540,24,1.95,.024,.025,26,.15,1,true,1]
];
export const WEAPONS=specs.map((s,id)=>{const[name,kind,damage,rpm,magazine,reload,recoil,spread,range,ads,pellets,automatic,unlock]=s;return{id,name,kind,damage,rpm,magazine,reload,recoil,spread,range,ads,pellets,automatic,unlock,burst:id===13?3:0,interval:60/rpm};});
export const PRIMARY_IDS=WEAPONS.filter(w=>!['PISTOL','MELEE'].includes(w.kind)).map(w=>w.id);
export const GUN_ORDER=[0,1,2,13,3,4,14,5,6,9,8,7,10,11,12];
export const ATTACHMENTS={optic:['Iron sights','Reflex','Prism sight','4× optic'],barrel:['Standard barrel','Suppressor','Compensator'],handling:['Standard grip','Foregrip','Laser','Light stock','Extended magazine']};
export const defaultLoadout=()=>({primary:0,secondary:10,optic:1,barrel:0,handling:0,equipment:'frag'});
export function sanitizeLoadout(v={}){if(!v||typeof v!=='object')v={};const d=defaultLoadout();for(const k of ['primary','secondary','optic','barrel','handling'])if(Number.isFinite(v[k]))d[k]=Math.round(v[k]);d.primary=PRIMARY_IDS.includes(d.primary)?d.primary:clamp(d.primary,0,9);d.secondary=clamp(d.secondary,10,11);d.optic=clamp(d.optic,0,3);d.barrel=clamp(d.barrel,0,2);d.handling=clamp(d.handling,0,4);d.equipment=['frag','smoke','flash'].includes(v.equipment)?v.equipment:'frag';return d;}
export class Weapon {
 constructor(id,loadout={}){this.def=WEAPONS[Number.isFinite(id)?clamp(Math.floor(id),0,WEAPONS.length-1):0];this.optic=loadout.optic??(id===7?3:0);this.barrel=loadout.barrel??0;this.grip=loadout.handling??0;this.ammo=this.capacity;this.reserve=this.capacity*5;this.cooldown=0;this.burstRemaining=0;this.reloadLeft=0;this.reloadStartedEmpty=false;this.sinceShot=10;this.shotIndex=0;}
 get capacity(){return this.def.magazine+(this.grip===4?Math.max(2,Math.floor(this.def.magazine/3)):0);}
 get recoil(){const climb=this.def.automatic?lerp(.92,1.12,clamp(this.shotIndex/9,0,1)):1;return this.def.recoil*climb*(this.barrel===2?.72:1)*(this.grip===1?.8:1);}
 get adsTime(){return this.def.ads*(this.grip===3?.75:1)*(this.grip===4?1.15:1)*(this.optic===3?1.2:1);}
 get reloadTime(){return this.def.reload*(this.grip===4?1.15:1);}
 get range(){return this.def.range*(this.barrel===1?.85:1);}
 reload(){if(this.reloadLeft>0||this.ammo>=this.capacity||this.reserve<=0||this.def.id===12)return false;this.burstRemaining=0;this.reloadStartedEmpty=this.ammo===0;this.reloadLeft=this.reloadTime;return true;}
 update(dt){this.cooldown=Math.max(0,this.cooldown-dt);this.sinceShot+=dt;if(this.sinceShot>.4)this.shotIndex=0;if(this.reloadLeft<=0)return false;this.reloadLeft-=dt;if(this.reloadLeft>0)return false;const n=Math.min(this.def.id===5?1:this.capacity-this.ammo,this.reserve);this.ammo+=n;this.reserve-=n;this.reloadLeft=this.def.id===5&&this.ammo<this.capacity&&this.reserve>0?this.reloadTime:0;return true;}
 damage(d,part='body'){return this.def.damage*lerp(1,.48,clamp((d-this.range)/(this.range*1.1),0,1))*(part==='head'?(this.def.id===7?2:1.9):part==='leg'?.75:1);}
 spread(ads,moving,crouched){return this.def.spread*lerp(1,this.def.id===7?.003:.16,ads)*(moving?1.45:1)*(crouched?.72:1)*(this.grip===2?.74:1)*(this.sinceShot>.35&&!moving?.45:1)*(this.def.automatic?1+clamp((this.shotIndex-2)/12,0,.38):1);}
 reset(){this.burstRemaining=0;this.ammo=this.capacity;this.reserve=this.capacity*5;this.reloadLeft=0;this.reloadStartedEmpty=false;this.cooldown=0;this.shotIndex=0;this.sinceShot=10;}
}
