// Advance a deadline rather than counting from the last rendered frame. This
// preserves the requested average when the display refresh is not a multiple
// of the cap, and drops missed deadlines without a burst of catch-up renders.
export class FramePacer {
 constructor(){this.reset();}
 reset(){this.next=null;this.rate=0;this.lastTime=null;}
 accept(now,requested=60){
  if(!Number.isFinite(now))return false;
  const rate=Number.isFinite(requested)&&requested>0?requested:60,interval=1000/rate;
  if(this.next===null||rate!==this.rate||now<this.lastTime||now-this.next>interval*4){
   this.rate=rate;this.next=now+interval;this.lastTime=now;return true;
  }
  this.lastTime=now;
  if(now<this.next-.25)return false;
  this.next+=interval*(1+Math.floor(Math.max(0,now-this.next)/interval));
  return true;
 }
}
