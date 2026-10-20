'use strict';
function arenaSnapshot(){const s=arenaState;return s?{t:s.t,players:[{id:'local',x:s.px,y:s.py,hp:s.hp,facing:s.facing}],enemies:s.enemies.filter(e=>e.hp>0).map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,stars:e.stars})),bosses:aliveBosses(s).map(b=>({id:b.id,x:b.x,y:b.y,hp:b.hp}))}:null}
function startArena(){
 stopArena();show('arena');resizeArena();arenaState=restoreArenaCheckpoint();
 arenaMeditation.active=false;$('arenaMeditateBtn').classList.remove('meditating');$('arenaMeditateBtn').classList.remove('hidden');
 techPage=0;rebuildTechButtons(true);
 const tip=document.querySelector('.arena-tip');tip.classList.remove('off');clearTimeout(tipTimer);tipTimer=setTimeout(()=>tip.classList.add('off'),9000);
 updateArenaUI();drawArena(performance.now()/1000);raf=requestAnimationFrame(arenaLoop);
}
function arenaTier(s){return s&&s.bossIndex?s.bossIndex:1}
function migrateArenaEntities(state){
 for(const e of state.enemies){
  if(e.v!==ENT_V){const st=e.stars||0,old=e.hp<=0?0:(e.maxHp?Math.min(1,e.hp/e.maxHp):1),techs=e.techs||(e.technique?[e.technique]:[]);
   applyKit(e,{stars:st,techs});e.hp=old<=0?0:Math.max(1,Math.round(e.maxHp*old))}
  if(e.id==null)e.id=nid();if(!e.cd)e.cd={atk:2,sh:0,dash:2};
 }
 /* шесть боссов: из старого одиночного босса (state.boss) берём его запись, остальных создаём заново */
 const oldB=(Array.isArray(state.bosses)?state.bosses:[]).concat(state.boss&&typeof state.boss==='object'?[state.boss]:[]);state.bosses=[];delete state.boss;
 for(let i=1;i<=MAX_BOSS_INDEX;i++){
  let b=oldB.find(q=>q&&(q.index||(q.tier===2?2:1))===i);
  if(!b)b=newBoss(i);
  else if(b.v!==BOSS_V){const r=b.maxHp?Math.min(1,Math.max(0,b.hp)/b.maxHp):1,nb=newBoss(i,b.zone);nb.x=b.x;nb.y=b.y;nb.hp=b.hp<=0?0:Math.max(1,Math.round(nb.maxHp*r));if(b.respawnT!=null)nb.respawnT=b.respawnT;b=nb}
  if(b.id==null)b.id=nid();if(!b.zone)b.zone=i;if(!b.home)b.home={x:BOSS_HOMES[i-1][0],y:BOSS_HOMES[i-1][1]};
  if(b.hp<=0&&b.respawnT==null)b.respawnT=BOSS_RESPAWN;
  state.bosses.push(b)}
 ensureBossZones(state);
 if(state.maxHp!==save.health){const r=state.maxHp?Math.min(1,state.hp/state.maxHp):1;state.maxHp=save.health;state.hp=Math.max(1,Math.round(save.health*r))}
}
let arenaState=null,raf=0,aw=0,ah=0;const ac=$('arenaCanvas'),ax=ac.getContext('2d');
function resizeArena(){const r=$('arena').getBoundingClientRect();aw=ac.width=Math.max(1,Math.floor(r.width*devicePixelRatio));ah=ac.height=Math.max(1,Math.floor(r.height*devicePixelRatio));ac.style.width=r.width+'px';ac.style.height=r.height+'px';ax.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
function stopArena(){if(raf)cancelAnimationFrame(raf);raf=0;arenaState=null}
function freshArenaField(){
 const state={world:10000,px:5000,py:5000,camx:5000,camy:5000,hp:save.health,maxHp:save.health,enemies:[],orbs:[],chests:[],points:[],hazards:[],obstacles:[],bosses:[],bossIndex:1,springs:[],dx:0,dy:0,lastMoveX:0,lastMoveY:1,shootAng:0,attackAnim:0,qiEffects:[],invuln:0,dashCd:0,dashTime:0,dashDuration:.18,dashSpeed:1350,contactCd:0,spawnTimer:4,checkpointTimer:2,last:performance.now()};
 for(let i=0;i<MOB_START;i++)state.enemies.push(makeMob(1000+Math.random()*8000,1000+Math.random()*8000,0));
 for(let i=0;i<40;i++)state.orbs.push({x:300+Math.random()*9400,y:300+Math.random()*9400,r:11,value:10});
 for(let i=0;i<14;i++)state.chests.push({x:400+Math.random()*9200,y:400+Math.random()*9200,r:18,value:50});
 for(let i=0;i<10;i++)state.points.push({x:400+Math.random()*9200,y:400+Math.random()*9200,r:25,value:25});
 for(let i=0;i<7;i++){const pw=[3,3,3,5,5,8,8][i];state.hazards.push({x:500+Math.random()*9000,y:500+Math.random()*9000,r:100+Math.random()*130,pw})}
 state.springs=[];for(let i=0;i<3;i++){const pw=[3,5,8][i];state.springs.push({x:500+Math.random()*9000,y:500+Math.random()*9000,r:90+Math.random()*70,pw})}
 for(let i=0;i<65;i++){const o={x:250+Math.random()*9500,y:250+Math.random()*9500,w:55+Math.random()*100,h:45+Math.random()*90,type:Math.random()<.5?'tree':'rock'};if(Math.hypot(o.x-5000,o.y-5000)<650||Math.hypot(o.x-5000,o.y-5320)<200||BOSS_HOMES.some(h=>Math.hypot(o.x-h[0],o.y-h[1])<BOSS_ZONE_R+120)||circleRectRaw(o.x,o.y,60,{x:5000,y:3400,w:150,h:150})){i--;continue}state.obstacles.push(o)}
 state.springs=state.springs||[];for(const z of state.hazards)z.pw=z.pw||3;
 state.loot=(save.lostLoot||[]).slice();save.lostLoot=[];
 migrateArenaEntities(state);initFx(state);return state;
}
/* тихое место для возрождения: из набора случайных точек берём ту, где рядом меньше всего мобов/боссов, вне препятствий, опасных зон и зон боссов */
function quietSpot(s){
 let best=null;const foes=s.enemies.filter(e=>e.hp>0).concat(aliveBosses(s));
 for(let i=0;i<80;i++){
  const x=700+Math.random()*8600,y=700+Math.random()*8600;
  if(blocked(x,y,40,'player'))continue;
  if((s.hazards||[]).some(z=>Math.hypot(x-z.x,y-z.y)<z.r+60))continue;
  if(BOSS_HOMES.some(h=>Math.hypot(x-h[0],y-h[1])<BOSS_ZONE_R+400))continue;
  let n=0,md=1e9;for(const e of foes){const d=Math.hypot(e.x-x,e.y-y);if(d<1000)n++;if(d<md)md=d}
  const sc=n*10000-Math.min(md,3000);if(!best||sc<best.sc)best={x,y,sc}
 }
 return best||{x:5000,y:5000};
}
function circleRectRaw(x,y,r,o){const cx=Math.max(o.x-o.w/2,Math.min(x,o.x+o.w/2)),cy=Math.max(o.y-o.h/2,Math.min(y,o.y+o.h/2));return Math.hypot(x-cx,y-cy)<r}
function saveArenaCheckpoint(){
 if(!arenaState)return;
 const cp={world:arenaState.world,px:arenaState.px,py:arenaState.py,camx:arenaState.camx,camy:arenaState.camy,hp:arenaState.hp,maxHp:arenaState.maxHp,enemies:arenaState.enemies,orbs:arenaState.orbs,chests:arenaState.chests,points:arenaState.points,hazards:arenaState.hazards,obstacles:arenaState.obstacles,bosses:arenaState.bosses,springs:arenaState.springs||[],sects:arenaState.sects||[],chron:arenaState.chron||[],loot:arenaState.loot||[]};
 save.arenaCheckpoint=JSON.parse(JSON.stringify(cp));
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));localStorage.setItem('wuxiaBuildVersion',BUILD_VERSION);localStorage.setItem('wuxiaSaveSchema',SAVE_SCHEMA)}catch(e){}
}
function restoreArenaCheckpoint(){
 const cp=save.arenaCheckpoint;if(!cp)return freshArenaField();
 let state;try{state=JSON.parse(JSON.stringify(cp))}catch(e){return freshArenaField()}
 if(!state||typeof state!=='object')return freshArenaField();
 state.world=Number.isFinite(state.world)?state.world:10000;
 state.px=Number.isFinite(state.px)?state.px:5000; state.py=Number.isFinite(state.py)?state.py:5000;
 state.camx=Number.isFinite(state.camx)?state.camx:state.px; state.camy=Number.isFinite(state.camy)?state.camy:state.py;
 state.hp=Number.isFinite(state.hp)?state.hp:save.health; state.maxHp=Number.isFinite(state.maxHp)?state.maxHp:save.health;
 for(const k of ['enemies','orbs','chests','points','hazards','obstacles','loot'])if(!Array.isArray(state[k]))state[k]=[];
 for(const k of ['springs','sects','chron'])if(!Array.isArray(state[k]))state[k]=[];
 for(const z of state.hazards)z.pw=z.pw||3;
 Object.assign(state,{dx:0,dy:0,lastMoveX:0,lastMoveY:1,shootAng:0,attackAnim:0,qiEffects:[],invuln:0,dashCd:0,dashTime:0,dashDuration:.18,dashSpeed:1350,contactCd:0,spawnTimer:4,checkpointTimer:2,last:performance.now()});
 state.bossIndex=Number.isFinite(state.bossIndex)?state.bossIndex:(state.boss&&state.boss.index?state.boss.index:(state.boss&&state.boss.tier===2?2:(state.firstBossDefeated?2:1)));state.bossIndex=Math.max(state.bossIndex,1);delete state.firstBossDefeated;
 for(const e of state.enemies){if(!e||typeof e!=='object')continue;e.maxHp??=e.hp||100;e.stars??=0;e.technique??=null;e.r??=20;e.s??=55;e.hit??=0;e.ang??=0}
 migrateArenaEntities(state);initFx(state);return state;
}
function activeShields(excludeId){
 const s=arenaState,out=[];
 if(s.shield>0&&excludeId!=='player')out.push({x:s.px,y:s.py,r:42});
 for(const e of s.enemies){if(e.hp>0&&e.shield>0&&e.id!==excludeId)out.push({x:e.x,y:e.y,r:32})}
 for(const b of aliveBosses(s))if(b.shield>0&&b.id!==excludeId)out.push({x:b.x,y:b.y,r:b.tier===2?68:62});
 return out;
}
function blocked(x,y,r,selfId){
 if(arenaState.obstacles.some(o=>circleRect(x,y,r,o)))return true;
 /* щиты твёрдые, но из них можно выйти: блокируется только движение, которое глубже втискивает в щит (иначе залипание) */
 let ox=x,oy=y;const st=arenaState;
 if(selfId==='player'){ox=st.px;oy=st.py}else{const me=(st.bosses||[]).find(q=>q.id===selfId)||st.enemies.find(q=>q.id===selfId);if(me){ox=me.x;oy=me.y}}
 for(const sh of activeShields(selfId)){const nd=Math.hypot(x-sh.x,y-sh.y);if(nd<r+sh.r&&nd<Math.hypot(ox-sh.x,oy-sh.y)-1e-6)return true}
 return false;
}
function circleRect(x,y,r,o){const cx=Math.max(o.x-o.w/2,Math.min(x,o.x+o.w/2)),cy=Math.max(o.y-o.h/2,Math.min(y,o.y+o.h/2));return Math.hypot(x-cx,y-cy)<r}
function worldToScreen(x,y){return{x:x-arenaState.camx+aw/devicePixelRatio/2,y:y-arenaState.camy+ah/devicePixelRatio/2}}
/* ---- arena state / fx bookkeeping ---- */
/* ---- rewards / drops ---- */
/* награда привязана к культивации противника: этап I — осколки души = число звёзд; этап II (есть колонны) — осколки 2 этапа = число колонн */
function killReward(e){
 const s=arenaState;if(!s)return;
 if(e.sect!=null)sectKilledByPlayer(e);
 const L=dropVictimLoot(e),stage2=L.k===2,rw=L.v;
 dropHint(e);
 if(e.isBoss){toast('Босс повержен: выпало '+fmt(rw)+(stage2?' осколков 2 этапа':' осколков души')+' — подбери');floatText(e.x,e.y-84,'+'+fmt(rw),stage2?'#c9a8ff':'#ffd85b',20);shake(12);onBossDefeated(e)}
 else{if(rw>0)floatText(e.x,e.y-28,'💎'+fmt(rw),stage2?'#c9a8ff':'#ffd85b',12);mobDrop(e)}
}
/* ---- main loop ---- */
function arenaLoop(t){
 const s=arenaState;if(!s)return;
 const dt=Math.max(0,Math.min(.035,(t-s.last)/1000));s.last=t;s.t+=dt;
 s.invuln=Math.max(0,s.invuln-dt);s.dashCd=Math.max(0,s.dashCd-dt);s.contactCd=Math.max(0,s.contactCd-dt);s.punchCd=Math.max(0,(s.punchCd||0)-dt);s.cdArea=Math.max(0,(s.cdArea||0)-dt);s.cdStun=Math.max(0,(s.cdStun||0)-dt);tech2Tick(dt);s.spawnTimer-=dt;s.checkpointTimer-=dt;
 s.hitFlash=Math.max(0,s.hitFlash-dt*3.5);s.hurt=Math.max(0,s.hurt-dt*2.2);s.shake=Math.max(0,s.shake-dt*30);s.aimT=Math.max(0,s.aimT-dt);s.castAnim=Math.max(0,s.castAnim-dt);s.qiCast=Math.max(0,(s.qiCast||0)-dt);s.shieldFlash=Math.max(0,s.shieldFlash-dt*3);s.qiShieldFlash=Math.max(0,(s.qiShieldFlash||0)-dt*3);
 if(s.spawnTimer<=0){spawnEnemy();s.spawnTimer=2+Math.random()*1.5}
 if(s.checkpointTimer<=0){saveArenaCheckpoint();s.checkpointTimer=2}
 if(!arenaMeditation.active&&save.stars>0&&save.qi<save.maxQi)save.qi=Math.min(save.maxQi,save.qi+starRegen()*dt);
 applyQiZones(dt);
 if(s.stun>0){s.stun-=dt;if(s.stun<=0){s.stun=0;s.stunImm=3}}else if(s.stunImm>0)s.stunImm=Math.max(0,s.stunImm-dt);
 const m=s.stun>0?0:Math.hypot(s.dx,s.dy);let moved=0;
 if(m>.08){s.lastMoveX=s.dx/m;s.lastMoveY=s.dy/m;const ox=s.px,oy=s.py;movePlayer(s.dx*260*dt,s.dy*260*dt);moved=Math.hypot(s.px-ox,s.py-oy);if(!s.kbAim||bodyFollowsMove(s))s.facing=lerpAng(s.facing,Math.atan2(s.dy,s.dx),dt*16)}
 if(s.kbAim)updateMouseAim();
 if(s.dashTime>0){const ox=s.px,oy=s.py,step=s.dashSpeed*dt;movePlayer(s.lastMoveX*step,s.lastMoveY*step);moved+=Math.hypot(s.px-ox,s.py-oy);s.dashTime=Math.max(0,s.dashTime-dt);s.ghostAcc+=dt;if(s.ghostAcc>.028){s.ghostAcc=0;s.ghosts.push({x:s.px,y:s.py,ang:s.facing,wp:s.wp,t:0,max:.32})}}
 s.mv+=((moved>.05?1:0)-s.mv)*Math.min(1,dt*10);s.wp+=moved*.11;
 s.camx+=(s.px-s.camx)*.18;s.camy+=(s.py-s.camy)*.18;s.attackAnim=Math.max(0,s.attackAnim-dt);
 for(const e of s.enemies){
  if(e.hp<=0)continue;
  entTick(e,dt);
  if(e.stun>0){e.stun-=dt;e.mv=0;e.hit=Math.max(0,e.hit-dt);continue}
  if(duelStep(e,dt)){e.hit=Math.max(0,e.hit-dt);continue}
  if(fearStep(e,dt))continue;
  const dx=s.px-e.x,dy=s.py-e.y,d=Math.hypot(dx,dy)||1,seePlayer=aggroCheck(e,d,dt);
  if(seePlayer){e.seenT=TARGET_MEMORY_TIME;e.lastX=s.px;e.lastY=s.py}else e.seenT=Math.max(0,(e.seenT||0)-dt);
  const engaged=seePlayer||e.seenT>0;
  const ox=e.x,oy=e.y;
  if(engaged){
   const tgx=seePlayer?dx:e.lastX-e.x,tgy=seePlayer?dy:e.lastY-e.y;e.ang=Math.atan2(tgy,tgx);
   if(!(seePlayer&&mobAI(e,dt,d)))moveEnemy(e,Math.cos(e.ang)*e.s*dt,Math.sin(e.ang)*e.s*dt);
  }else{
   mobIdle(e,dt);
  }
  for(const o of s.enemies){if(o===e||o.hp<=0)continue;const sx=e.x-o.x,sy=e.y-o.y,sd=Math.hypot(sx,sy)||1,mn=e.r+o.r+3;if(sd<mn){e.x+=sx/sd*(mn-sd)*.5;e.y+=sy/sd*(mn-sd)*.5}}
  const md=Math.hypot(e.x-ox,e.y-oy);e.mv=(e.mv||0)+((md>.05?1:0)-(e.mv||0))*Math.min(1,dt*8);e.wp=(e.wp||0)+md*.13;e.atk=Math.max(0,(e.atk||0)-dt);
  if(seePlayer&&d<45&&e.mcd<=0){takeDamage(entMelee(e),'melee');e.mcd=.65;e.atk=.32}
  e.hit=Math.max(0,e.hit-dt);
 }
 bossLoop(dt);warTick(dt);lootPickups(dt);collect();updateHeal(dt);pillTick(dt);mapTick(dt);
 if(s.channel){const ch=s.channel;ch.t+=dt;if(ch.t>=ch.dur){s.channel=null;const st=ch.tech,cost=techCost(st);if(save.qi>=cost){save.qi-=cost;s.cdStun=AREA_CD.stun;applyStun(st)}else toast('Недостаточно Ци. Нужно '+cost)}}
 save.qi=Math.max(0,Math.min(save.maxQi,save.qi));
 updateFx(dt);emitFx(dt,m<=.08);
 if(s.hp<=0){save.qi=0;const lost=Math.floor(save.rewards*.3);save.rewards-=lost;if(lost>0)(s.loot=s.loot||[]).push({x:s.px,y:s.py,k:1,v:lost});const lostItem=playerGearDrop(s);/* карта постоянна: остаётся как есть, игрок возрождается там, где меньше всего мобов */
  const q=quietSpot(s);s.px=s.camx=q.x;s.py=s.camy=q.y;s.hp=s.maxHp=save.health;s.shield=0;s.invuln=2;persist();saveArenaCheckpoint();stopArena();show('home');toast('Ты пал на арене. Вся Ци утрачена, потеряно '+fmt(lost)+' осколков души (они лежат на месте гибели). Ты возродишься в тихом месте карты.'+(lostItem?' Выпала вещь: '+GEAR[lostItem].name+'.':''));return}
 updateArenaUI();drawArena(t/1000);raf=requestAnimationFrame(arenaLoop);
}
/* ---- arena UI ---- */
function collect(){let changed=false;for(let i=arenaState.orbs.length-1;i>=0;i--){const q=arenaState.orbs[i];if(Math.hypot(q.x-arenaState.px,q.y-arenaState.py)<42){save.qi=Math.min(save.maxQi,save.qi+q.value);arenaState.orbs.splice(i,1);changed=true;toast('Сфера Ци: +'+q.value)}}for(let i=arenaState.chests.length-1;i>=0;i--){const q=arenaState.chests[i];if(Math.hypot(q.x-arenaState.px,q.y-arenaState.py)<48){save.rewards+=q.value;arenaState.chests.splice(i,1);changed=true;toast('Сундук: +'+q.value+' осколков в резерв')}}for(let i=(arenaState.loot||[]).length-1;i>=0;i--){const q=arenaState.loot[i];if(Math.hypot(q.x-arenaState.px,q.y-arenaState.py)<50){if(q.k===3){gearGive(q.item,true);arenaState.loot.splice(i,1);changed=true;toast('Подобран предмет: '+((GEAR[q.item]||{}).name||'вещь')+' (в инвентаре)')}else{if(q.k===2)save.rewards2+=q.v;else save.rewards+=q.v;arenaState.loot.splice(i,1);changed=true;toast('Подобрано '+fmt(q.v)+(q.k===2?' осколков 2 этапа':' осколков души'))}}}for(let i=arenaState.points.length-1;i>=0;i--){const q=arenaState.points[i];if(Math.hypot(q.x-arenaState.px,q.y-arenaState.py)<52){save.rewards+=q.value;arenaState.points.splice(i,1);changed=true;toast('Точка силы: +'+q.value+' осколков')}}if(changed)persist()}
function qiZoneDelta(x,y){
 const s=arenaState;let d=0;
 for(const z of s.hazards)if(Math.hypot(x-z.x,y-z.y)<=z.r)d-=z.pw||3;
 for(const z of (s.springs||[])){const rg=zoneRing(z,x,y);if(rg<3)d+=(z.pw||3)*SPRING_PASSIVE_X*RING_K[rg]}
 return d;
}
function applyQiZones(dt){
 const s=arenaState;
 let pd=qiZoneDelta(s.px,s.py);if(pd>0&&arenaMeditation.active)pd=0;if(pd)save.qi=Math.max(0,Math.min(save.maxQi,save.qi+pd*dt));
 for(const e of s.enemies.concat(aliveBosses(s))){if(e.hp<=0||e.maxQi==null)continue;const ed=qiZoneDelta(e.x,e.y);if(ed)e.qi=Math.max(0,Math.min(e.maxQi,e.qi+ed*dt))}
}
function drawArena(time){
 const s=arenaState,W=aw/devicePixelRatio,H=ah/devicePixelRatio;
 ax.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);ax.clearRect(0,0,W,H);ensureGround();
 ax.save();const shk=s.shake||0;if(shk>.2)ax.translate((Math.random()-.5)*shk,(Math.random()-.5)*shk);
 drawGround(W,H,time);drawTufts(W,H,time);
 for(const z of s.hazards)drawHazard(z,W,H,time);
 for(const z of (s.springs||[]))drawSpring(z,W,H,time);
 drawZoneMarks(W,H,time);
 drawMobTelegraphs(time);
 for(const q of s.points)drawPoint(q,W,H,time);
 for(const q of s.orbs)drawOrb(q,W,H,time);
 for(const q of s.chests)drawChest(q,W,H,time);
 drawLoot(time);
 for(const o of s.obstacles){const p=worldToScreen(o.x,o.y);if(p.x>-130&&p.x<W+130&&p.y>-130&&p.y<H+130)drawObstacle(ax,p.x,p.y,o,time)}
 for(const g of s.ghosts)drawGhost(g);
 for(const c of s.corpses)drawCorpse(c);
 for(const e of s.enemies){if(e.hp>0)drawEnemy(e,W,H,time)}
 drawBoss(W,H,time);
 drawNpcs(time);drawTradeHint(time);
 drawPlayer(time);
 drawDecoy(time);
 for(const fx of s.qiEffects)drawQiFx(fx,time);
 for(const sl of s.slashes)drawSlash(sl);
 drawParts();drawFloats();
 const b=aliveBosses(s).sort((p,q)=>Math.hypot(p.x-s.px,p.y-s.py)-Math.hypot(q.x-s.px,q.y-s.py))[0];if(b){const me=worldToScreen(s.px,s.py),ang=Math.atan2(b.y-s.py,b.x-s.px),rr=48+6*Math.sin(time*4);ax.save();ax.translate(me.x,me.y);ax.rotate(ang);ax.fillStyle='#ffd85b';ax.globalAlpha=.9;ax.beginPath();ax.moveTo(rr+14,0);ax.lineTo(rr-2,-7);ax.lineTo(rr+3,0);ax.lineTo(rr-2,7);ax.closePath();ax.fill();ax.restore()}
 ax.restore();
 drawAmbient(W,H,time);
 if(arenaMeditation.active){ax.fillStyle='rgba(30,70,150,.11)';ax.fillRect(0,0,W,H)}
 ax.globalAlpha=.85;ax.drawImage(vigDark,0,0,W,H);
 const lowHp=s.hp/s.maxHp<.3?.22+.16*Math.sin(time*6):0,hv=Math.max(Math.min(1,(s.hurt||0)*.9),lowHp);
 if(hv>0){ax.globalAlpha=hv;ax.drawImage(vigRed,0,0,W,H)}
 ax.globalAlpha=1;
}
/* медитация: полный набор Ци с нуля — 80 с (вдвое медленнее прежнего), в источнике Ци — вдвое быстрее; время пропорционально недостающей Ци */
const MEDITATE_FULL_SEC=80,SPRING_PASSIVE_X=3,SPRING_MEDITATE_X=2;
function inSpring(){const s=arenaState;return !!s&&(s.springs||[]).some(z=>Math.hypot(s.px-z.x,s.py-z.y)<=z.r)}
function springMedFactor(){const s=arenaState;let f=1;if(s)for(const z of (s.springs||[])){const r=zoneRing(z,s.px,s.py);if(r<3)f=Math.max(f,SPRING_MEDITATE_X*RING_K[r])}return f}
let arenaMeditation={active:false,start:0,last:0,duration:40000,startQi:0,targetQi:0,progress:0};
function interruptArenaMeditation(){if(arenaMeditation.active){arenaMeditation.active=false;arenaMeditation.progress=0;const btn=$('arenaMeditateBtn');if(btn)btn.classList.remove('meditating')}}
function beginArenaMeditation(){if(!arenaState||arenaMeditation.active||arenaState.channel)return;if(save.qi>=save.maxQi)return toast('Ци уже полностью восстановлена.');arenaMeditation.startQi=save.qi;arenaMeditation.targetQi=save.maxQi;arenaMeditation.progress=0;arenaMeditation.active=true;arenaMeditation.start=performance.now();arenaMeditation.last=performance.now();$('arenaMeditateBtn').classList.add('meditating');requestAnimationFrame(arenaMeditationLoop)}
function stopArenaMeditation(){if(!arenaMeditation.active)return;arenaMeditation.active=false;$('arenaMeditateBtn').classList.remove('meditating');persist();toast(arenaMeditation.progress>=.999?'Медитация завершена':'Медитация прервана')}
function arenaMeditationLoop(now){if(!arenaMeditation.active||!arenaState)return;const dt=Math.min(.1,Math.max(0,(now-(arenaMeditation.last||now))/1000));arenaMeditation.last=now;const rate=save.maxQi/MEDITATE_FULL_SEC*springMedFactor();save.qi=Math.min(arenaMeditation.targetQi,save.qi+rate*dt);const span=Math.max(1,arenaMeditation.targetQi-arenaMeditation.startQi);arenaMeditation.progress=Math.min(1,(save.qi-arenaMeditation.startQi)/span);const left=(arenaMeditation.targetQi-save.qi)/rate;$('arenaMedLabel').textContent=arenaMeditation.progress<1?'МЕДИТАЦИЯ '+left.toFixed(1)+'с':'ГОТОВО';if(arenaMeditation.progress<1)requestAnimationFrame(arenaMeditationLoop);else{arenaMeditation.active=false;$('arenaMeditateBtn').classList.remove('meditating');persist();toast('Ци полностью восстановлена')}}
