import {distance} from './math.js?v=20';
// A small layered navigation grid includes room floors and reachable stairs/terraces.
// Connectivity is baked once per match; A* runs at most once per bot per second.
export class Navigation {
 constructor(arena){
  this.arena=arena;this.step=1.25;this.size=arena.info.size;this.n=Math.ceil(this.size*2/this.step);this.cells=Array.from({length:this.n*this.n},()=>[]);this.nodes=[];
  for(let iz=1;iz<this.n-1;iz++)for(let ix=1;ix<this.n-1;ix++){
   const x=-this.size+(ix+.5)*this.step,z=-this.size+(iz+.5)*this.step,levels=[0];
   for(const b of arena.blocks){let top=b.y+b.h/2;if(top>.1&&top<=4.8&&Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2)levels.push(top);}
   for(const y of [...new Set(levels)])if(!arena.collides({x,y:y+.04,z},.34,1.75)){const id=this.nodes.length;this.nodes.push({x,y,z,id,ix,iz,links:[]});this.cells[iz*this.n+ix].push(id);}
  }
  for(const node of this.nodes)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const ix=node.ix+dx,iz=node.iz+dz;if(ix<0||ix>=this.n||iz<0||iz>=this.n)continue;
   for(const id of this.cells[iz*this.n+ix]){let to=this.nodes[id];if(Math.abs(to.y-node.y)>.36)continue;
    if(dx&&dz&&(arena.collides({x:node.x,y:Math.max(node.y,to.y)+.05,z:to.z},.34,1.75)||arena.collides({x:to.x,y:Math.max(node.y,to.y)+.05,z:node.z},.34,1.75)))continue;
    if(this.walkable(node,to))node.links.push(id);
   }
  }
  this.g=new Float32Array(this.nodes.length);this.previous=new Int32Array(this.nodes.length);this.closed=new Uint8Array(this.nodes.length);
 }
 // Sweep a standing capsule along each edge, including intermediate step heights.
 walkable(from,to){
  const length=Math.hypot(to.x-from.x,to.z-from.z),steps=Math.max(1,Math.ceil(length/.25));
  let y=from.y;const p={x:from.x,y,z:from.z};
  for(let i=1;i<=steps;i++){const t=i/steps;p.x=from.x+(to.x-from.x)*t;p.z=from.z+(to.z-from.z)*t;
   const floor=this.arena.floorAt(p,y+.36);if(floor<y-.37)return false;y=floor;p.y=y+.04;
   if(this.arena.collides(p,.34,1.75))return false;
  }
  return Math.abs(y-to.y)<.12;
 }
 nearest(p){let best=-1,cost=Infinity,ix=Math.floor((p.x+this.size)/this.step),iz=Math.floor((p.z+this.size)/this.step);for(let r=0;r<=5;r++){for(let z=Math.max(0,iz-r);z<=Math.min(this.n-1,iz+r);z++)for(let x=Math.max(0,ix-r);x<=Math.min(this.n-1,ix+r);x++)for(const id of this.cells[z*this.n+x]){const n=this.nodes[id],d=distance(p,n)+Math.abs(n.y-p.y)*3;if(d<cost){cost=d;best=id;}}if(best>=0)break;}return best;}
 path(from,to){
  const start=this.nearest(from),goal=this.nearest(to);if(start<0||goal<0)return[];
  this.g.fill(Infinity);this.previous.fill(-1);this.closed.fill(0);this.g[start]=0;
  const heap=[];const push=(id,f)=>{let i=heap.length;heap.push({id,f});while(i){let p=(i-1)>>1;if(heap[p].f<=f)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const root=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){let a=i*2+1,b=a+1,j=i;if(a<heap.length&&heap[a].f<heap[j].f)j=a;if(b<heap.length&&heap[b].f<heap[j].f)j=b;if(j===i)break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}return root.id;};
  push(start,0);let reached=start,best=distance(from,to),count=0;
  while(heap.length&&count++<5000){const id=pop();if(this.closed[id])continue;this.closed[id]=1;const n=this.nodes[id],h=distance(n,this.nodes[goal]);if(h<best){best=h;reached=id;}if(id===goal){reached=id;break;}
   for(const next of n.links){if(this.closed[next])continue;let t=this.g[id]+distance(n,this.nodes[next])+Math.abs(n.y-this.nodes[next].y);if(t<this.g[next]){this.g[next]=t;this.previous[next]=id;push(next,t+distance(this.nodes[next],this.nodes[goal]));}}
  }
  const path=[];for(let id=reached;id!==start&&id!==-1;id=this.previous[id])path.push(this.nodes[id]);return path.reverse();
 }
}
