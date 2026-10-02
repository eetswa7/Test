// Multipliers are baked once per equipped weapon, never rebuilt while firing.
export const ATTACHMENT_SPECS={
 optic:[
  {name:'Iron sights',zoom:1.35,description:'Fast, unobstructed aiming.'},
  {name:'Reflex',zoom:1.35,description:'Clear close-range sight picture.'},
  {name:'Prism sight',zoom:2,ads:1.06,description:'2× magnification; slightly slower aim.'},
  {name:'4× optic',zoom:4,ads:1.2,description:'4× magnification for long-range lanes.'},
  {name:'Holographic',zoom:1.6,ads:1.03,description:'Wide 1.6× sight picture.'},
  {name:'2.5× combat optic',zoom:2.5,ads:1.12,description:'Medium-range magnification with faster aim than 4×.'},
  {name:'6× precision optic',zoom:6,ads:1.32,description:'6× magnification; slower close-range aim.'}
 ],
 barrel:[
  {name:'Standard barrel',description:'Balanced range and handling.'},
  {name:'Suppressor',range:.88,recoil:.94,ads:1.04,noise:.27,description:'73% smaller gunshot hearing radius; 12% less range.'},
  {name:'Compensator',recoil:.62,horizontal:.5,ads:1.07,description:'38% less recoil, 50% less lateral kick; 7% slower aim.'},
  {name:'Long barrel',range:1.38,recoil:.9,ads:1.18,mobility:.95,description:'38% more range; slower aim and movement.'},
  {name:'Short barrel',range:.8,ads:.76,hip:.86,mobility:1.055,description:'24% faster aim and improved mobility; 20% less range.'},
  {name:'Muzzle brake',recoil:.7,horizontal:.85,ads:1.05,noise:1.3,description:'30% less vertical recoil; louder gunfire.'},
  {name:'Shotgun choke',range:1.22,hip:.6,aim:.65,ads:1.1,kinds:['SHOTGUN'],description:'40% tighter pellet cone, 22% more range; shotgun only.'}
 ],
 handling:[
  {name:'Standard grip',description:'Balanced movement and recoil.'},
  {name:'Foregrip',recoil:.72,moving:.85,ads:1.08,description:'28% less recoil and 15% less movement spread; slower aim.'},
  {name:'Laser',hip:.52,ads:.9,description:'48% tighter hip-fire cone and 10% faster aim.'},
  {name:'Light stock',ads:.7,mobility:1.1,recoil:1.2,description:'30% faster aim, 10% faster movement; 20% more recoil.'},
  {name:'Extended magazine',capacity:1.4,ads:1.15,reload:1.15,mobility:.96,description:'40% more ammunition; slower aim, movement and reload.'},
  {name:'Angled grip',recoil:.86,horizontal:.55,ads:.94,description:'45% less lateral kick and 6% faster aim.'},
  {name:'Precision stock',recoil:.74,aim:.7,ads:1.12,mobility:.92,description:'26% less recoil, 30% tighter aimed fire; slower handling.'},
  {name:'Bipod',recoil:.93,bracedRecoil:.45,bracedSpread:.55,ads:1.1,mobility:.9,description:'Crouch while stationary for 58% less recoil and tighter fire.'},
  {name:'Quickdraw grip',ads:.65,reload:.92,recoil:1.1,description:'35% faster aim, 8% faster reload; 10% more recoil.'}
 ],
 magazine:[
  {name:'Standard magazine',description:'Standard capacity and reload speed.'},
  {name:'Fast magazine',reload:.68,capacity:.9,description:'32% faster reload; 10% fewer rounds.'},
  {name:'Extended magazine',capacity:1.5,ads:1.1,reload:1.12,description:'50% more rounds; slower aim and reload.'},
  {name:'Drum magazine',capacity:2,ads:1.26,reload:1.28,mobility:.9,description:'Double ammunition capacity; heavier and slower to reload.'}
 ],
 ammo:[
  {name:'Standard rounds',description:'Balanced damage and penetration.'},
  {name:'Armour-piercing',penetration:1.65,damage:.94,description:'65% more cover penetration; 6% less direct damage.'},
  {name:'Hollow-point',damage:1.15,head:.83,penetration:.55,range:.8,description:'15% more body damage; weaker penetration and long-range fire.'},
  {name:'Subsonic',noise:.55,range:.85,description:'45% smaller gunshot hearing radius; 15% less range.'}
 ]
};
export const ATTACHMENTS=Object.fromEntries(Object.entries(ATTACHMENT_SPECS).map(([key,list])=>[key,list.map(a=>a.name)]));
export function attachmentIndex(key,value,kind){
 const list=ATTACHMENT_SPECS[key],index=Number.isFinite(value)?Math.max(0,Math.min(list.length-1,Math.round(value))):0;
 return list[index].kinds&&!list[index].kinds.includes(kind)?0:index;
}
export function attachmentProfile(selection,kind){
 const out={recoil:1,horizontal:1,ads:1,range:1,mobility:1,hip:1,aim:1,moving:1,reload:1,capacity:1,noise:1,damage:1,head:1,penetration:1,bracedRecoil:1,bracedSpread:1};
 for(const key of Object.keys(ATTACHMENT_SPECS)){
  const spec=ATTACHMENT_SPECS[key][selection[key]??0];
  for(const stat of Object.keys(out))if(spec[stat]!==undefined){
   // Old saved handling magazines and the new magazine slot never double-stack.
   if(stat==='capacity')out.capacity=Math.max(out.capacity===1?0:out.capacity,spec[stat]);
   else out[stat]*=spec[stat];
  }
 }
 if(kind==='MELEE')for(const key of Object.keys(out))out[key]=1;
 return out;
}
