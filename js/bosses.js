'use strict';
/* версия записи босса и его полный набор техник (все типы, что бывают у игрока) */
const BOSS_V=3;
const BOSS_KIT=['shield','dodge','qiSingle','qiArea','qiShield','stun','heal'];
/* шесть боссов (0–5 колонн) одновременно на карте, каждый стоит в своей «сверхзоне» Ци; убитый воскресает через BOSS_RESPAWN секунд */
const BOSS_ZONE_PW=20,BOSS_RESPAWN=180,BOSS_HOMES=[[5000,3300],[7600,4200],[7400,7000],[4600,8300],[2200,6600],[2400,2600]],BOSS_ZONE_R=480,BOSS_INNER_R=168,BOSS_LEASH=1200;
function newBoss(index=1,zone){
 index=Math.max(1,Math.min(MAX_BOSS_INDEX,index));zone=Math.max(1,Math.min(MAX_BOSS_INDEX,zone||index));
 const cols=index-1,tier=index>=2?2:1,h=BOSS_HOMES[zone-1],b={id:nid(),zone,x:h[0],y:h[1],home:{x:h[0],y:h[1]},r:tier===1?34:38,s:tier===1?72:78,ang:0,hit:0,isBoss:true,tier,index,columns:cols,invuln:0,seenT:0,wanderT:0,mv:0,wp:0};
 /* 100 звёзд + колонны: здоровье, сила, Ци и сила техник — по тем же формулам, что у игрока */
 applyKit(b,{stars:100,techs:BOSS_KIT.slice()});b.v=BOSS_V;
 return b;
}
function aliveBosses(s){return (s&&s.bosses?s.bosses:[]).filter(b=>b&&b.hp>0)}
/* у каждого босса своя зона восстановления Ци */
function ensureBossZones(state){
 ensureZones(state);
}
function onBossDefeated(b){
 const s=arenaState;if(!s||!b)return;
 const fi=b.index||1;b.respawnT=BOSS_RESPAWN;releaseArmy(fi,null);
 if(BOSS_SCROLL[fi])dropBossScroll(b,fi);
 const next=Math.min(MAX_BOSS_INDEX+1,fi+1);
 if(next>(s.bossIndex||1)){s.bossIndex=next;rerollLiveMobs(next);toast('Босс '+fi+' повержен. Воскреснет через '+Math.round(BOSS_RESPAWN/60)+' мин. Мобы стали сильнее.')}
 else toast('Босс '+fi+' повержен. Воскреснет через '+Math.round(BOSS_RESPAWN/60)+' мин.');
 persist();
}
function dropBossScroll(b,tier){
 const ids=[].concat(BOSS_SCROLL[tier]||[]);
 for(const id of ids){
  const r=autoFormTechnique(id),nm=techniqueName(id);
  const msg=r.mode==='new'?'Техника «'+nm+'» сформировалась сама\nмаршрут: '+r.n+' ★ (лучший из возможных)':r.mode==='upgraded'?'Техника «'+nm+'» улучшена\nновый маршрут: '+r.n+' ★':r.mode==='kept'?'Техника «'+nm+'»: твой маршрут ('+r.n+' ★) уже лучший':'Для техники «'+nm+'» не нашлось маршрута\nвыпал чертёж: Культивация → Свитки';
  if(r.mode==='kept')toast('📜 '+msg.replace('\n',' · '));else showBanner('📜 '+msg);burst(b.x,b.y,30,'#c58cff',280,1.1,3.2);floatText(b.x,b.y-100,'📜 '+nm,'#e6d0ff',17);
  if(typeof renderTechList==='function')try{renderTechList()}catch(e){}
 }
}
/* ---- stun (hold to cast) ---- */
/* ---- boss ---- */
function bossLoop(dt){
 const s=arenaState;if(!s||!s.bosses)return;
 for(let i=0;i<s.bosses.length;i++){const b=s.bosses[i];
  if(b.hp<=0){b.respawnT=(b.respawnT==null?BOSS_RESPAWN:b.respawnT)-dt;
   if(b.respawnT<BOSS_RESPAWN-45){b.brkT=(b.brkT||0)+dt;if(b.brkT>=5){b.brkT=0;if(Math.random()<.5&&tryBreakthrough(i))continue}}
   if(b.respawnT<=0){s.bosses[i]=newBoss(b.index||i+1,b.zone);toast('Босс '+(b.index||i+1)+' возродился');}continue}
  bossStep(b,dt)}
}
function bossStep(b,dt){
 const s=arenaState;
 b.invuln=Math.max(0,(b.invuln||0)-dt);b.hit=Math.max(0,(b.hit||0)-dt);entTick(b,dt);
 if(b.stun>0){b.stun-=dt;b.mv=0;b.wind=null;return}
 if(duelStep(b,dt)){b.cult=false;return}
 const dx=s.px-b.x,dy=s.py-b.y,d=Math.hypot(dx,dy)||1,seePlayer=aggroCheck(b,d,dt);
 if(seePlayer){b.seenT=TARGET_MEMORY_TIME;b.lastX=s.px;b.lastY=s.py}else b.seenT=Math.max(0,(b.seenT||0)-dt);
 b.engagedT=seePlayer?3:Math.max(0,(b.engagedT||0)-dt);
 const hd=Math.hypot(b.x-b.home.x,b.y-b.home.y),engaged=seePlayer||(b.seenT>0&&hd<BOSS_LEASH);
 if(!engaged){
  b.wind=null;
  b.wanderT=(b.wanderT||0)-dt;if(b.wanderT<=0||b.wanderAng==null){b.wanderAng=Math.random()*TAU;b.wanderT=2+Math.random()*3}
  if(hd>BOSS_INNER_R*.8)b.wanderAng=Math.atan2(b.home.y-b.y,b.home.x-b.x);
  const lt=hd<BOSS_LEASH?nearestLoot(b,1100):null;if(lt)b.wanderAng=Math.atan2(lt.y-b.y,lt.x-b.x);/* босс охотится за осколками рядом с домом */
  b.ang=b.wanderAng;b.cult=hd<=BOSS_INNER_R&&!lt;if(b.cult)evolveTick(b,dt*zoneGrow(zoneOfBoss(b),0));
  const ox=b.x,oy=b.y;const bsp=(lt||hd>BOSS_INNER_R*.8)?1:.4;moveBoss(b,Math.cos(b.ang)*b.s*bsp*dt,Math.sin(b.ang)*b.s*bsp*dt);
  const md=Math.hypot(b.x-ox,b.y-oy);b.mv=(b.mv||0)+((md>.05?1:0)-(b.mv||0))*Math.min(1,dt*8);b.wp=(b.wp||0)+md*.09;
  /* вне боя босс лечится техникой «Лечение»: 3 Ци = 1 здоровья, скорость как у игрока */
  if(b.hp<b.maxHp&&b.qi>0){const sp=Math.min(healRate({nodes:{length:PATH_CAP}})*dt,b.qi);b.qi-=sp;b.healAcc=(b.healAcc||0)+sp;const g=Math.floor(b.healAcc/3);if(g>0){b.healAcc-=g*3;b.hp=Math.min(b.maxHp,b.hp+g)}}
  return;
 }
 const tgx=seePlayer?dx:b.lastX-b.x,tgy=seePlayer?dy:b.lastY-b.y;
 b.ang=b.wind?b.wind.ang:Math.atan2(tgy,tgx);
 b.cult=false;const busy=seePlayer&&mobAI(b,dt,d);
 if(busy)b.mv=0;
 else if(d>55){const ox=b.x,oy=b.y;moveBoss(b,Math.cos(b.ang)*b.s*dt,Math.sin(b.ang)*b.s*dt);const md=Math.hypot(b.x-ox,b.y-oy);b.mv+=((md>.05?1:0)-(b.mv||0))*Math.min(1,dt*8);b.wp=(b.wp||0)+md*.09}
 else b.mv=0;
 /* физический удар — собственная сила босса по формуле игрока (10 + 0,9 за звезду) */
 if(d<58&&b.mcd<=0){takeDamage(entMelee(b),'melee');b.mcd=.65}
}
function moveBoss(b,dx,dy){let nx=Math.max(100,Math.min(9900,b.x+dx)),ny=Math.max(100,Math.min(9900,b.y+dy));if(!blocked(nx,b.y,b.r,b.id))b.x=nx;if(!blocked(b.x,ny,b.r,b.id))b.y=ny}
/* boss portraits (frame rects inside the boss atlas) */
const BOSSP={master:[0,0,122,144],elite:[142,0,112,146]},BOSS_S=.86;
function bossFrame(c,img,m,x,y,sc,al){const w=m[2]*sc,h=m[3]*sc;c.globalAlpha=al;c.drawImage(img,m[0],m[1],m[2],m[3],x-w/2,y-h/2,w,h)}
function drawBoss(W,H,time){for(const b of aliveBosses(arenaState))drawBossOne(b,W,H,time)}
function drawBossOne(b,W,H,time){
 const s=arenaState;const p=worldToScreen(b.x,b.y);if(p.x<-150||p.x>W+150||p.y<-150||p.y>H+150)return;
 const t2=b.tier===2,aur=t2?'#ff8a3a':'#ffd85b',w=b.wind,wk=w?w.t/w.dur:0,o=SPR.boss,m=BOSSP[t2?'master':'elite'];
 ax.save();ax.translate(p.x,p.y);ax.globalCompositeOperation='lighter';ax.rotate(time*.5);
 ax.strokeStyle=aur+'99';ax.lineWidth=2;ax.setLineDash([16,9]);ax.beginPath();ax.arc(0,0,66,0,TAU);ax.stroke();ax.setLineDash([]);
 for(let i=0;i<8;i++){ax.save();ax.rotate(i*TAU/8);ax.translate(66,0);ax.fillStyle=aur+'cc';ax.fillRect(-2.5,-5,5,10);ax.restore()}
 ax.restore();
 ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y,72*(1+.05*Math.sin(time*3))+10*wk,aur,.5+.25*wk);ax.globalCompositeOperation='source-over';
 ax.fillStyle='rgba(0,0,0,.3)';ax.beginPath();ax.ellipse(p.x+2,p.y+42,34,11,0,0,TAU);ax.fill();
 if(o.ok){
  const mv=b.mv||0,bob=-10-Math.abs(Math.sin(b.wp||0))*2.6*mv,sway=Math.sin(b.wp||0)*.04*mv,lean=Math.cos(b.ang||0)*.05,pulse=w?1+.05*Math.sin(time*26)*wk+.04*wk:1,flip=Math.cos(b.ang||0)<-.2?-1:1;
  ax.save();ax.translate(p.x,p.y+40);ax.rotate(sway+lean);ax.scale(flip,1);ax.translate(0,-40);
  bossFrame(ax,o.img,m,0,bob,BOSS_S*pulse,1);
  if(b.hit>0){const wt=tinted('boss','#ffffff');if(wt)bossFrame(ax,wt,m,0,bob,BOSS_S*pulse,Math.min(.75,b.hit/.2*.75))}
  if(w){const rt=tinted('boss','#ff4030');if(rt)bossFrame(ax,rt,m,0,bob,BOSS_S*pulse,.25+.3*wk)}
  ax.globalAlpha=1;ax.restore();
 }else drawFighter(ax,{x:p.x,y:p.y,ang:b.ang||0,sc:1.55,pal:t2?PAL.boss2:PAL.boss,wp:b.wp||0,mv:b.mv||0,t:time,seed:1.7,flash:b.hit>0?Math.min(1,b.hit/.2):0,pose:w?'raise':'',aura:aur,auraR:60,auraA:.55,crown:true,fistGlow:aur});
 if(w){ax.globalCompositeOperation='lighter';const fx=p.x+Math.cos(b.ang)*36,fy=p.y+Math.sin(b.ang)*26;glow(ax,fx,fy,10+34*wk,'#ff5a4a',.9);ax.globalCompositeOperation='source-over'}
 ax.globalCompositeOperation='lighter';for(let i=0;i<3;i++){const a=time*1.4+i*TAU/3;glow(ax,p.x+Math.cos(a)*54,p.y+Math.sin(a)*46,9,aur,.9)}ax.globalCompositeOperation='source-over';
 if(b.shield>0)shieldBubble(ax,p.x,p.y,62,1,0,time);
 drawBar(ax,p.x,p.y-72,78,b.hp/b.maxHp,7);
 outText(ax,(t2?'ПРАКТИК':'БОСС')+' · 100 ★'+(b.core?' · ЯДРО ×'+b.core.toFixed(1)+(b.dens?' ('+b.dens+'/5)':''):(b.columns?' · '+b.columns+' КОЛОННА':''))+(b.cult?' · КУЛЬТИВИРУЕТ':'')+(arenaState&&arenaState.enemies.some(m=>m.lord===b.index)?' · армия '+arenaState.enemies.filter(m=>m.hp>0&&m.lord===b.index).length:''),p.x,p.y-80,'#fff',11);
}
