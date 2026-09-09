// Original, metre-scaled view models. Forward is -Z; optics share aim.js heights.
// Only weapon construction allocates. Animation modifies cached parts in place.
const C={steel:[.27,.30,.32],edge:[.42,.45,.46],black:[.115,.13,.14],polymer:[.16,.175,.17],tan:[.48,.39,.27],olive:[.28,.32,.22],wood:[.48,.29,.145],rubber:[.043,.048,.044],glove:[.36,.38,.30],sleeve:[.23,.28,.22],brass:[.66,.44,.16],red:[.55,.055,.025]};
const finish=(color=C.black,metal=.72,rough=.39,tile=-1)=>({color,metal,rough,tile,...(tile===9?{finishTile:2}:tile===-1&&metal>.45?{finishTile:0}:{})});
const METAL=finish(),EDGE=finish(C.edge,.88,.28),POLY={...finish(C.polymer,0,.7),finishTile:3},RUBBER=finish(C.rubber,0,.87),WOOD=finish(C.wood,0,.71,10),TAN={...finish(C.tan,.08,.63),finishTile:1},OLIVE={...finish(C.olive,.08,.64),finishTile:1},BRASS={...finish(C.brass,.92,.31),finishTile:undefined},GLOVE=finish(C.glove,0,.94,9),SLEEVE=finish(C.sleeve,0,.98,9);
const PROFILES=[
 {barrel:-.604,grip:.103,support:-.293,width:.088,mag:.017,stock:.278},
 {barrel:-.668,grip:.109,support:-.302,width:.105,mag:-.01,stock:.298},
 {barrel:-.472,grip:-.078,support:-.272,width:.10,mag:.151,stock:.265},
 {barrel:-.346,grip:.052,support:-.157,width:.078,mag:.052,stock:.241},
 {barrel:-.429,grip:.078,support:-.209,width:.11,mag:.035,stock:.229},
 {barrel:-.741,grip:.10,support:-.333,width:.096,stock:.322},
 {barrel:-.678,grip:.096,support:-.299,width:.102,mag:.002,stock:.286},
 {barrel:-.908,grip:.122,support:-.33,width:.094,mag:-.028,stock:.354},
 {barrel:-.734,grip:.115,support:-.329,width:.097,mag:-.006,stock:.317},
 {barrel:-.746,grip:.14,support:-.359,width:.14,mag:-.036,stock:.304},
 {barrel:-.183,grip:.045,support:.025,width:.071,mag:.045},
 {barrel:-.251,grip:.053,support:.03,width:.086,mag:.053},
 {barrel:-.312,grip:.035,support:0,width:.046}
];

function builder(w){
 const parts=[],profile=PROFILES[w.def.id]??PROFILES[0];
 const box=(x,y,z,a,b,c,mat=METAL,tag='',extra={})=>{
  const q={x,y,z,w:a,h:b,d:c,surface:'dark',mesh:'bevel',yaw:0,pitch:0,roll:0,...mat,...extra};
  if(tag)q.tag=tag;parts.push(q);return q;
 };
 const cyl=(x,y,z,r,len,mat=METAL,tag='',extra={})=>box(x,y,z,r,len,r,mat,tag,{mesh:'cylinder',pitch:Math.PI/2,...extra});
 const tube=(x,y,z,r,len,mat=METAL,tag='',extra={})=>cyl(x,y,z,r,len,mat,tag,{mesh:'tube',...extra});
 const pin=(x,y,z,r=.008)=>cyl(x,y,z,r,.003,EDGE,'',{pitch:0,roll:Math.PI/2});
 const rail=(start,end,y=.092,width=.068)=>{box(0,y-.006,(start+end)/2,width,.014,Math.abs(end-start),METAL);for(let z=start;z>end;z-=.022)box(0,y+.005,z,width+.008,.012,.01,EDGE,'',{mesh:'cube'});};
 const ribs=(x,y,z,n,step,ww,hh,dd,mat=RUBBER,tag='')=>{for(let i=0;i<n;i++)box(x,y,z-i*step,ww,hh,dd,mat,tag,{mesh:'cube'});};
 const vents=(width,start,n,step=.039,height=.028)=>{for(const side of [-1,1])for(let i=0;i<n;i++)box(side*width,.046,start-i*step,.0025,height,.023,RUBBER);};
 const receiver=(z,len,width=.09,mat=METAL)=>{box(0,.034,z,width,.092,len,mat);box(0,-.023,z+.018,width*.9,.044,len*.88,mat);box(width*.51,.041,z-.014,.002,.026,.083,RUBBER);box(width*.53,.037,z-.002,.004,.013,.063,EDGE,'bolt');for(const pz of [z-len*.32,z+len*.29])for(const s of [-1,1])pin(s*width*.51,-.006,pz);};
 const grip=(z=.103,mat=POLY,pitch=-.18,height=.168)=>{box(0,-.104,z,.061,height,.079,mat,'',{pitch});box(0,-.19,z-.014,.069,.014,.081,RUBBER);for(const s of [-1,1])for(let i=0;i<4;i++)box(s*.031,-.068-i*.029,z-i*.004,.002,.012,.05,RUBBER,'',{pitch});box(0,-.085,z-.076,.06,.013,.096,METAL);box(0,-.056,z-.119,.06,.064,.012,METAL);box(0,-.055,z-.063,.009,.042,.012,EDGE,'',{pitch:.33});};
 const magazine=(z,height=.215,width=.067,depth=.093,mat=POLY,curve=.1)=>{box(0,-.091-height*.24,z,width,height*.66,depth,mat,'magazine',{pitch:-curve});box(0,-.091-height*.73,z-height*.06,width,height*.43,depth,mat,'magazine',{pitch:-curve*1.7});box(0,-.098-height*.94,z-height*.12,width+.009,.014,depth+.013,RUBBER,'magazine');for(const s of [-1,1])for(let i=0;i<3;i++)box(s*(width*.5+.001),-.111-i*height*.21,z-.012,width*.03,.04,depth*.68,EDGE,'magazine',{pitch:-curve});};
 const stock=(z,mat=POLY,type='telescopic')=>{if(type==='telescopic'){cyl(0,.026,z-.056,.035,.174,EDGE);box(0,.006,z+.032,.069,.075,.16,mat);box(0,-.035,z+.079,.074,.128,.072,mat);box(0,-.048,z+.121,.083,.161,.021,RUBBER);box(0,-.043,z-.011,.026,.033,.067,RUBBER);}else if(type==='solid'){box(0,-.009,z-.04,.072,.079,.19,mat,'',{pitch:-.09});box(0,-.036,z+.082,.082,.14,.13,mat);box(0,-.043,z+.154,.087,.158,.018,RUBBER);}else{for(const y of [.027,-.072])box(0,y,z,.037,.026,.21,mat,'',{pitch:y>0?0:-.1});box(0,-.024,z+.103,.073,.153,.026,RUBBER);box(0,.053,z+.025,.071,.032,.13,mat);}};
 const barrel=(start,end=profile.barrel,r=.025)=>{cyl(0,.06,(start+end)/2,r,Math.abs(end-start),EDGE);};
 const bipod=z=>{for(const s of [-1,1]){box(s*.057,-.008,z,.019,.026,.22,EDGE,'',{yaw:s*.045});box(s*.057,-.013,z-.117,.029,.022,.043,RUBBER);}cyl(0,-.006,z+.10,.085,.027,METAL,'',{pitch:0});};
 const controls=(width,z=.09)=>{box(-width*.53,-.008,z,.005,.014,.03,EDGE,'',{roll:-.4});box(width*.61,.051,z-.083,.026,.018,.022,METAL,'bolt');box(-width*.56,.004,z-.06,.009,.027,.014,EDGE);};
 return {parts,profile,box,cyl,tube,pin,rail,ribs,vents,receiver,grip,magazine,stock,barrel,bipod,controls};
}

function kestrel(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,controls}=b;
 receiver(-.035,.265,.088);box(0,.029,-.289,.086,.109,.277,POLY);box(0,-.037,-.278,.058,.024,.25,METAL);
 vents(.044,-.191,6);rail(.072,-.407);barrel(-.418);grip();magazine(.017,.215);stock(.278);controls(.088);
 box(-.049,.03,-.105,.012,.021,.04,EDGE);box(.049,.025,-.106,.009,.015,.035,EDGE);
}
function bastion(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,cyl,controls}=b;
 receiver(-.038,.305,.105,finish(C.steel,.86,.34));box(0,.031,-.309,.096,.099,.248,WOOD);box(0,.084,-.309,.081,.027,.227,METAL);
 vents(.049,-.241,5,.035,.019);rail(.083,-.20,.098);barrel(-.426,undefined,.031);cyl(0,.092,-.497,.021,.105,METAL);
 grip(.109,WOOD);magazine(-.01,.232,.073,.12,finish(C.steel,.73,.42),.27);stock(.298,WOOD,'solid');controls(.105);
 box(-.06,.019,.083,.018,.038,.041,EDGE);box(0,.074,.073,.06,.013,.142,METAL);
}
function raptor(b){
 const {box,receiver,barrel,grip,magazine,rail,vents,controls}=b;
 receiver(.025,.398,.10,OLIVE);box(0,.028,-.246,.099,.109,.178,OLIVE);box(0,.013,.226,.112,.141,.054,OLIVE);box(0,.005,.26,.12,.162,.02,RUBBER);
 box(0,.081,.128,.084,.024,.218,POLY);rail(.047,-.312);vents(.05,-.205,3);barrel(-.333);grip(-.078);magazine(.151,.215,.069,.097,POLY,.075);controls(.1,-.061);
 box(0,-.061,-.241,.07,.033,.16,POLY);box(.055,.046,.103,.014,.033,.114,METAL);box(-.057,.047,.098,.007,.021,.066,RUBBER);
}
function vesper(b){
 const {box,receiver,barrel,grip,magazine,rail,ribs,cyl,controls}=b;
 receiver(-.064,.231,.078);box(0,.022,-.185,.088,.10,.104,POLY);ribs(0,.02,-.162,5,.018,.092,.088,.008,RUBBER);
 barrel(-.229,undefined,.024);grip(.052,POLY,-.105,.184);magazine(.047,.261,.048,.057,METAL,.025);rail(.02,-.206,.096,.058);controls(.078,.032);
 for(const s of [-1,1]){cyl(s*.043,.024,.164,.012,.235,EDGE);box(s*.038,-.031,.282,.014,.129,.016,METAL);}
 box(0,-.044,.286,.086,.026,.026,RUBBER);box(0,.069,-.07,.052,.022,.083,METAL,'bolt');box(-.043,.043,-.068,.013,.019,.046,EDGE,'bolt');
}
function lynx(b){
 const {box,barrel,grip,rail,cyl,vents}=b;
 box(0,.025,-.026,.112,.115,.40,OLIVE);box(0,-.021,.206,.103,.165,.073,OLIVE);box(0,-.027,.25,.108,.173,.019,RUBBER);
 // A long top-loading magazine and open thumbhole are this PDW's silhouette.
 box(0,.083,-.046,.101,.029,.315,finish([.31,.28,.19],.05,.46),'magazine');
 for(let i=0;i<8;i++)cyl(.006,.088,.071-i*.032,.015,.064,BRASS,'magazine',{pitch:0,roll:Math.PI/2});
 box(0,.102,-.073,.108,.01,.39,METAL); // Keep the shared iron sight ray open too.
 box(0,-.107,.162,.059,.022,.151,OLIVE);grip(.078,OLIVE,-.08,.163);box(0,-.069,-.201,.065,.097,.086,OLIVE);
 box(0,.023,-.249,.102,.097,.089,OLIVE);vents(.052,-.214,3,.025,.018);barrel(-.292);
 // Side rails deliberately leave the optical centre unobstructed.
 for(const s of [-1,1]){box(s*.061,.063,-.075,.017,.018,.27,METAL);box(s*.06,.036,-.19,.023,.024,.041,EDGE,'bolt');}
}
function breach(b){
 const {box,receiver,barrel,grip,stock,cyl,ribs}=b;
 receiver(-.027,.298,.096);barrel(-.166,undefined,.035);cyl(0,.009,-.439,.03,.475,EDGE);
 cyl(0,.008,-.321,.088,.169,WOOD,'pump');ribs(0,.008,-.253,10,.015,.092,.084,.009,RUBBER,'pump');
 grip(.10,WOOD,-.29,.17);stock(.322,WOOD,'solid');
 for(let i=0;i<5;i++){cyl(-.064,.024,.064-i*.034,.024,.059,finish(C.red,.03,.44));cyl(-.064,-.009,.064-i*.034,.025,.01,BRASS);}
 box(.052,.032,-.071,.006,.029,.082,RUBBER);box(.057,.029,-.083,.012,.018,.059,EDGE,'bolt');
 // The next shell only exists visually while the loading hand approaches the port.
 cyl(-.059,-.161,.004,.025,.067,finish(C.red,.03,.44),'loadShell',{hidden:true});
 cyl(-.059,-.161,.044,.026,.012,BRASS,'loadShell',{hidden:true});
}
function tempest(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,cyl,controls}=b;
 receiver(-.031,.292,.102,TAN);box(0,.019,-.31,.101,.116,.263,POLY);vents(.052,-.227,6,.034,.036);
 rail(.073,-.438);barrel(-.443,undefined,.036);cyl(0,.008,-.487,.032,.11,METAL);
 grip(.096);magazine(.002,.225,.083,.141,POLY,.16);stock(.286,TAN);controls(.102);
 box(0,-.052,-.323,.046,.025,.208,EDGE);box(.061,.044,-.036,.03,.024,.065,EDGE,'bolt');
}
function longbow(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,cyl,bipod}=b;
 receiver(-.044,.319,.094,finish(C.steel,.83,.32));box(0,-.022,-.325,.087,.075,.31,TAN);
 barrel(-.48,undefined,.039);for(const s of [-1,1])box(s*.019,.055,-.667,.003,.009,.291,RUBBER);box(0,.08,-.646,.011,.003,.263,RUBBER);
 rail(.10,-.239);grip(.122,TAN,-.14,.17);magazine(-.028,.135,.069,.103,METAL,.025);stock(.354,TAN,'skeleton');bipod(-.467);
 box(0,.067,.318,.083,.047,.17,TAN);box(.061,.052,.074,.047,.015,.014,EDGE,'bolt');
 box(.082,.028,.074,.017,.065,.017,EDGE,'bolt',{roll:-.32});cyl(.094,-.004,.074,.032,.025,RUBBER,'bolt',{pitch:0});
 box(0,-.014,-.268,.093,.013,.337,POLY);
}
function warden(b){
 const {box,receiver,barrel,grip,magazine,stock,rail,vents,controls,cyl}=b;
 receiver(-.036,.295,.097,TAN);box(0,.027,-.348,.094,.106,.307,TAN);vents(.048,-.228,7,.038,.035);
 rail(.092,-.497);barrel(-.508,undefined,.031);cyl(0,.08,-.565,.031,.058,METAL);
 grip(.115);magazine(-.006,.166,.073,.103,finish(C.steel,.8,.43),.035);stock(.317,TAN,'skeleton');controls(.097);
 box(0,.068,.275,.081,.036,.171,POLY);box(-.057,.024,.06,.009,.047,.055,EDGE);
}
function atlas(b){
 const {box,receiver,barrel,grip,stock,rail,vents,cyl,bipod}=b;
 receiver(-.032,.35,.14,OLIVE);box(0,.079,-.015,.128,.033,.316,METAL,'lid');
 box(0,.006,-.373,.111,.108,.281,POLY);vents(.057,-.279,6,.037,.026);barrel(-.513,undefined,.043);
 rail(.102,-.208,.09,.082);grip(.14);stock(.304,OLIVE,'solid');bipod(-.59);
 box(-.035,-.127,-.065,.177,.18,.166,finish([.29,.32,.22],.05,.92,9),'magazine');box(-.035,-.031,-.065,.187,.02,.176,METAL,'magazine');
 // Linked rounds run sideways into the feed tray, below the optical line.
 for(let i=0;i<7;i++){const x=-.083-i*.021;cyl(x,.032,-.026,.014,.064,BRASS,'belt');box(x,.023,-.027,.019,.012,.015,METAL,'belt');}
 box(.088,.028,-.086,.045,.019,.026,EDGE,'bolt');
 box(.092,.078,-.35,.018,.096,.025,METAL);box(.092,.12,-.405,.025,.018,.136,POLY);box(.092,.078,-.46,.018,.088,.025,METAL);
}
function sable(b){
 const {box,cyl,grip,magazine,ribs}=b;
 box(0,.021,-.023,.071,.082,.238,METAL,'slide');box(0,-.029,-.008,.067,.05,.211,POLY);
 box(0,.048,-.058,.068,.023,.144,finish(C.steel,.8,.31),'slide');box(.037,.045,-.018,.002,.02,.048,RUBBER,'slide');
 for(const s of [-1,1])for(let i=0;i<6;i++)box(s*.036,.026,.069-i*.01,.002,.034,.005,RUBBER,'slide');
 cyl(0,.03,-.106,.017,.147,EDGE);grip(.045,POLY,-.18,.171);box(0,-.195,.028,.072,.014,.085,RUBBER,'magazine');
 box(-.04,-.012,.013,.012,.008,.035,EDGE);box(0,-.059,-.098,.045,.013,.089,METAL);
}
function dire(b){
 const {box,cyl,grip}=b;
 box(0,.032,-.055,.086,.099,.30,finish(C.steel,.92,.25),'slide');box(0,.076,-.091,.055,.027,.205,METAL,'slide');
 box(0,-.03,-.032,.082,.053,.229,TAN);cyl(0,.03,-.166,.03,.164,EDGE);
 box(.045,.049,-.019,.003,.028,.064,RUBBER,'slide');for(const s of [-1,1])for(let i=0;i<5;i++)box(s*.044,.03,.084-i*.013,.004,.049,.006,RUBBER,'slide');
 grip(.053,POLY,-.15,.184);box(0,-.205,.032,.081,.019,.094,RUBBER,'magazine');
 box(0,.04,.112,.031,.037,.022,EDGE,'hammer',{pitch:-.29});box(-.047,-.013,.047,.012,.014,.038,EDGE);
}
function blade(b){
 const {box,pin}=b;
 box(0,.015,-.13,.016,.062,.254,EDGE);box(.007,.016,-.165,.007,.043,.24,finish([.61,.65,.67],.98,.22));
 box(0,.015,-.269,.014,.047,.051,EDGE);box(0,.013,-.302,.011,.024,.031,EDGE,'',{pitch:-.15});
 box(0,.012,.05,.05,.065,.17,POLY);box(0,.015,-.039,.104,.022,.02,METAL);box(0,.011,.138,.055,.071,.014,EDGE);
 for(const z of [.013,.061,.109]){pin(.026,.014,z);pin(-.026,.014,z);}for(let i=0;i<5;i++)box(0,.014,.012+i*.025,.054,.067,.009,RUBBER);
}
const BUILDERS=[kestrel,bastion,raptor,vesper,lynx,breach,tempest,longbow,warden,atlas,sable,dire,blade];

function addOptic(b,w){
 const {box,tube,cyl}=b,id=w.def.id;
 if(id===12)return;
 const short=id>=10,y=id>=10?.03:.06;
 if(w.optic===3||id===7){
  for(const z of [-.074,.067]){box(0,.116,z,.046,.047,.031,METAL);tube(0,.188,z,.079,.026,METAL);}
  tube(0,.188,-.007,.07,.242,METAL);tube(0,.188,-.153,.09,.069,METAL);tube(0,.188,.13,.086,.044,RUBBER);
  for(const z of [-.171,.137])tube(0,.188,z,.094,.01,EDGE);
  // No opaque lens plane: scoped ADS displays the world through the HUD reticle.
  cyl(0,.24,-.025,.035,.027,RUBBER,'',{pitch:0});cyl(.048,.188,-.025,.031,.031,RUBBER,'',{pitch:0,roll:Math.PI/2});
 }else if(w.optic===1||w.optic===2){
  const prism=w.optic===2,wide=prism?.10:.082,z=short?-.013:.017;
  box(0,.12,z,wide+.008,.026,prism?.07:.045,METAL);
  for(const s of [-1,1])box(s*wide*.5,.169,z,.01,.072,prism?.042:.022,METAL);
  box(0,.208,z,wide+.009,.009,prism?.042:.022,METAL);box(wide*.62,.14,z,.019,.02,.033,RUBBER);
  if(prism){box(0,.204,z-.03,wide,.012,.06,METAL);box(-wide*.5,.17,z-.028,.01,.07,.061,METAL);box(wide*.5,.17,z-.028,.01,.07,.061,METAL);}
 }else{
  const front=(id===4?-.228:b.profile.barrel+.046),rear=short?.073:id===4?.116:.082;
  // Open-notch rear, fine front post: the exact .119 ray remains unobstructed.
  box(0,.095,front,.03,.027,.023,METAL);box(0,.111,front,.007,.013,.012,EDGE);
  for(const s of [-1,1])box(s*.022,.12,rear,.012,.029,.025,METAL);
  box(0,.096,rear,.055,.016,.033,METAL);
  if(short)for(const s of [-1,1])box(s*.021,.125,rear+.014,.004,.004,.002,finish([.8,.86,.73],0,.4));
 }
}
function addMuzzle(b,w){
 if(w.def.id===12)return;
 const {box,tube}=b,z=b.profile.barrel,y=w.def.id>=10?.03:.06,short=w.def.id>=10;
 if(w.barrel===1){tube(0,y,z-.063,short?.047:.059,.16,METAL);for(const dz of [-.133,.003])tube(0,y,z+dz,short?.05:.063,.013,EDGE);}
 else if(w.barrel===2){tube(0,y,z-.018,short?.036:.047,.066,EDGE);for(const s of [-1,1])for(let i=0;i<3;i++)box(s*(short?.019:.024),y,z+.001-i*.018,.002,.015,.009,RUBBER);}
 else{tube(0,y,z,short?.032:w.def.kind==='SHOTGUN'?.045:.043,short?.014:.032,METAL);if(!short)for(const s of [-1,1])box(s*.022,y,z-.004,.002,.019,.014,RUBBER);}
}
function addAttachments(b,w){
 if(w.def.id>=10)return;
 const {box,cyl}=b,z=b.profile.support,width=b.profile.width;
 if(w.grip===1){box(0,-.109,z,.039,.15,.052,POLY);box(0,-.181,z,.043,.016,.057,RUBBER);}
 if(w.grip===2){box(width*.66,.015,z,.035,.035,.088,METAL);cyl(width*.66,.015,z-.046,.021,.009,RUBBER);}
 if(w.grip===4){for(const q of b.parts)if(q.tag==='magazine'&&q.y<-.11){q.y-=.033;q.h*=1.12;}}
}
function addHands(b,w){
 const {box}=b,id=w.def.id,pr=b.profile,z=pr.grip,short=id>=10&&id<12;
 const palm=(x,y,z,s=.98,tag='hand',roll=0)=>{
  box(x,y,z,.071*s,.091*s,.075*s,GLOVE,tag,{mesh:'sphere',roll});
  for(let i=0;i<4;i++)box(x-.029*s+i*.018*s,y-.03*s,z-.025*s,.018*s,.045*s,.045*s,RUBBER,tag,{mesh:'sphere',pitch:.3,roll});
  box(x+.039*s,y+.005*s,z-.032*s,.026*s,.064*s,.031*s,GLOVE,tag,{mesh:'sphere',roll:-.4});
  box(x+.002*s,y+.024*s,z+.024*s,.06*s,.02*s,.051*s,RUBBER,tag,{mesh:'bevel'});
 };
 palm(.027,-.112,z+.008,1,'rightHand',-.13);
 box(.071,-.196,z+.131,.1,.105,.222,SLEEVE,'rightHand',{pitch:-.31,roll:-.20});box(.047,-.166,z+.054,.098,.028,.092,RUBBER,'rightHand',{pitch:-.26});
 if(id===12)return;
 if(short){palm(-.026,-.115,z+.016,1.03,'supportHand',.14);box(-.076,-.198,z+.127,.1,.102,.214,SLEEVE,'supportHand',{pitch:-.3,roll:.2});}
 else{
  const supportY=w.grip===1?-.124:-.057,tag=id===5?'pumpHand':'supportHand';
  palm(-.031,supportY,pr.support+.013,1,tag,.24);
  box(-.088,supportY-.105,pr.support+.088,.102,.236,.108,SLEEVE,tag,{roll:-.37,pitch:-.33});box(-.058,supportY-.044,pr.support+.051,.104,.031,.102,RUBBER,tag,{roll:-.3});
 }
}
export function weaponModel(w){
 const b=builder(w);(BUILDERS[w.def.id]??kestrel)(b);addOptic(b,w);addMuzzle(b,w);addAttachments(b,w);addHands(b,w);
 const p=b.parts;p.weaponId=w.def.id;p.muzzle=muzzlePosition(w);p.animated=[];
 // Give textured finishes the same small material palette on every weapon.
 for(const q of p)if(q.finishTile!==undefined)q.finishTile=Math.round(q.finishTile);
 for(let i=0;i<p.length;i++){const q=p[i];if(q.tag){q.baseX=q.x;q.baseY=q.y;q.baseZ=q.z;q.baseYaw=q.yaw;q.basePitch=q.pitch;q.baseRoll=q.roll;p.animated.push(i);}}
 return p;
}
export function muzzlePosition(w){
 const profile=PROFILES[w.def.id]??PROFILES[0];
 return {x:0,y:w.def.id>=10&&w.def.id<12?.03:.06,z:profile.barrel-(w.barrel===1?.146:w.barrel===2?.052:.02)};
}
function smooth(a,b,t){t=Math.max(0,Math.min(1,(t-a)/(b-a)));return t*t*(3-2*t);}
export function animateWeaponParts(parts,w,p,time){
 const reloading=w.reloadLeft>0,r=reloading?Math.max(0,Math.min(1,1-w.reloadLeft/w.reloadTime)):0;
 const shot=Math.max(0,w.sinceShot),slide=Math.max(0,1-shot/.075),boltOpen=smooth(.08,.18,shot)*(1-smooth(.42,.6,shot));
 const pump=smooth(.075,.22,shot)*(1-smooth(.38,.56,shot));
 const magDrop=reloading?smooth(.10,.28,r)*(1-smooth(.65,.83,r)):0;
 const leftReach=reloading?Math.sin(Math.PI*smooth(.07,.9,r)):0;
 const boltReload=reloading&&w.reloadStartedEmpty!==false?smooth(.82,.88,r)*(1-smooth(.9,.98,r)):0;
 const lid=reloading?smooth(.08,.24,r)*(1-smooth(.77,.93,r)):0;
 const emptySlide=w.ammo===0&&(!reloading||r<.87)?1:0;
 for(const index of parts.animated){const q=parts[index];q.x=q.baseX;q.y=q.baseY;q.z=q.baseZ;q.yaw=q.baseYaw;q.pitch=q.basePitch;q.roll=q.baseRoll;
  switch(q.tag){
   case 'slide':q.z+=Math.max(slide,emptySlide)*.035;break;
   case 'bolt':q.z+=(w.def.id===7?boltOpen*.068:slide*.026)+boltReload*.04;if(w.def.id===7)q.roll-=(boltOpen+boltReload)*.68;break;
   case 'pump':case 'pumpHand':q.z+=pump*.079;if(reloading&&q.tag==='pumpHand'){q.x-=leftReach*.035;q.y-=leftReach*.095;q.z+=leftReach*.27;q.roll-=leftReach*.5;}break;
   case 'magazine':
    if(w.def.id===4){q.y+=magDrop*.155;q.x-=magDrop*.07;q.roll+=magDrop*.16;}
    else{q.y-=magDrop*(w.def.id===9?.23:.29);q.x-=magDrop*.045;q.z+=magDrop*.035;q.roll-=magDrop*.22;}
    break;
   case 'belt':q.y-=lid*.07;q.x-=magDrop*.09;break;
   case 'lid':{const angle=lid*1.10;q.pitch-=angle;q.y+=Math.sin(angle)*.145;q.z+=.145*(1-Math.cos(angle));break;}
   case 'supportHand':
    if(w.def.id===4){q.y+=leftReach*.16;q.x-=leftReach*.08;q.z+=leftReach*.09;q.roll+=leftReach*.5;}
    else{q.y-=leftReach*.15;q.x-=leftReach*.05;q.z+=leftReach*(w.def.id>=10?.04:.23);q.roll-=leftReach*.5;}
    break;
   case 'loadShell':q.hidden=!reloading||r<.08||r>.87;q.x-=leftReach*.045;q.y-=leftReach*.035;q.z+=leftReach*.08;break;
   case 'hammer':q.pitch-=slide*.5;break;
  }
 }
 return parts;
}
