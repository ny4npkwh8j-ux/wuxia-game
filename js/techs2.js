'use strict';
/* ===== новые техники: Ци-клинок, Притяжение, Отталкивание, Мираж, Отравление =====
   Все — «кнопочные» (нажал — сработало), с перезарядкой. Параметры собраны в таблице, чтобы добавлять новые так же. */
const TECH2={
 blade:{icon:'🗡️',short:'КЛИНОК',cd:14,dur:8,range:130,cone:1.0,base:.35},
 pull:{icon:'🧲',short:'ПРИТЯЖ.',cd:15,dur:3,range:800,base:0},
 repel:{icon:'💨',short:'ОТТАЛК.',cd:15,range:450,push:420,base:.15},
 mirage:{icon:'👤',short:'МИРАЖ',cd:20,dur:5,base:0},
 poison:{icon:'☠️',short:'ЯД',cd:8,dur:6,range:450,base:.6}
};
const CD_KEY={blade:'cdBlade',pull:'cdPull',repel:'cdRepel',mirage:'cdMirage',poison:'cdPoison'};
function tech2Ready(t){
 const s=arenaState;if(!s||!t)return false;if(stunBlock())return false;interruptArenaMeditation();
 const k=CD_KEY[t.type];if(s[k]>0){toast(techniqueName(t.type)+' перезаряжается: '+s[k].toFixed(1)+' с');return false}
 const cost=techCost(t);if(save.qi<cost){toast('Недостаточно Ци. Нужно '+cost);return false}
 save.qi-=cost;s[k]=TECH2[t.type].cd;return true;
}
function activateTech2(t){
 if(!t||!TECH2[t.type])return;
 if(!tech2Ready(t))return;
 ({blade:castBlade,pull:castPull,repel:castRepel,mirage:castMirage,poison:castPoison})[t.type](t);
}
/* Ци-клинок: на время обычный удар бьёт дальше, шире и сильнее */
function castBlade(t){
 const s=arenaState,P=TECH2.blade;s.bladeT=P.dur;s.bladeDmg=P.base*myMult(t);
 s.qiEffects.push({type:'ring',x:s.px,y:s.py,life:0,duration:.5,radius:90,col:'#ffe27a'});burst(s.px,s.py,16,'#ffe27a',220,.5,2.6);
 toast('Ци-клинок: удар '+fmt(s.bladeDmg)+', дальность '+P.range+', '+P.dur+' с');
}
/* Притяжение: тянет к тебе врагов и сферы/сундуки/точки силы */
function castPull(t){
 const s=arenaState;s.pullT=TECH2.pull.dur;s.qiEffects.push({type:'ring',x:s.px,y:s.py,life:0,duration:.6,radius:TECH2.pull.range*.5,col:'#8fe9ff'});toast('Притяжение: '+TECH2.pull.dur+' с');
}
function pullTick(dt){
 const s=arenaState;if(!s||!(s.pullT>0))return;s.pullT-=dt;const R=TECH2.pull.range;
 for(const o of s.orbs.concat(s.chests,s.points)){const dx=s.px-o.x,dy=s.py-o.y,d=Math.hypot(dx,dy);if(d<R&&d>8){const k=Math.min(d,520*dt)/d;o.x+=dx*k;o.y+=dy*k}}
 for(const e of s.enemies.concat(aliveBosses(s))){if(e.hp<=0)continue;const dx=s.px-e.x,dy=s.py-e.y,d=Math.hypot(dx,dy);if(d<R&&d>70){const sp=(e.isBoss?90:300)*dt,k=Math.min(d-70,sp)/d;moveEnemy(e,dx*k,dy*k)}}
}
/* Отталкивание: отбрасывает всех вокруг, небольшой урон, мобы на миг оглушены */
function castRepel(t){
 const s=arenaState,P=TECH2.repel,dmg=P.base*myMult(t);
 s.qiEffects.push({type:'stun',x:s.px,y:s.py,life:0,duration:.6,radius:P.range});shake(8);
 for(const e of s.enemies.concat(aliveBosses(s))){
  if(e.hp<=0)continue;const dx=e.x-s.px,dy=e.y-s.py,d=Math.hypot(dx,dy)||1;if(d>P.range)continue;
  const dist=P.push*(1-d/P.range*.5)*(e.isBoss?.3:1),n=12;for(let i=0;i<n;i++)moveEnemy(e,dx/d*dist/n,dy/d*dist/n);
  if(!e.isBoss)e.stun=Math.max(e.stun||0,.6);
  if(damageEnemy(e,dmg))killReward(e);
 }
 toast('Отталкивание');
}
/* Мираж: двойник отвлекает врагов — они теряют тебя из виду и идут к нему */
function castMirage(t){
 const s=arenaState;s.decoy={x:s.px,y:s.py,t:TECH2.mirage.dur,ang:s.facing||0};
 for(const e of s.enemies.concat(aliveBosses(s))){if(e.hp<=0)continue;if(Math.hypot(e.x-s.px,e.y-s.py)<VISION_RADIUS*1.6){e.lastX=s.decoy.x;e.lastY=s.decoy.y;e.seenT=TECH2.mirage.dur;e.wind=null}}
 burst(s.px,s.py,18,'#8fe9ff',200,.6,2.6);toast('Мираж: двойник на '+TECH2.mirage.dur+' с');
}
/* враг видит игрока, если он в зоне видимости и не отвлечён двойником (вплотную ещё видит) */
function canSeePlayer(d){const s=arenaState;return d<=VISION_RADIUS&&!(s.decoy&&s.decoy.t>0&&d>130)}
/* Отравление: ближайшая цель теряет здоровье и Ци, а её техники срабатывают реже */
function castPoison(t){
 const s=arenaState,P=TECH2.poison;let best=null,bd=P.range;
 for(const e of s.enemies.concat(aliveBosses(s))){if(e.hp<=0)continue;const d=Math.hypot(e.x-s.px,e.y-s.py);if(d<bd){bd=d;best=e}}
 if(!best){const k=CD_KEY.poison;s[k]=0;save.qi+=techCost(t);return toast('Нет цели в радиусе '+P.range)}
 best.poison={t:P.dur,dps:P.base*myMult(t)/P.dur,qps:(best.maxQi||0)*.5/P.dur};
 s.qiEffects.push({type:'single',x:s.px,y:s.py,ang:Math.atan2(best.y-s.py,best.x-s.px),life:0,duration:.3,range:bd,cone:.05});burst(best.x,best.y,12,'#9bff6a',160,.6,2.4);
 toast('Отравление: '+fmt(best.poison.dps*P.dur)+' урона за '+P.dur+' с');
}
/* тик яда на противнике (вызывается из entTick) */
function poisonTick(e,dt){
 const p=e.poison;if(!p||e.hp<=0)return;p.t-=dt;
 const dmg=p.dps*dt/entToughness(e);e.hp=Math.max(0,e.hp-dmg);e.qi=Math.max(0,(e.qi||0)-p.qps*dt);
 if(e.cd)e.cd.atk=Math.max(e.cd.atk,.7);
 if(arenaState&&Math.random()<dt*6)addPart({k:'spark',x:e.x+rnd(-12,12),y:e.y+rnd(-10,10),vx:0,vy:-30,t:0,max:.6,size:2.6,col:'#9bff6a',drag:1});
 if(p.t<=0)e.poison=null;
 if(e.hp<=0){e.poison=null;spawnDeath(e);killReward(e)}
}
/* таймеры и двойник (вызывается из arenaLoop) */
function tech2Tick(dt){
 const s=arenaState;if(!s)return;
 for(const k in CD_KEY)s[CD_KEY[k]]=Math.max(0,(s[CD_KEY[k]]||0)-dt);
 s.bladeT=Math.max(0,(s.bladeT||0)-dt);pullTick(dt);
 if(s.decoy){s.decoy.t-=dt;if(s.decoy.t<=0)s.decoy=null}
}
function drawDecoy(time){
 const s=arenaState;if(!s||!s.decoy)return;const p=worldToScreen(s.decoy.x,s.decoy.y);
 drawFighter(ax,{x:p.x,y:p.y,ang:s.decoy.ang,sc:1.05,pal:PAL.player,wp:time*4,mv:0,t:time,seed:5.1,alpha:.5,aura:'#8fe9ff',auraR:36,auraA:.5});
}
