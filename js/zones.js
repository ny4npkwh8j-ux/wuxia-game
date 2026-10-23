'use strict';
/* ---- зоны Ци: три круга, владельцы и борьба за центр ----
   Внутренний круг (0): Ци ×1,2, пускают только владельца. Средний (1): ×1, у боссов — место армии. Внешний (2): ×0,5, пускают всех.
   Владелец боссовой зоны — её Босс (пока он в зоне); владелец свободной зоны — сильнейший, кто сидит в центре.
   Чужак в центре — нарушитель: владелец вызывает его на бой. Нет владельца — центр свободен для любого. */
const ZONE_V=3,RING_IN=.35,RING_MID=.7,RING_K=[1.2,1,.5],ZONE_FREE_N=5,BOSS_ZONE_PWS=[15,24,19,28,21,13],ZONE_BOLD=.07;
const RING_NAME=['внутренний круг ×1,2','средний круг ×1','внешний круг ×0,5'];
let ZH=new Map();/* id зоны → текущий владелец (обновляется zoneTick) */
function zoneRing(z,x,y){const d=Math.hypot(x-z.x,y-z.y);return d<=z.r*RING_IN?0:d<=z.r*RING_MID?1:d<=z.r?2:3}
function zoneList(){const s=arenaState;return s&&s.springs?s.springs:[]}
function zoneOfBoss(b){const k=b.zone||b.index;return zoneList().find(q=>q.bz===k)||null}
function lordZone(idx){const b=aliveBosses(arenaState).find(q=>q.index===idx);return b?zoneOfBoss(b):zoneList().find(q=>q.bz===idx)||null}
function zoneHolder(z){const h=ZH.get(z.id);return h&&h.hp>0?h:null}
/* сила зоны для роста: относительно прежней боссовой (20) и кругу */
function zoneGrow(z,ring){return Math.max(.25,(z?z.pw:20)/20)*(RING_K[ring]==null?0:RING_K[ring])}
/* самый внутренний круг, куда e можно: 0 — центр свободен или e его владелец */
function zoneMinRing(e,z){
 const h=zoneHolder(z);if(h===e)return 0;
 if(e.sect){/* секта: глава рвётся в центр своей зоны, ученики сидят в среднем круге при своём главе */
  const sc=sectById(e.sect),m=sc?SM.get(sc.id):null;
  if(m===e)return sc.zid===z.id||!h?0:(z.bz?2:h.sect?2:1);
  if(m&&(!h||h===m))return 1;
 }
 if(!h)return 0;
 if(z.bz&&e.lord===h.index)return 1;
 if(e.bold)return 0;
 return z.bz||h.sect?2:1;
}
/* зона, в которую e нельзя заходить в точке (x,y), иначе null */
function forbidZone(e,x,y){
 if(e.bold)return null;
 for(const z of zoneList()){const r=zoneRing(z,x,y);if(r<2&&r<zoneMinRing(e,z))return z}
 return null;
}
function pickZone(e){
 let best=null,bs=-1e9;
 for(const z of zoneList()){
  const d=Math.hypot(e.x-z.x,e.y-z.y);if(d>4500)continue;
  const sc=z.pw*RING_K[zoneMinRing(e,z)]-d/300+(zoneHolder(z)?0:8)+((e.zb||0)*3);
  if(sc>bs){bs=sc;best=z}
 }
 return best;
}
function zoneSpot(e,z,ring){
 const a=Math.atan2(e.y-z.y,e.x-z.x)+(Math.random()-.5)*1.4;
 const f=ring===0?Math.random()*RING_IN*.8:ring===1?RING_IN+.06+Math.random()*(RING_MID-RING_IN-.12):RING_MID+.06+Math.random()*(1-RING_MID-.12);
 return{x:z.x+Math.cos(a)*z.r*f,y:z.y+Math.sin(a)*z.r*f,zid:z.id};
}
/* поведение культиватора: идёт в зону, садится в разрешённом круге и растёт; true — действие выполнено */
function zoneStep(e,dt){
 if(!((e.stars||0)>0)&&!(e.fm!=null&&e.fm===e.sect))return false;/* ученик без звёзд, получивший образ главы, сразу начинает культивацию */
 if(e.bold==null){e.bold=!e.lord&&Math.random()<ZONE_BOLD;e.zb=Math.random()*2-1}
 const zs=zoneList();let z=e.lord?lordZone(e.lord):(e.sect?sectZone(e):null);
 if(!z){e.zT=(e.zT||0)-dt;if(e.zid==null||e.zT<=0||!zs.some(q=>q.id===e.zid)){e.zT=15+Math.random()*10;const p=pickZone(e);e.zid=p?p.id:null}z=zs.find(q=>q.id===e.zid)||null}
 if(!z)return false;
 const want=zoneMinRing(e,z);e.spT=(e.spT||0)-dt;
 if(!e.spot||e.spot.zid!==z.id||e.spT<=0){e.spot=zoneSpot(e,z,want);e.spT=8+Math.random()*10}
 const dz=Math.hypot(e.x-e.spot.x,e.y-e.spot.y),ring=zoneRing(z,e.x,e.y);
 if(ring<3){e.cult=true;evolveTick(e,dt*zoneGrow(z,ring))}
 if(dz>40){e.wanderAng=Math.atan2(e.spot.y-e.y,e.spot.x-e.x);e.ang=e.wanderAng;const sp=dz>300?.7:.45;moveEnemy(e,Math.cos(e.ang)*e.s*sp*dt,Math.sin(e.ang)*e.s*sp*dt)}
 return true;
}
/* раз в 1,5 с: владельцы зон, наказание нарушителей, сообщения игроку */
function zoneTick(){
 const s=arenaState;if(!s)return;
 sectRefresh();const nh=new Map(),zs=zoneList();
 for(const z of zs){
  let h=null;
  if(z.bz){const b=aliveBosses(s).find(q=>(q.zone||q.index)===z.bz);if(b&&Math.hypot(b.x-z.x,b.y-z.y)<=z.r)h=b}
  else{
   h=z.holder!=null?findEnt(z.holder):null;if(h&&(h.hp<=0||zoneRing(z,h.x,h.y)!==0))h=null;
   if(!h){let best=null;for(const m of s.enemies){if(m.hp<=0||!((m.stars||0)>0)||m.foeId!=null||zoneRing(z,m.x,m.y)!==0)continue;if(!best||entPow(m)>entPow(best))best=m}h=best}
   z.holder=h?h.id:null;
  }
  if(h)nh.set(z.id,h);
  const hs=h&&h.sect?h.sect:null;if(hs!==z.hs){z.hs=hs;if(hs){const sc=sectById(hs);if(sc)sectNote('Секта «'+sc.name+'» заняла зону Ци',h)}}
 }
 ZH=nh;
 /* нарушители центра */
 for(const z of zs){
  const h=ZH.get(z.id);if(!h||h.foeId!=null)continue;
  let t=null,td=1e9;
  for(const m of s.enemies){
   if(m===h||m.hp<=0||m.foeId!=null||m.hostile||zoneRing(z,m.x,m.y)!==0)continue;
   if(z.bz&&(m.team===h.index||m.lord===h.index))continue;
   if(h.sect&&m.sect===h.sect)continue;
   const d=Math.hypot(m.x-h.x,m.y-h.y);if(d<td){td=d;t=m}
  }
  if(t)startDuel(h,t);
 }
 /* игрок: сообщения о круге и гнев владельца при вторжении в центр */
 s.zoneMsgT=Math.max(0,(s.zoneMsgT||0)-1.5);let key=null;
 for(const z of zs){
  const r=zoneRing(z,s.px,s.py);if(r>2)continue;
  key=z.id+':'+r;const h=ZH.get(z.id);
  if(r===0&&h&&h.hp>0){/* нападает только на слабого: равный или сильный игрок не вызывает ярости, дальше работает обычное правило отношений */
   const ratio=playerPow()/entPow(h),weak=ratio<PW_LO&&!isMate(h);if(weak)provoke(h);
   if(s.zoneMsgT<=0){s.zoneMsgT=6;toast(weak?(z.bz?'Ты вторгся в центр владений Босса '+h.index+' — слабым здесь не место!':'Ты вторгся в центр чужой зоны — хозяин в ярости!'):(ratio>PW_HI?'Хозяин центра не смеет тебя тронуть.':'Хозяин центра присматривается к тебе.'))}}
  break;
 }
 if(key!==s.pZone){s.pZone=key;if(key&&s.zoneMsgT<=0){const r=+key.split(':')[1];s.zoneMsgT=3;toast('Зона Ци · '+RING_NAME[r])}}
}
/* бой за зоны: победитель-босс занимает более сильную зону проигравшего, тот возродится на его прежней */
function zoneSwapIfBetter(k,v){
 const zk=zoneOfBoss(k),zv=zoneOfBoss(v);if(!zk||!zv||zk===zv||zv.pw<=zk.pw)return;
 const kz=k.zone||k.index,vz=v.zone||v.index;k.zone=vz;v.zone=kz;
 k.home={x:zv.x,y:zv.y};v.home={x:zk.x,y:zk.y};
 toast('Босс '+k.index+' захватил более сильную зону Ци у Босса '+v.index+'!');chron('Босс '+k.index+' захватил более сильную зону Ци у Босса '+v.index);
}
/* зоны карты: боссовые (размер ×2 по радиусу = ×4 по площади, разная сила), свободные (до ZONE_FREE_N) */
function ensureZones(state){
 state.springs=state.springs||[];
 BOSS_HOMES.forEach((h,i)=>{const z=state.springs.find(q=>q.bz===i+1);if(!z)state.springs.push({x:h[0],y:h[1],r:BOSS_ZONE_R,pw:BOSS_ZONE_PWS[i],bz:i+1,v:ZONE_V});else{z.r=BOSS_ZONE_R;z.pw=BOSS_ZONE_PWS[i];z.v=ZONE_V}});
 for(const z of state.springs){if(z.id==null)z.id=nid();if(!z.bz&&z.v!==ZONE_V){z.r*=(z.v===2?2:4);z.v=ZONE_V}}
 let free=state.springs.filter(q=>!q.bz).length,tries=0;const pws=[10,14,12];
 while(free<ZONE_FREE_N&&tries++<300){
  const x=900+Math.random()*8200,y=900+Math.random()*8200,r=360+Math.random()*280;
  if(BOSS_HOMES.some(h=>Math.hypot(x-h[0],y-h[1])<BOSS_ZONE_R+r+150))continue;
  if(state.springs.some(q=>Math.hypot(x-q.x,y-q.y)<q.r+r+150))continue;
  state.springs.push({x,y,r,pw:pws[free%3],v:ZONE_V,id:nid()});free++;
 }
}
