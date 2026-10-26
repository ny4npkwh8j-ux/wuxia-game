'use strict';
/* ---- секты мобов ----
   Сильный свободный культиватор с парой слабее себя поблизости основывает секту: он — глава, остальные — ученики (e.sect, e.team=1000+id).
   Секта вербует ещё, ученики несут главе часть осколков («дань»), держатся рядом с ним и дерутся за него.
   Глава ведёт секту занять свободную зону Ци: он сидит в центре, ученики — в среднем круге. Чужой глава бросает вызов — выясняют, кто сильнее.
   Умер глава — сильнейший ученик становится главой; остался один — секта распадается. */
const SECT_MAX=8,SECT_MIN_STARS=15,SECT_TEAM=1000;
const SECT_NAMES=['Нефритового Лотоса','Багровой Луны','Лазурного Журавля','Тихого Ветра','Золотого Тигра','Ледяной Вершины','Чёрной Черепахи','Девяти Ручьёв','Рассветного Меча','Пепельного Феникса','Белого Тумана','Небесной Горы'];
const SECT_COLS=['#7be3a0','#ff6b7a','#6bb8ff','#d6c5ff','#ffd85b','#9ff5e8','#ff9a3a','#e58cff'];
let SM=new Map();/* id секты → глава (обновляется раз в 1,5 с) */
function sectList(){const s=arenaState;if(!s)return[];if(!Array.isArray(s.sects))s.sects=[];return s.sects}
function sectById(id){return id==null?null:sectList().find(q=>q.id===id)||null}
function sectMembers(sc){return arenaState.enemies.filter(m=>m.hp>0&&m.sect===sc.id)}
function sectCap(m){return Math.min(14,3+Math.floor((m.stars||0)/10))}
function sectZone(e){const sc=sectById(e.sect);return sc&&sc.zid!=null?zoneList().find(q=>q.id===sc.zid)||null:null}
function sectRefresh(){const nm=new Map();for(const sc of sectList()){const m=findEnt(sc.master);if(m&&m.hp>0)nm.set(sc.id,m)}SM=nm}
/* летопись мира: последние 40 событий (показывается на карте) */
function chron(msg){const s=arenaState;if(!s)return;const a=s.chron=Array.isArray(s.chron)?s.chron:[];a.push({t:Date.now(),m:msg});if(a.length>40)a.shift()}
function sectNote(msg,at){const s=arenaState;if(!s)return;chron(msg);if(at&&Math.hypot(at.x-s.px,at.y-s.py)<3000)toast('☯ '+msg)}
function sectJoin(m,sc){m.sect=sc.id;m.team=SECT_TEAM+sc.id;m.spot=null;m.zid=null;m.zT=0;sectTeach(m,sc)}
function sectLeave(m){m.sect=null;if(m.team>=SECT_TEAM)m.team=null;m.fm=null;m.fmFull=false;m.tver=null}
function sectDisband(sc){for(const m of arenaState.enemies)if(m.sect===sc.id)sectLeave(m);chron('Секта «'+sc.name+'» распалась');if(save.sectId===sc.id){save.sectId=null;persist();toast('Твоя секта распалась.')}}
function sectCapOf(sc,m){return sc.pl?Math.min(20,3+Math.floor((save.stars||0)/10)):sectCap(m)}
function foundSect(m,mates,pl){
 const s=arenaState,sl=sectList();s.sectSeq=Math.max(s.sectSeq||0,...sl.map(q=>q.id))+1;
 const used=new Set(sl.map(q=>q.name)),pool=SECT_NAMES.filter(n=>!used.has(n)),name=(pool.length?pool:SECT_NAMES)[Math.floor(Math.random()*(pool.length||SECT_NAMES.length))];
 const sc={id:s.sectSeq,name,col:SECT_COLS[s.sectSeq%SECT_COLS.length],master:m.id,zid:null,zT:0,loneT:0};
 sl.push(sc);sectJoin(m,sc);for(const q of mates)sectJoin(q,sc);
 if(pl){sc.pl=true;sc.order='free';save.sectId=sc.id;persist();chron('Игрок основал секту «'+name+'»');toast('☯ Ты основал секту «'+name+'»!')}
 else sectNote('Основана секта «'+name+'» — глава ★'+(m.stars||0),m);
 return sc;
}
/* раз в ~8 с: судьба глав, вербовка, основание, дань, выбор зоны */
function sectTick(){
 const s=arenaState;if(!s)return;const sl=sectList();
 /* вражда: секты, чьи ученики сейчас бьются друг с другом */
 for(const sc of sl)sc.war={};
 for(const m of s.enemies){if(m.hp<=0||m.sect==null||m.foeId==null)continue;const f=findEnt(m.foeId);if(f&&f.sect!=null&&f.sect!==m.sect){const a=sectById(m.sect),b=sectById(f.sect);if(a&&b){a.war[b.id]=1;b.war[a.id]=1}}}
 for(let i=sl.length-1;i>=0;i--){
  const sc=sl[i];let m=findEnt(sc.master);const mem=sectMembers(sc);
  if(!m||m.hp<=0||m.sect!==sc.id){
   if(mem.length<(sc.pl?1:2)){sectDisband(sc);sl.splice(i,1);continue}
   mem.sort((a,b)=>entPow(b)-entPow(a));m=mem[0];sc.master=m.id;sectNote('В секте «'+sc.name+'» новый глава',m);
  }
  if(mem.length<(sc.pl?1:2)){sc.loneT=(sc.loneT||0)+8;if(sc.loneT>120){sectDisband(sc);sl.splice(i,1);continue}}else sc.loneT=0;
  /* вербовка */
  if(mem.length<sectCapOf(sc,m)){
   const pm=entPow(m);
   for(const q of s.enemies){
    if(mem.length>=sectCapOf(sc,m))break;
    if(q.hp<=0||!((q.stars||0)>0)||q.lord||q.sect||q.foeId!=null||q.hostile||(q.noSectT||0)>s.t)continue;
    if(Math.hypot(q.x-m.x,q.y-m.y)>1100)continue;
    const r=entPow(q)/pm;if(r<.25||r>1)continue;
    sectJoin(q,sc);mem.push(q);
   }
  }
  /* дань: ученики отдают главе четверть добытых осколков; если секту возглавляет игрок — пятая часть копится для него и выплачивается раз в минуту */
  if(sc.pl){
   for(const q of mem)for(const k of ['sh1','sh2']){const g=Math.floor((q[k]||0)*.2);if(g>0){q[k]-=g;sc[k==='sh1'?'t1':'t2']=(sc[k==='sh1'?'t1':'t2']||0)+g}}
   sc.payT=(sc.payT||0)+8;
   if(sc.payT>=60){sc.payT=0;const a=sc.t1||0,b=sc.t2||0;if(a>0||b>0){save.rewards+=a;save.rewards2+=b;sc.t1=sc.t2=0;persist();chron('Секта «'+sc.name+'» принесла дань: '+fmt(a)+' души, '+fmt(b)+' 2 этапа');toast('☯ Секта «'+sc.name+'» принесла дань: +'+fmt(a)+' души'+(b?', +'+fmt(b)+' 2 этапа':''))}}
  }else for(const q of mem){if(q===m)continue;
   for(const k of ['sh1','sh2']){const g=Math.floor((q[k]||0)*.25);if(g>0){q[k]-=g;m[k]=(m[k]||0)+g}}}
  sectMentor(sc,m,mem);
  /* зона: ищем свободную зону Ци без хозяина (или со слабым) */
  sc.zT=Math.max(0,(sc.zT||0)-8);
  const cur=sc.zid!=null?zoneList().find(q=>q.id===sc.zid):null;
  if(cur){const h=zoneHolder(cur);if(h&&h!==m&&h.sect!==sc.id&&entPow(h)>entPow(m)*1.4&&sc.zT<=0){sc.zid=null;sc.zT=60}}
  if(!sc.zid&&sc.zT<=0){
   let best=null,bd=5000;
   for(const z of zoneList()){if(z.bz)continue;if(sl.some(o=>o!==sc&&o.zid===z.id))continue;const h=zoneHolder(z);if(h&&entPow(h)>entPow(m)*1.4)continue;const d=Math.hypot(z.x-m.x,z.y-m.y)-z.pw*40;if(d<bd){bd=d;best=z}}
   sc.zid=best?best.id:null;sc.zT=best?0:30;
  }
 }
 /* основание */
 if(sl.length<SECT_MAX&&Math.random()<.4){
  const free=s.enemies.filter(m=>m.hp>0&&!m.animal&&(m.stars||0)>0&&!m.lord&&!m.sect&&m.foeId==null&&!m.hostile);
  const cands=free.filter(m=>m.stars>=SECT_MIN_STARS);
  for(let k=0;k<12&&cands.length;k++){
   const m=cands.splice(Math.floor(Math.random()*cands.length),1)[0],pm=entPow(m);
   const mates=free.filter(q=>q!==m&&Math.hypot(q.x-m.x,q.y-m.y)<900&&entPow(q)/pm>=.25&&entPow(q)/pm<=1);
   if(mates.length>=2){mates.sort((a,b)=>entPow(b)-entPow(a));foundSect(m,mates.slice(0,sectCap(m)-1));break}
  }
 }
}
/* ученик без зоны держится рядом с главой; true — действие выполнено */
function sectStep(e,dt){
 const sc=sectById(e.sect);if(!sc){e.sect=null;if(e.team>=SECT_TEAM)e.team=null;return false}
 const m=SM.get(sc.id);if(!m||m===e||sectZone(e))return false;
 const d=Math.hypot(m.x-e.x,m.y-e.y);
 if(d>260){e.wanderAng=Math.atan2(m.y-e.y,m.x-e.x);e.ang=e.wanderAng;const sp=d>700?.8:.5;moveEnemy(e,Math.cos(e.ang)*e.s*sp*dt,Math.sin(e.ang)*e.s*sp*dt)}
 else if(e.fm===e.sect&&!((e.stars||0)>0)){e.cult=true;evolveTick(e,dt*.5)}/* новичок без звёзд учится рядом с главой по его образу */
 return true;
}
/* значок секты над существом */
function drawSectMark(e,p,near){
 const sc=sectById(e.sect);if(!sc)return;const m=SM.get(sc.id),lead=m===e;
 ax.fillStyle=sc.col;ax.beginPath();ax.moveTo(p.x,p.y-64);ax.lineTo(p.x+4,p.y-59);ax.lineTo(p.x,p.y-54);ax.lineTo(p.x-4,p.y-59);ax.closePath();ax.fill();
 if(lead&&near)outText(ax,(sc.pl?'♛ Твоя секта ':'♛ Секта ')+sc.name,p.x,p.y-70,sc.col,11);
}
/* знамёна над центрами зон: чья зона */
const ZONE_LABEL_R=1100;
function drawZoneMarks(W,H,time){
 const s=arenaState;if(!s)return;
 for(const z of zoneList()){
  const h=zoneHolder(z);if(!h)continue;const p=worldToScreen(z.x,z.y);if(p.x<-80||p.x>W+80||p.y<-120||p.y>H+80)continue;
  const sc=h.sect?sectById(h.sect):null,col=sc?sc.col:z.bz?'#ffd85b':'#9fb8c8',lbl=sc?'Секта '+sc.name:z.bz?'Владения Босса '+h.index:'Хозяин зоны ★'+(h.stars||0);
  const w=Math.sin(time*2.2+z.x)*3,close=Math.hypot(z.x-s.px,z.y-s.py)<ZONE_LABEL_R;
  ax.strokeStyle='rgba(60,40,20,.9)';ax.lineWidth=3;ax.beginPath();ax.moveTo(p.x,p.y+14);ax.lineTo(p.x,p.y-60);ax.stroke();
  ax.fillStyle=col;ax.beginPath();ax.moveTo(p.x,p.y-60);ax.lineTo(p.x+30+w,p.y-52);ax.lineTo(p.x+4,p.y-40);ax.closePath();ax.fill();
  if(close)outText(ax,lbl,p.x,p.y+30,col,11);
 }
}
