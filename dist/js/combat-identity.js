// Team relations, marker text and armour colours share one player-relative rule.
export const IDENTITIES={
 self:{key:'self',label:'YOU',symbol:'◆',color:'#70e5f5',band:[.10,.72,.91],cloth:[.12,.24,.30]},
 ally:{key:'ally',label:'ALLY',symbol:'◆',color:'#70e5f5',band:[.10,.72,.91],cloth:[.12,.24,.30]},
 enemy:{key:'enemy',label:'ENEMY',symbol:'▼',color:'#ff786e',band:[.94,.16,.11],cloth:[.39,.24,.19]}
};
export function identityFor(actor,player,rules){return IDENTITIES[actor.id===player.id?'self':rules.enemies(player,actor)?'enemy':'ally'];}
export function canIdentify(game,actor){
 if(actor.id===game.player.id||actor.dead||game.player.dead||game.player.flashed>.3)return false;
 return Math.hypot(actor.x-game.player.x,actor.z-game.player.z)<65&&game.canSee(game.player,actor);
}
