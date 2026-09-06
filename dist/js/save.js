import {sanitizeLoadout,defaultLoadout} from './weapons.js';
const KEY='breachline-save-v1';
export const DEFAULT_SETTINGS={quality:'auto',fov:80,sensitivity:1,adsSensitivity:.6,aimAcceleration:false,adsMode:'toggle',autoSprint:false,leftHanded:false,gyro:false,gyroSensitivity:1,motion:true,volume:.75,music:.22,haptics:true,opacity:.7,buttonScale:1,layout:{}};
export class SaveStore {
 constructor(storage=globalThis.localStorage){this.storage=storage;this.error=false;this.data={version:1,xp:0,matches:0,wins:0,kills:0,deaths:0,bestStreak:0,weaponXP:{},unlockAll:false,loadout:defaultLoadout(),settings:{...DEFAULT_SETTINGS,layout:{}}};
  try{const d=JSON.parse(storage?.getItem(KEY)||'null');if(d&&d.version===1){for(const k of ['xp','matches','wins','kills','deaths','bestStreak'])if(Number.isFinite(d[k]))this.data[k]=Math.max(0,d[k]);this.data.unlockAll=d.unlockAll===true;this.data.weaponXP=d.weaponXP&&typeof d.weaponXP==='object'?d.weaponXP:{};this.data.loadout=sanitizeLoadout(d.loadout);this.data.settings={...DEFAULT_SETTINGS,...d.settings};this.sanitize();}}catch{this.error=true;}
 }
 sanitize(){const s=this.data.settings;for(const [k,a,b]of [['fov',65,100],['sensitivity',.2,2.5],['adsSensitivity',.2,1.5],['gyroSensitivity',.2,2],['volume',0,1],['music',0,.6],['opacity',.25,1],['buttonScale',.7,1.4]])s[k]=Number.isFinite(+s[k])?Math.max(a,Math.min(b,+s[k])):DEFAULT_SETTINGS[k];if(!['auto','low','medium','high'].includes(s.quality))s.quality='auto';if(!['toggle','hold'].includes(s.adsMode))s.adsMode='toggle';if(!s.layout||typeof s.layout!=='object')s.layout={};}
 get level(){return 1+Math.floor(Math.sqrt(this.data.xp/450));}
 get nextXP(){return this.level*this.level*450;}
 unlocked(weapon){return this.data.unlockAll||weapon.unlock<=this.level;}
 persist(){try{this.storage?.setItem(KEY,JSON.stringify(this.data));this.error=false;return true;}catch{this.error=true;return false;}}
 finish(result){this.data.xp+=result.xp;this.data.matches++;this.data.wins+=Number(result.win);this.data.kills+=result.kills;this.data.deaths+=result.deaths;this.data.bestStreak=Math.max(this.data.bestStreak,result.streak);for(const [id,n]of Object.entries(result.weaponKills))this.data.weaponXP[id]=(this.data.weaponXP[id]??0)+n*100;return this.persist();}
}
