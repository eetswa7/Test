import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/engine.js';
import {MODES,HARDPOINT_SECONDS,TAG_LIFETIME,MAX_TAGS} from '../dist/js/modes.js';
import {updateBot} from '../dist/js/ai.js';
import {MAPS} from '../dist/js/maps.js';

function fixture(mode) {
 const game=new Game({mode},{seed:892});
 game.arena.blocks=[{x:0,y:-.2,z:0,w:200,h:.4,d:200,ground:true,surface:'concrete'}];
 game.actors=game.actors.filter(a=>a.id===0||a.id===4);
 const player=game.player,enemy=game.actors[1];
 player.reset({x:-20,y:0,z:0},0);enemy.reset({x:20,y:0,z:0},Math.PI);
 player.spawnProtection=enemy.spawnProtection=0;
 return {game,player,enemy,rules:game.rules};
}
function place(actor,p){actor.x=p.x;actor.y=p.y;actor.z=p.z;}

test('new objective modes are selectable, respawn-enabled team matches',()=>{
 assert.equal(new Set(MODES.map(m=>m.id)).size,7);
 for(const mode of ['hardpoint','confirmed']){
  const {rules}=fixture(mode);assert.equal(rules.mode.id,mode);assert(rules.mode.teams);assert(rules.respawns);
 }
 const last=new Game({map:MAPS.length-1});assert.equal(last.config.map,MAPS.length-1);
 assert.equal(new Game({map:999}).config.map,MAPS.length-1);
});

test('hardpoint scores exclusive occupation, stops on contest, and ignores dead occupants',()=>{
 const {game,player,enemy,rules}=fixture('hardpoint'),point=rules.points[rules.activePoint];
 place(player,point);rules.update(2.1,game);assert.deepEqual(rules.scores,[2,0]);assert.equal(point.owner,0);
 place(enemy,point);rules.update(3,game);assert(point.contested);assert.deepEqual(rules.scores,[2,0]);
 enemy.health=0;rules.update(1,game);assert(!point.contested);assert.deepEqual(rules.scores,[3,0]);
 player.y=point.y+3;rules.update(2,game);assert.deepEqual(rules.scores,[3,0]);assert.equal(point.owner,-1);
});

test('hardpoint rotates, clears previous control, and scores the new zone',()=>{
 const {game,player,enemy,rules}=fixture('hardpoint'),oldIndex=rules.activePoint,old=rules.points[oldIndex];
 place(player,old);enemy.health=0;rules.update(HARDPOINT_SECONDS,game);
 assert.equal(rules.activePoint,(oldIndex+1)%rules.points.length);
 assert.equal(rules.rotationRemaining,HARDPOINT_SECONDS);assert.equal(old.owner,-1);assert.equal(rules.scores[0],HARDPOINT_SECONDS);
 rules.update(2,game);assert.equal(rules.scores[0],HARDPOINT_SECONDS);
 place(player,rules.points[rules.activePoint]);rules.update(1,game);assert.equal(rules.scores[0],HARDPOINT_SECONDS+1);
 assert(game.events.some(e=>e.text?.startsWith('HARDPOINT MOVED')));
});

test('hardpoint finishes at the score limit and objective modes resolve time-limit ties',()=>{
 const {game,player,rules}=fixture('hardpoint');place(player,rules.points[rules.activePoint]);
 rules.scores[0]=rules.mode.limit-1;rules.update(1,game);assert.equal(rules.phase,'finished');assert.equal(rules.winner,0);
 for(const mode of ['hardpoint','confirmed']){
  const f=fixture(mode);f.rules.time=.01;f.rules.update(.02,f.game);assert.equal(f.rules.phase,'finished');assert.equal(f.rules.winner,-1);
 }
});

test('confirmed drops a tag without kill score, then awards one proximity confirmation',()=>{
 const {game,player,enemy,rules}=fixture('confirmed');
 game.damage(enemy,200,player);assert.equal(player.kills,1);assert.equal(rules.scores[0],0);assert.equal(rules.tags.length,1);
 const tag=rules.tags[0];assert.equal(tag.team,enemy.team);assert.equal(tag.owner,enemy.id);
 place(player,tag);rules.update(.02,game);assert.equal(rules.tags.length,0);assert.equal(rules.scores[0],1);assert.equal(player.confirms,1);
 rules.update(1,game);assert.equal(rules.scores[0],1);
});

test('allied tags are denied without points and dead actors cannot collect',()=>{
 const {game,player,enemy,rules}=fixture('confirmed');game.damage(enemy,200,player);
 rules.update(.1,game);assert.equal(rules.tags.length,1);assert.equal(enemy.denies,0);
 enemy.health=100;rules.update(.1,game);assert.equal(rules.tags.length,0);assert.equal(enemy.denies,1);assert.deepEqual(rules.scores,[0,0]);
});

test('tag collection respects walls and floors and tags expire within a bounded budget',()=>{
 const {game,player,enemy,rules}=fixture('confirmed');player.x=0;enemy.x=1;game.damage(enemy,200,player);
 game.arena.blocks.push({x:.5,y:1,z:0,w:.2,h:2,d:4,surface:'concrete'});
 rules.update(.02,game);assert.equal(rules.tags.length,1);
 game.arena.blocks.pop();player.y=3;rules.update(.02,game);assert.equal(rules.tags.length,1);
 player.x=-20;player.y=0;
 for(let i=0;i<MAX_TAGS+4;i++){enemy.health=100;game.damage(enemy,200,player);}
 assert.equal(rules.tags.length,MAX_TAGS);
 rules.update(TAG_LIFETIME,game);assert.equal(rules.tags.length,0);
});

test('last tag confirmation ends a match and freezing a completed match preserves score',()=>{
 const {game,player,enemy,rules}=fixture('confirmed');rules.scores[0]=rules.mode.limit-1;
 game.damage(enemy,200,player);place(player,enemy);rules.update(.02,game);
 assert.equal(rules.phase,'finished');assert.equal(rules.winner,0);assert.equal(rules.scores[0],rules.mode.limit);
 rules.update(1,game);assert.equal(rules.scores[0],rules.mode.limit);
});

test('bots select hold positions and recover both enemy and allied tags',()=>{
 for(const mode of ['hardpoint','confirmed']){
  const game=new Game({mode},{seed:781}),bot=game.actors[1];
  for(const a of game.actors)if(a!==bot)a.health=0;
  if(mode==='confirmed')game.rules.tags.push({id:1,x:bot.x+6,y:bot.y,z:bot.z,team:1,owner:4,age:0});
  bot.aiClock=0;updateBot(bot,1/60,game);
  if(mode==='hardpoint'){
   const p=game.rules.points[game.rules.activePoint];assert.equal(bot.state,'objective');assert(Math.hypot(bot.goal.x-p.x,bot.goal.z-p.z)<4.2);
  }else{
   assert.equal(bot.state,'collect');assert.equal(bot.goal.id,1);game.rules.tags[0].team=bot.team;bot.aiClock=0;updateBot(bot,1/60,game);assert.equal(bot.state,'collect');
  }
 }
});

test('bots earn objective scores and both new modes finish on every map',()=>{
 for(const mode of ['hardpoint','confirmed'])for(const map of MAPS){
  const game=new Game({mode,map:map.id},{seed:9281});
  for(let i=0;i<15000&&game.rules.phase!=='finished';i++){game.update(1/30);game.events.length=0;}
  assert.equal(game.rules.phase,'finished',`${mode} on ${map.name} must finish`);
  assert(game.rules.scores[0]+game.rules.scores[1]>0,`${mode} on ${map.name} bots must play their objective`);
 }
});
