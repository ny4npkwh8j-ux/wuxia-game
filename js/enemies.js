'use strict';
/* ===== enemies / bosses use the same power formula ===== */
/* ===== mobs: stars, techniques, AI, drops ===== */
function maxMobStars(bossIndex){
 const target=.85*bossMult({columns:Math.max(0,bossIndex-1)});
 let lo=1,hi=100,ans=1;
 while(lo<=hi){const mid=(lo+hi)>>1;if(mobMult(mid)<=target){ans=mid;lo=mid+1}else hi=mid-1}
 return ans;
}
/* после смерти босса с N колоннами (индекс N+1) появляются мобы с колоннами до N−1 */
function maxMobCols(bossIndex){return Math.max(0,bossIndex-3)}
function mobTierRange(bossIndex){const cap=maxMobStars(bossIndex);return{a:Math.max(3,Math.round(cap*.3)),b:cap,cols:cap>=100?maxMobCols(bossIndex):0}}
const MOB_W={shield:40,dodge:22,qiSingle:18,qiShield:12,qiArea:6};
function rollKit(bossIndex){
 const T=mobTierRange(bossIndex),r=Math.random();let stars=0,cnt=0;
 if(r<.10){stars=Math.max(8,1+Math.floor(Math.random()*T.b));cnt=1+Math.floor(Math.random()*3)}
 else if(r<.10+1/3){stars=Math.max(3,1+Math.floor(Math.random()*T.a));cnt=1}
 if(stars&&T.cols>0&&Math.random()<.3)return{stars:100,techs:['shield','dodge','qiSingle','qiArea','qiShield','stun','heal'],columns:1+Math.floor(Math.random()*T.cols)};
 if(!stars)return{stars:0,techs:[]};
 let techs=[];
 if(stars>=60){techs=['shield','dodge','qiSingle','qiArea'];if(Math.random()<.4)techs.push('qiShield')}
 else{
  const pool=Object.keys(MOB_W).filter(t=>MOB_MIN[t]<=stars);
  for(let i=0;i<cnt&&pool.length;i++){const tot=pool.reduce((a,t)=>a+MOB_W[t],0);let x=Math.random()*tot,pick=pool[0];for(const t of pool){x-=MOB_W[t];if(x<=0){pick=t;break}}techs.push(pick);pool.splice(pool.indexOf(pick),1)}
 }
 return{stars,techs};
}
/* версия записи противника (при несовпадении сохранённый моб пересобирается по новым формулам, звёзды/техники/доля здоровья сохраняются) */
const ENT_V=4;
/* дальность техник: у боссов длиннее */
const ENT_RANGE={mob:{single:300,area:350,stun:500},boss:{single:600,area:450,stun:500}};
/* цена техник — по тем же правилам, что и у игрока */
function entCost(e,t){return t==='dodge'?Math.ceil(.05*e.maxQi):t==='qiShield'?0:Math.ceil((TECH_COST[t]+.3*(e.stars||0))*entQiVol(e))}
/* здоровье, сила и запас Ци — по тем же формулам, что у игрока (bodyHp / bodyStr / bodyQi) */
function applyKit(e,kit){
 if(kit.columns!=null)e.columns=kit.columns;
 const S=kit.stars,C=e.core>0?e.core:1,mh=bodyHp(S)*C,mq=bodyQi(S,e.columns||0,(e.isBoss||e.columns>0)?PILLAR_Q[0][2]:0)*C;
 Object.assign(e,{v:ENT_V,stars:S,str:bodyStr(S)*C,techs:kit.techs,technique:kit.techs[0]||null,hp:mh,maxHp:mh,qi:mq,maxQi:mq,shield:0,shieldMax:0,qiShieldOn:kit.techs.includes('qiShield'),qsFlash:0,wind:null,mcd:0,cd:{atk:e.isBoss?.8:1+Math.random()*1.5,sh:0,dash:1+Math.random()*2,stun:2,area:0}});
 return e;
}
/* общий тик противника (моб или босс): кулдауны, восстановление Ци как у игрока */
function entTick(e,dt){
 const cd=e.cd||(e.cd={atk:2,sh:0,dash:2,stun:2});
 cd.atk-=dt;cd.sh-=dt;cd.dash-=dt;cd.stun=(cd.stun??0)-dt;cd.area=(cd.area??0)-dt;
 e.mcd=Math.max(0,(e.mcd||0)-dt);if(e.poison)poisonTick(e,dt);
 if(e.maxQi!=null)e.qi=Math.min(e.maxQi,e.qi+.5*Math.min(100,e.stars||0)/100*dt);
 e.qsFlash=Math.max(0,(e.qsFlash||0)-dt*3);
}
function makeMob(x,y,bossIndex){return applyKit({id:nid(),x,y,r:20,s:(45+Math.random()*25),ang:0,hit:0,seenT:0,wanderT:0},rollKit(bossIndex))}
function rerollLiveMobs(bossIndex){
 const s=arenaState;if(!s)return;
 for(const e of s.enemies){if(e.hp<=0)continue;const k=rollKit(bossIndex);applyKit(e,k);if(!k.columns)e.columns=0;e.s=(45+Math.random()*25)*(1+k.stars/500)}
}
function damageEnemy(e,damage,src,melee){
 if(src!=='ent')provoke(e);
 if(melee)damage*=1-entArmorCut(e);
 if(e.hp<=0)return false;const raw=damage/entToughness(e);let dmg=raw;
 if(e.shield>0){const a=Math.min(e.shield,dmg);e.shield-=a;dmg-=a}
 if(dmg>0&&e.qiShieldOn&&e.qi>0){const a=Math.min(dmg,e.qi/QI_SHIELD_RATIO);e.qi=Math.max(0,e.qi-a*QI_SHIELD_RATIO);dmg-=a;e.qsFlash=1;if(e.qi<=0)e.qiShieldOn=false}
 if(dmg>0)e.hp=Math.max(0,e.hp-dmg);e.hit=.25;
 if(arenaState){floatText(e.x,e.y-(e.isBoss?66:30),fmt(Math.max(1,raw)),'#ffffff',raw>=30?18:14);burst(e.x,e.y,e.isBoss?7:5,'#ffe9a0',170,.35,2.2);if(e.hp<=0)spawnDeath(e)}
 return e.hp<=0;
}
/* ИИ противника (моб или босс): возвращает true, пока противник занят (замах) и не должен идти.
   Щит — сразу, как только увидел игрока; техники применяются чаще, чем раньше. */
function mobAI(e,dt,d){
 const s=arenaState,tc=e.techs;if(!tc||!tc.length)return false;
 const boss=!!e.isBoss,R=boss?ENT_RANGE.boss:ENT_RANGE.mob,cd=e.cd,cost=t=>entCost(e,t),M=entMult(e);
 if(e.wind){const w=e.wind;w.t+=dt;if(w.t>=w.dur){entFire(e,w);e.wind=null}return true}
 if(tc.includes('shield')&&e.shield<=0&&cd.sh<=0&&e.qi>=cost('shield')){
  e.qi-=cost('shield');e.shieldMax=entShieldMax(e);e.shield=e.shieldMax;cd.sh=boss?4:6;burst(e.x,e.y,8,'#63e9ff',150,.4,2.4);
  if(boss)toast('Босс активировал Защитный покров');
 }
 if(cd.atk<=0){
  const opts=[];
  if(tc.includes('qiSingle')&&d<R.single*.95&&e.qi>=cost('qiSingle'))opts.push('single');
  if(tc.includes('qiArea')&&cd.area<=0&&d<R.area*.95&&e.qi>=cost('qiArea'))opts.push('area');
  if(tc.includes('stun')&&cd.stun<=0&&d<R.stun*.9&&!(s.stun>0)&&!(s.stunImm>0)&&e.qi>=cost('stun'))opts.push('stun');
  if(opts.length){
   const k=opts[Math.floor(Math.random()*opts.length)];
   const dur=k==='single'?(boss&&e.tier!==2?.85:.65):k==='area'?(boss?.95:1.1):1.1;
   e.wind={type:k,t:0,dur,ang:e.ang,range:R[k]};
   e.qi-=cost(k==='single'?'qiSingle':k==='area'?'qiArea':'stun');
   cd.atk=boss?1.2+Math.random()*.9:2.2+Math.random()*1.6;
   if(k==='stun')cd.stun=AREA_CD.stun+3;if(k==='area')cd.area=AREA_CD.qiArea+(boss?0:2);
   if(boss)toast(k==='single'?'Босс собирает Удар Ци — уходи с линии!':k==='area'?'Босс собирает Удар по площади — выходи из круга!':'Босс собирает Оцепенение — выходи из круга!');
   return true;
  }
 }
 const dc=Math.ceil(.05*e.maxQi);
 if(tc.includes('dodge')&&cd.dash<=0&&d>240&&d<650&&e.qi>=dc){
  const dist=Math.min(dashDist(e.stars),d-70);
  if(dist>40){e.qi-=dc;burst(e.x,e.y,8,'#69ef8b',150,.35,2.6);(boss?moveBoss:moveEnemy)(e,Math.cos(e.ang)*dist,Math.sin(e.ang)*dist);burst(e.x,e.y,8,'#69ef8b',150,.35,2.6);cd.dash=dashCdOf(e.stars)*2+(boss?1.5:3);if(boss)toast('Босс применил Рывок')}
 }
 return false;
}
function entFire(e,w){
 const s=arenaState,boss=!!e.isBoss,M=entMult(e);
 if(w.type==='stun'){
  s.qiEffects.push({type:'stun',x:e.x,y:e.y,life:0,duration:.95,radius:w.range,hostile:true});shake(8);
  /* оцепенение игрока: те же формулы силы, что и при оцепенении врагов; рывок (неуязвимость) спасает */
  if(Math.hypot(s.px-e.x,s.py-e.y)<=w.range&&s.invuln<=0){takeDamage(10);stunPlayer(stunMaxDur(PATH_CAP)*M/(M+playerRefMult()))}
  return;
 }
 const dmg=TECH_BASE[w.type==='single'?'qiSingle':'qiArea']*M;
 if(w.type==='single'){
  const cone=Math.PI/7;
  s.qiEffects.push({type:'single',x:e.x,y:e.y,ang:w.ang,life:0,duration:.38,range:w.range,cone,hostile:true});
  if(boss)for(let i=0;i<16;i++){const aa=w.ang+rnd(-cone,cone)*.9,sp=rnd(300,600);addPart({k:'spark',x:e.x+Math.cos(aa)*40,y:e.y+Math.sin(aa)*40,vx:Math.cos(aa)*sp,vy:Math.sin(aa)*sp,t:0,max:rnd(.25,.5),size:rnd(2,3.6),col:'#ff7a5a',drag:2.6})}
  const dd=Math.hypot(s.px-e.x,s.py-e.y),ad=Math.atan2(s.py-e.y,s.px-e.x);if(dd<=w.range&&Math.abs(angDiff(ad,w.ang))<=cone)takeDamage(dmg);
 }else{s.qiEffects.push({type:'area',hostile:true,x:e.x,y:e.y,life:0,duration:.5,radius:w.range});if(Math.hypot(s.px-e.x,s.py-e.y)<=w.range)takeDamage(dmg)}
 shake(boss?9:5);
}
/* оцепенение игрока (от босса): нельзя двигаться и применять техники; после — 3 с иммунитета, чтобы не было вечного стана */
function stunPlayer(dur){
 const s=arenaState;if(!s||!(dur>.05)||s.stunImm>0)return;
 s.stun=dur;s.dashTime=0;s.channel=null;s.qiCharge=null;s.heal=null;interruptArenaMeditation();
 floatText(s.px,s.py-52,'ОЦЕПЕНЕНИЕ '+dur.toFixed(1)+'с','#c9a8ff',15);burst(s.px,s.py,12,'#c9a8ff',160,.6,2.6);toast('Оцепенение! Ты не можешь действовать '+dur.toFixed(1)+' с');
}
function playerStunned(){const s=arenaState;return !!(s&&s.stun>0)}
function drawMobTelegraphs(time){
 const s=arenaState,W=aw/devicePixelRatio,list=s.enemies.concat(aliveBosses(s));
 for(const e of list){
  if(e.hp<=0||!e.wind)continue;const w=e.wind,p=worldToScreen(e.x,e.y),k=Math.min(1,w.t/w.dur),R=w.range||(w.type==='single'?300:350);
  if(p.x<-R-100||p.x>W+R+100)continue;
  const fill=w.type==='stun'?'160,110,255':'255,60,50',edge=w.type==='stun'?'206,170,255':'255,110,90';
  ax.save();ax.translate(p.x,p.y);ax.setLineDash([10,7]);ax.lineDashOffset=-time*40;
  if(w.type==='single'){ax.rotate(w.ang);sector(ax,R,Math.PI/7);ax.fillStyle='rgba('+fill+',.10)';ax.fill();sector(ax,R*k,Math.PI/7);ax.fillStyle='rgba('+fill+','+(.2+.3*k)+')';ax.fill();sector(ax,R,Math.PI/7);ax.strokeStyle='rgba('+edge+',.9)';ax.lineWidth=2;ax.stroke()}
  else{ax.beginPath();ax.arc(0,0,R,0,TAU);ax.fillStyle='rgba('+fill+',.08)';ax.fill();ax.beginPath();ax.arc(0,0,R*k,0,TAU);ax.fillStyle='rgba('+fill+','+(.18+.25*k)+')';ax.fill();ax.beginPath();ax.arc(0,0,R,0,TAU);ax.strokeStyle='rgba('+edge+',.9)';ax.lineWidth=2;ax.stroke()}
  ax.restore();
 }
}
const MOB_DOT={shield:'#63e9ff',dodge:'#69ef8b',qiSingle:'#ffd84d',qiArea:'#ff9a3a',qiShield:'#ffe23a'};
function drawEnemy(e,W,H,time){
 const p=worldToScreen(e.x,e.y);if(p.x<-70||p.x>W+70||p.y<-80||p.y>H+70)return;
 const st=e.stars||0,sty=enemyStyle(st),t=enemyTier(st),o=SPR.enemy,k=sectOf(e.ang||0),sc=EN.SC[t];
 if(sty.aura){ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y,34*(1+.07*Math.sin(time*3+e.x)),sty.aura,.3+st/300);ax.globalCompositeOperation='source-over'}
 ax.fillStyle='rgba(0,0,0,.28)';ax.beginPath();ax.ellipse(p.x+1,p.y+22,16*sc,6*sc,0,0,TAU);ax.fill();
 if(o.ok){
  const mv=e.mv||0,wp=e.wp||0,bob=-Math.abs(Math.sin(wp))*2*mv,sway=Math.sin(wp)*.05*mv,at=e.atk>0?Math.sin((1-e.atk/.32)*Math.PI):0,ang=e.ang||0;
  const x=p.x+Math.cos(ang)*6*at,y=p.y+bob+Math.sin(ang)*4*at;
  ax.save();ax.translate(p.x,p.y+22);ax.rotate(sway);ax.translate(-p.x,-(p.y+22));
  if(e.qiShieldOn&&e.qi>0){const yt=tinted('enemy','#ffd23a');if(yt){ax.globalCompositeOperation='lighter';enFrame(ax,yt,k,t,x,y,sc*1.13,Math.min(1,.5+.2*Math.sin(time*4+e.x)+.35*(e.qsFlash||0)));ax.globalCompositeOperation='source-over'}}
  enFrame(ax,o.img,k,t,x,y,sc*(1+.05*at),1);
  if(e.hit>0){const wt=tinted('enemy','#ffffff');if(wt)enFrame(ax,wt,k,t,x,y,sc,Math.min(.75,e.hit/.18*.75))}
  if(e.stun>0){const it=tinted('enemy','#7fb0ff');if(it)enFrame(ax,it,k,t,x,y,sc,.5)}
  if(e.wind){const rt=tinted('enemy','#ff4030');if(rt)enFrame(ax,rt,k,t,x,y,sc,.25+.3*Math.min(1,e.wind.t/e.wind.dur))}
  ax.globalAlpha=1;ax.restore();
 }else drawFighter(ax,{x:p.x,y:p.y,ang:e.ang||0,pal:sty.pal,wp:e.wp||0,mv:e.mv||0,t:time,flash:e.hit>0?Math.min(1,e.hit/.18):0,atk:e.atk||0,stun:e.stun>0?1:0});
 if(e.stun>0){ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y,30,'#8fb8ff',.4);ax.globalCompositeOperation='source-over';ax.fillStyle='#fff3a0';for(let i=0;i<3;i++){const a=time*3.4+i*TAU/3;star4(ax,p.x+Math.cos(a)*14,p.y-28+Math.sin(a)*4,4.2);ax.fill()}}
 if(e.shield>0){ax.save();ax.strokeStyle='rgba(99,233,255,.55)';ax.lineWidth=1.8;ax.setLineDash([5,5]);ax.lineDashOffset=-time*14;ax.beginPath();ax.arc(p.x,p.y,30,0,TAU);ax.stroke();ax.restore()}
 drawBar(ax,p.x,p.y-40,36,e.hp/(e.maxHp||100),5);
 if(e.sect)drawSectMark(e,p);
 if(st>0){outText(ax,'★'+st+(e.core?' · ЯДРО'+(e.dens?' '+e.dens+'/5':''):(e.columns?' · '+e.columns+' КОЛ.':'')),p.x-2,p.y-46,'#ffd85b',10);const ts=e.techs||[];ts.slice(0,5).forEach((tt,i)=>{ax.fillStyle=MOB_DOT[tt]||'#fff';ax.beginPath();ax.arc(p.x+13+i*6,p.y-50,2.6,0,TAU);ax.fill()})}
 if(e.stun>0)outText(ax,e.stun.toFixed(1)+'с',p.x,p.y-56-(st>0?4:-4),'#c9a8ff',10);
}
function mobDrop(e){
 const techs=e.techs||[];if(!techs.length||Math.random()>.2)return;
 const newType=t=>(t==='qiShield'||t==='stun')&&!hasScroll(t);
 let type=techs[Math.floor(Math.random()*techs.length)];
 if(newType(type)){if(Math.random()>.01){const alt=techs.filter(t=>!newType(t));if(!alt.length)return;type=alt[Math.floor(Math.random()*alt.length)]}}
 const n=Math.max(MIN_STARS[type],Math.min(PATH_CAP,e.stars||MIN_STARS[type])),tier=(e.stars||0)<=10?'low':'mid';
 const bp=addBlueprint({type,n,tier,src:'mob'});
 cornerToast('📄 '+techniqueName(type)+' · '+n+' ★');floatText(e.x,e.y-52,'📄 '+techniqueName(type),'#e6d0ff',14);
}
function moveEnemy(e,dx,dy){let nx=Math.max(70,Math.min(9930,e.x+dx)),ny=Math.max(70,Math.min(9930,e.y+dy));if(!blocked(nx,e.y,e.r,e.id))e.x=nx;if(!blocked(e.x,ny,e.r,e.id))e.y=ny}
function spawnEnemy(){
 if(!arenaState||arenaState.enemies.filter(e=>e.hp>0).length>=MOB_MAX)return;
 const side=Math.floor(Math.random()*4), margin=450;
 let x=arenaState.px,y=arenaState.py;
 if(side===0){x=Math.max(margin,arenaState.px-(900+Math.random()*1400));y=Math.max(margin,Math.min(10000-margin,arenaState.py+(Math.random()-.5)*1800))}
 if(side===1){x=Math.min(10000-margin,arenaState.px+(900+Math.random()*1400));y=Math.max(margin,Math.min(10000-margin,arenaState.py+(Math.random()-.5)*1800))}
 if(side===2){y=Math.max(margin,arenaState.py-(900+Math.random()*1400));x=Math.max(margin,Math.min(10000-margin,arenaState.px+(Math.random()-.5)*1800))}
 if(side===3){y=Math.min(10000-margin,arenaState.py+(900+Math.random()*1400));x=Math.max(margin,Math.min(10000-margin,arenaState.px+(Math.random()-.5)*1800))}
 if(blocked(x,y,24))return;
 arenaState.enemies.push(makeMob(x,y,arenaTier(arenaState)));
}
function enemyStyle(st){return st>=71?{pal:PAL.e3,aura:'#ffe27a'}:st>=41?{pal:PAL.e2,aura:'#b47bff'}:st>=1?{pal:PAL.e1,aura:'#ff9a3a'}:{pal:PAL.e0,aura:null}}
/* enemy atlas: 8 columns (canvas-angle sectors) x 5 tier rows */
const EN={FW:124,FH:150,S:.4,SC:[1,1.03,1.07,1.12,1.16]};
function enemyTier(st){return st>=100?4:st>=71?3:st>=41?2:st>=1?1:0}
function enFrame(c,img,k,t,x,y,sc,al){const w=EN.FW*EN.S*sc,h=EN.FH*EN.S*sc;c.globalAlpha=al;c.drawImage(img,k*EN.FW,t*EN.FH,EN.FW,EN.FH,x-w/2,y-h/2,w,h)}
function drawCorpse(c){
 const p=worldToScreen(c.x,c.y),k=c.t/c.max;
 if(c.boss){const o=SPR.boss;if(!o.ok)return;const m=BOSSP[c.tier];bossFrame(ax,o.img,m,p.x,p.y-10-k*16,BOSS_S*(1-.15*k),1-k);const wt=tinted('boss','#ffffff');if(wt)bossFrame(ax,wt,m,p.x,p.y-10-k*16,BOSS_S*(1-.15*k),(1-k)*.8);ax.globalAlpha=1;return}
 const o=SPR.enemy;if(!o.ok)return;const sc=EN.SC[c.tier],k8=sectOf(c.ang);
 enFrame(ax,o.img,k8,c.tier,p.x,p.y-k*14,sc*(1-.2*k),1-k);const wt=tinted('enemy','#ffffff');if(wt)enFrame(ax,wt,k8,c.tier,p.x,p.y-k*14,sc*(1-.2*k),(1-k)*.85);ax.globalAlpha=1;
}

/* ---- культивация у зон Ци ---- */
const MOB_GROW_SEC=45;
/* ближайшая зона Ци босса (она же — место сбора) */
function nearestBossZone(x,y){let best=null,bd=1e9;for(const z of (arenaState.springs||[])){if(!z.bz)continue;const d=Math.hypot(x-z.x,y-z.y);if(d<bd){bd=d;best=z}}return best}
/* мирное поведение моба: культиваторы (со звёздами) частью идут к зоне Ци босса, сидят там и медленно растут */
function mobIdle(e,dt){
 if(e.zoneBound==null)e.zoneBound=(e.stars||0)>0&&Math.random()<.6;
 e.wanderT=(e.wanderT||0)-dt;if(e.wanderT<=0||e.wanderAng==null){e.wanderAng=Math.random()*TAU;e.wanderT=1.5+Math.random()*2.5}
 let sp=.35;e.cult=false;
 if(e.shopping&&mobShopStep(e,dt))return;
 let lt=(e.stars||0)>0?nearestLoot(e,e.hunter?900:500):null;if(lt&&forbidZone(e,lt.x,lt.y))lt=null;/* в запретный круг за осколками не лезут */
 if(lt){e.ang=Math.atan2(lt.y-e.y,lt.x-e.x);e.wanderAng=e.ang;e.wanderT=.5;moveEnemy(e,Math.cos(e.ang)*e.s*.7*dt,Math.sin(e.ang)*e.s*.7*dt);e.cult=false;return}
 if(huntStep(e,dt))return;
 /* цель каждого культиватора — зона Ци: сесть в разрешённом круге, расти и когда-нибудь занять центр */
 if(e.sect&&sectStep(e,dt))return;
 if(zoneStep(e,dt))return;
 /* бродячий моб: в запретные круги не заходит (понимает, что нельзя) */
 if(forbidZone(e,e.x+Math.cos(e.wanderAng)*70,e.y+Math.sin(e.wanderAng)*70)){const fz=forbidZone(e,e.x+Math.cos(e.wanderAng)*70,e.y+Math.sin(e.wanderAng)*70);e.wanderAng=Math.atan2(e.y-fz.y,e.x-fz.x)+(Math.random()-.5);e.wanderT=1.5}
 e.ang=e.wanderAng;moveEnemy(e,Math.cos(e.ang)*e.s*sp*dt,Math.sin(e.ang)*e.s*sp*dt);
}
/* рост на одну звезду: все параметры пересчитываются по тем же формулам, доля здоровья и Ци сохраняется */
function growMob(e){
 if((e.columns||0)>0||e.core>0)return;
 const cap=Math.min(100,maxMobStars(arenaTier(arenaState)));if((e.stars||0)>=cap)return;
 const r=e.maxHp?e.hp/e.maxHp:1,q=e.maxQi?e.qi/e.maxQi:1;
 applyKit(e,{stars:e.stars+1,techs:(e.techs||[]).slice()});e.hp=Math.max(1,e.maxHp*r);e.qi=e.maxQi*q;
}
/* прорыв: если босс мёртв, ближайший к нему по культивации моб из его зоны может занять его место */
function cultScore(e){return (e.columns||0)*100+(e.stars||0)}
function tryBreakthrough(i){
 const s=arenaState,b=s.bosses[i],z=(s.springs||[]).find(q=>q.bz===(b.zone||b.index||i+1));if(!z)return false;
 const need=((b.index||i+1)-1)*100+100-30;let best=null;
 for(const m of s.enemies){if(m.hp<=0||m.isBoss)continue;if(Math.hypot(m.x-z.x,m.y-z.y)>z.r*RING_MID)continue;if(cultScore(m)<need)continue;if(!best||cultScore(m)>cultScore(best))best=m}
 if(!best)return false;
 const nb=newBoss(b.index||i+1,b.zone);nb.x=best.x;nb.y=best.y;best.hp=0;best.removed=true;s.bosses[i]=nb;
 burst(nb.x,nb.y,40,'#ffd85b',320,1,3.4);toast('Моб совершил прорыв и стал боссом '+nb.index+'!');chron('Моб совершил прорыв и стал Боссом '+nb.index);return true;
}

/* ---- отношение к игроку: заметив игрока, противник с шансом AGGRO_CHANCE невзлюбит его и нападёт; иначе игнорирует, пока его не тронут ---- */
const AGGRO_CHANCE=.4;
/* ---- отношение по силе (правило игры): цель интересна, только если примерно равна по силе (PW_LO..PW_HI от своей).
   Слишком слабая и слишком сильная — не интересны; заметно сильнее (PW_FEAR и больше) — слабые мобы её боятся и убегают. ---- */
const PW_LO=.7,PW_HI=1.4,PW_FEAR=1.8,FEAR_RANGE=300;
function entPow(e){const s=arenaState,t=s?s.t:0;if(e._pwT==null||t<e._pwT||t-e._pwT>1){e._pw=Math.max(1e-6,entMult(e));e._pwT=t}return e._pw}
function playerPow(){const s=arenaState,t=s?s.t:0;if(s&&(s._ppwT==null||t<s._ppwT||t-s._ppwT>1)){s._ppw=Math.max(1e-6,playerRefMult());s._ppwT=t}return s?s._ppw:1}
function isEqualPow(r){return r>=PW_LO&&r<=PW_HI}
function equalFoes(a,b){return isEqualPow(entPow(b)/entPow(a))}
function aggroCheck(e,d,dt){
 if(isMate(e)){e.hostile=false;e.provoked=false;return false}/* свои по секте не нападают */
 const near=canSeePlayer(d);
 if(near){e.noSeeT=0;if(e.hostile==null)e.hostile=!!e.provoked||sectWarWithPlayer(e)||(isEqualPow(playerPow()/entPow(e))&&Math.random()<AGGRO_CHANCE)}
 else{e.noSeeT=(e.noSeeT||0)+dt;if(e.noSeeT>8){e.hostile=null;e.provoked=false}}
 if(!e.hostile&&e.team&&teamAlert(e.team))e.hostile=true;
 return near&&!!e.hostile;
}
/* игрок ударил противника: тот и его команда теперь враждебны */
function provoke(e){
 if(isMate(e)){const sc=playerSect();save.sectId=null;persist();chron('Игрок ударил своего и изгнан из секты'+(sc?' «'+sc.name+'»':''));toast('Ты ударил своего — тебя изгнали из секты!')}
 else if(save.sectId!=null)sectAssist(e);
 e.hostile=true;e.provoked=true;e.noSeeT=0;
 const s=arenaState;if(!s)return;
 if(e.team){const b=aliveBosses(s).find(q=>(q.index||0)===e.team);if(b){b.hostile=true;b.provoked=true;b.noSeeT=0}}
 if(e.isBoss){const t=e.index;for(const m of s.enemies)if(m.hp>0&&m.team===t){m.hostile=true;m.noSeeT=0}}
 if(e.sect)for(const m of s.enemies)if(m.hp>0&&m.sect===e.sect){m.hostile=true;m.noSeeT=0}
}
/* команда: мобы, которые культивируют в зоне босса, помогают ему, когда он воюет с игроком */
function teamAlert(t){const s=arenaState,b=aliveBosses(s).find(q=>(q.index||0)===t);return !!(b&&b.hostile&&b.engagedT>0)}

/* ---- эволюция противников по схеме игрока: звёзды → колонны → ядро ----
   Идёт, пока противник культивирует в зоне Ци. Платит осколками (e.sh1 — души, e.sh2 — 2 этапа, их приносят победы) или временем.
   Шансы и цены — те же, что у игрока; неудача: первая колонна — минус 20 звёзд, дальше — минус колонна, ядро — потеря всех колонн. */
const EVO_DENS_SEC=600,EVO_COL_SEC=300,EVO_CORE_SEC=900,FULL_KIT=['shield','dodge','qiSingle','qiArea','qiShield','stun','heal'];
function entMaxCols(e){return e.isBoss?MAX_PILLARS:maxMobCols(arenaTier(arenaState))}
function entRebuild(e,stars,cols,note){
 const r=e.maxHp?e.hp/e.maxHp:1,q=e.maxQi?e.qi/e.maxQi:1;
 applyKit(e,{stars,techs:FULL_KIT.slice(),columns:cols});e.hp=Math.max(1,e.maxHp*r);e.qi=e.maxQi*q;
 if(note&&e.isBoss&&arenaState)toast('Босс '+e.index+' '+note);
 if(arenaState)burst(e.x,e.y,e.isBoss?30:14,'#ffd85b',260,.9,3);
}
function evolveTick(e,dt){
 if(!arenaState)return;
 e.growT=(e.growT||0)+dt;
 if(e.core>0){
  const d=e.dens||0;if(d>=CORE_DENS_MAX)return;
  const cost=500*(d+1);
  if((e.sh2||0)>=cost||e.growT>=EVO_DENS_SEC){
   if((e.sh2||0)>=cost)e.sh2-=cost;e.growT=0;
   const r=(1+.1*(d+1))/(1+.1*d);e.dens=d+1;e.core*=r;entRebuild(e,100,0,'уплотнил ядро ('+e.dens+'/'+CORE_DENS_MAX+')');
  }
  return;
 }
 const S=e.stars||0,C=e.columns||0;
 if(S<100){
  const cap=e.isBoss?100:Math.min(100,maxMobStars(arenaTier(arenaState)));if(S>=cap)return;
  const cost=10+5*S;
  if((e.sh1||0)>=cost){e.sh1-=cost;e.growT=0;growMob(e);return}
  if(e.growT>=MOB_GROW_SEC){e.growT=0;growMob(e)}
  return;
 }
 const max=entMaxCols(e);
 if(C>=max&&C>=CORE_MIN_PILLARS){
  const pay=(e.sh2||0)>=CORE_SHARD_COST;
  if(pay||e.growT>=EVO_CORE_SEC){
   if(pay)e.sh2-=CORE_SHARD_COST;e.growT=0;
   if(Math.random()*100<coreChanceFor(C,0)){const q=coreQualityFor(C,entCoef(e));e.core=q.coef;entRebuild(e,100,0,'сформировал ядро: '+q.name+'!')}
   else entRebuild(e,100,0,'потерял все колонны при создании ядра');
  }
  return;
 }
 if(C>=max)return;
 const first=C===0,key=first?'sh1':'sh2',cost=first?10000:100*(C+1),pay=(e[key]||0)>=cost;
 if(pay||e.growT>=EVO_COL_SEC){
  if(pay)e[key]-=cost;e.growT=0;
  if(Math.random()*100<pillarChance(0))entRebuild(e,100,C+1,'сформировал колонну ('+(C+1)+')');
  else if(first)entRebuild(e,80,0,'потерял 20 звёзд при неудаче колонны');
  else entRebuild(e,100,C-1,'потерял колонну при неудаче');
 }
}

/* ---- войны между противниками: за места медитации и осколки ----
   Бой идёт напрямую между двумя существами (foeId — id соперника). Победитель получает осколки по схеме игрока:
   за слабого — осколки души = звёзды, за существо с колоннами — осколки 2 этапа = колонны (за ядро — 10). Осколки идут в эволюцию. */
function findEnt(id){const s=arenaState;if(!s||id==null)return null;return aliveBosses(s).find(b=>b.id===id)||s.enemies.find(m=>m.hp>0&&m.id===id)||null}
function startDuel(a,b){
 a.foeId=b.id;b.foeId=a.id;
 /* команды вступаются за своих */
 for(const x of [a,b]){const other=x===a?b:a;if(x.isBoss){for(const m of arenaState.enemies)if(m.hp>0&&m.team===x.index&&!m.foeId&&m!==other&&Math.hypot(m.x-x.x,m.y-x.y)<1500)m.foeId=other.id}
  else if(x.sect&&SM.get(x.sect)===x)for(const m of arenaState.enemies)if(m.hp>0&&m.sect===x.sect&&!m.foeId&&m!==other&&m!==x&&Math.hypot(m.x-x.x,m.y-x.y)<1100)m.foeId=other.id}
}
function duelStep(e,dt){
 const f=e.foeId!=null?findEnt(e.foeId):null;
 if(!f){e.foeId=null;e.challenge=false;return false}
 const s=arenaState,dx=f.x-e.x,dy=f.y-e.y,d=Math.hypot(dx,dy)||1;
 if(d>2600){e.foeId=null;e.challenge=false;return false}
 if(e.hostile&&Math.hypot(s.px-e.x,s.py-e.y)<350)return false;
 const boss=!!e.isBoss,R=boss?ENT_RANGE.boss:ENT_RANGE.mob,cd=e.cd,tc=e.techs||[],cost=t=>entCost(e,t);
 e.ang=Math.atan2(dy,dx);e.wind=null;
 if(tc.includes('shield')&&e.shield<=0&&cd.sh<=0&&d<500&&e.qi>=cost('shield')){e.qi-=cost('shield');e.shieldMax=entShieldMax(e);e.shield=e.shieldMax;cd.sh=boss?4:6;burst(e.x,e.y,8,'#63e9ff',150,.4,2.4)}
 const M=entMult(e);let fired=false;
 if(cd.atk<=0){
  if(tc.includes('qiArea')&&cd.area<=0&&d<R.area*.9&&e.qi>=cost('qiArea')){
   e.qi-=cost('qiArea');cd.area=AREA_CD.qiArea;cd.atk=1.6+Math.random()*1.4;fired=true;
   s.qiEffects.push({type:'area',hostile:true,x:e.x,y:e.y,life:0,duration:.5,radius:R.area});
   if(damageEnemy(f,TECH_BASE.qiArea*M,'ent')){entKill(e,f);return true}
  }else if(tc.includes('qiSingle')&&d<R.single*.9&&e.qi>=cost('qiSingle')){
   e.qi-=cost('qiSingle');cd.atk=1.4+Math.random()*1.4;fired=true;
   s.qiEffects.push({type:'single',x:e.x,y:e.y,ang:e.ang,life:0,duration:.38,range:R.single,cone:Math.PI/7,hostile:true});
   if(damageEnemy(f,TECH_BASE.qiSingle*M,'ent')){entKill(e,f);return true}
  }
 }
 const mover=boss?moveBoss:moveEnemy;
 if(d>55&&!(fired&&d<R.single*.5)){const ox=e.x,oy=e.y;mover(e,Math.cos(e.ang)*e.s*dt,Math.sin(e.ang)*e.s*dt);const md=Math.hypot(e.x-ox,e.y-oy);e.mv=(e.mv||0)+((md>.05?1:0)-(e.mv||0))*Math.min(1,dt*8);e.wp=(e.wp||0)+md*(boss?.09:.13)}
 else if(d<=60&&e.mcd<=0){e.mcd=.65;if(damageEnemy(f,entMelee(e),'ent',true)){entKill(e,f);return true}}
 return true;
}
function entKill(k,v){
 const s=arenaState;
 dropVictimLoot(v);
 k.foeId=null;
 if(v.isBoss){
  v.respawnT=BOSS_RESPAWN;
  if(!(k.challenge&&!k.isBoss))releaseArmy(v.index,k.isBoss?k:null);
  if(k.challenge&&!k.isBoss){
   const i=s.bosses.indexOf(v),nb=newBoss(v.index||i+1,v.zone);nb.x=v.x;nb.y=v.y;s.bosses[i]=nb;k.hp=0;
   burst(nb.x,nb.y,40,'#ffd85b',320,1,3.4);toast('Моб победил босса и занял его место — новый Босс '+nb.index+'!');chron('Моб победил Босса '+nb.index+' и занял его место');
  }else{toast('Босс '+v.index+' пал в бою с '+(k.isBoss?'Боссом '+k.index:'врагом'));chron('Босс '+v.index+' пал в бою с '+(k.isBoss?'Боссом '+k.index:'врагом'));if(k.isBoss)zoneSwapIfBetter(k,v)}
 }
 k.challenge=false;
}
function skirmishRoll(){
 const s=arenaState,near=m=>m.hostile&&Math.hypot(m.x-s.px,m.y-s.py)<700;
 const free=s.enemies.filter(m=>m.hp>0&&(m.stars||0)>0&&m.foeId==null&&!near(m)).concat(aliveBosses(s).filter(b=>b.foeId==null&&!near(b)));
 /* 1) чужаки в зоне босса */
 for(const b of aliveBosses(s)){if(b.foeId!=null)continue;const z=zoneOfBoss(b);if(!z)continue;
  for(const x of free){if(x===b||x.foeId!=null||x.team===b.index)continue;if(Math.hypot(x.x-z.x,x.y-z.y)<z.r*RING_MID&&equalFoes(b,x)&&Math.random()<.5){startDuel(b,x);break}}}
 /* 2) случайные встречи: пары рядом, не из одной команды */
 for(let i=0;i<free.length;i++){const a=free[i];if(a.foeId!=null)continue;
  for(let j=i+1;j<free.length;j++){const b=free[j];if(b.foeId!=null)continue;if(a.team&&a.team===b.team)continue;
   if(Math.hypot(a.x-b.x,a.y-b.y)<260&&equalFoes(a,b)&&Math.random()<.15){startDuel(a,b);break}}}
 /* 3) набеги боссов друг на друга при близких силах */
 const bs=aliveBosses(s).filter(b=>b.foeId==null&&!near(b));
 for(const a of bs){if(a.foeId!=null)continue;let t=null,td=3000;/* боссы охотятся друг на друга и на топовых мобов, равных им по силе */
  for(const b of bs.concat(s.enemies)){if(b===a||b.hp<=0||b.foeId!=null||(b.team&&b.team===a.index)||(a.index&&b.lord===a.index))continue;const d=Math.hypot(a.x-b.x,a.y-b.y);if(d<td&&equalFoes(a,b)){td=d;t=b}}
  const zb=t&&t.isBoss?zoneOfBoss(t):null,za=zoneOfBoss(a),want=zb&&za&&zb.pw>za.pw?3:1;/* боссы охотнее нападают на тех, чья зона Ци сильнее */
  if(t&&Math.random()<.04*want)startDuel(a,t)}
}
function challengeRoll(){
 const s=arenaState;
 for(const b of aliveBosses(s)){if(b.foeId!=null)continue;const bm=entMult(b);let best=null;
  for(const m of s.enemies){if(m.hp<=0||m.team!==b.index||m.foeId!=null)continue;const r=entMult(m)/bm;if(r>=.9&&(!best||r>best.r))best={m,r}}
  if(best&&Math.random()<.05){best.m.challenge=true;startDuel(best.m,b);toast('Моб бросил вызов Боссу '+b.index+'!')}}
}
/* слабые мобы убегают от заметно более сильных (игрока, мобов, боссов) */
function fearStep(e,dt){
 /* опасаются, но не панически: только часть мобов, недолго и не от тех, кто их тронул; если напали — отбиваются */
 if(e.isBoss||(e.lord&&teamAlert(e.lord))||e.hostile||e.provoked||e.hit>0)return false;
 if(e.timid==null)e.timid=Math.random()<.6;if(!e.timid)return false;
 const s=arenaState;e.fearT=(e.fearT||0)-dt;e.fearCd=Math.max(0,(e.fearCd||0)-dt);
 if(e.fearT<=0){
  e.fearT=.35+Math.random()*.3;let th=null,td=FEAR_RANGE;const my=entPow(e);
  const dp=Math.hypot(s.px-e.x,s.py-e.y);if(dp<td&&canSeePlayer(dp)&&playerPow()/my>=PW_FEAR){th={x:s.px,y:s.py};td=dp}
  for(const o of s.enemies){if(o===e||o.hp<=0||(e.team&&o.team===e.team))continue;const dx=o.x-e.x;if(dx>td||dx<-td)continue;const d=Math.hypot(dx,o.y-e.y);if(d<td&&entPow(o)/my>=PW_FEAR){th={x:o.x,y:o.y};td=d}}
  for(const b of aliveBosses(s)){if(b.index===e.lord||b.index===e.team)continue;const d=Math.hypot(b.x-e.x,b.y-e.y);if(d<td&&entPow(b)/my>=PW_FEAR){th={x:b.x,y:b.y};td=d}}
  e.fear=th&&e.fearCd<=0?{x:th.x,y:th.y,t:1.1}:null;
 }
 if(!e.fear){e.fearRun=0;return false}
 e.fearRun=(e.fearRun||0)+dt;if(e.fearRun>2.5){e.fearRun=0;e.fearCd=6+Math.random()*6;e.fear=null;return false}/* отошёл немного и успокоился */
 e.ang=Math.atan2(e.y-e.fear.y,e.x-e.fear.x);e.cult=false;e.wind=null;
 const ox=e.x,oy=e.y;moveEnemy(e,Math.cos(e.ang)*e.s*.6*dt,Math.sin(e.ang)*e.s*.6*dt);
 const md=Math.hypot(e.x-ox,e.y-oy);e.mv=(e.mv||0)+((md>.05?1:0)-(e.mv||0))*Math.min(1,dt*8);e.wp=(e.wp||0)+md*.13;e.atk=Math.max(0,(e.atk||0)-dt);e.hit=Math.max(0,e.hit-dt);
 return true;
}
/* равные по силе — добыча: охотник идёт к ближайшему равному и начинает бой */
function huntStep(e,dt){
 const s=arenaState;if(e.hunter==null)e.hunter=Math.random()<.5;if(!e.hunter||!((e.stars||0)>0))return false;
 e.huntT=(e.huntT||0)-dt;
 if(e.huntT<=0){
  e.huntT=.8+Math.random()*.6;e.prey=null;let bd=700;
  const cand=s.enemies.concat(aliveBosses(s));
  for(const x of cand){if(x===e||x.hp<=0||x.foeId!=null||(e.team&&x.team===e.team)||(e.lord&&x.lord===e.lord))continue;const d=Math.hypot(x.x-e.x,x.y-e.y);if(d<bd&&equalFoes(e,x)){bd=d;e.prey=x.id}}
 }
 const f=e.prey!=null?findEnt(e.prey):null;if(!f||f.foeId!=null){e.prey=null;return false}
 const d=Math.hypot(f.x-e.x,f.y-e.y);
 if(d<110){e.prey=null;if(Math.random()<.5)startDuel(e,f);return false}
 e.ang=Math.atan2(f.y-e.y,f.x-e.x);e.wanderAng=e.ang;e.cult=false;moveEnemy(e,Math.cos(e.ang)*e.s*.75*dt,Math.sin(e.ang)*e.s*.75*dt);return true;
}
function warTick(dt){
 const s=arenaState;if(!s)return;s.warT=(s.warT||0)+dt;s.chalT=(s.chalT||0)+dt;s.recT=(s.recT||0)+dt;s.sectT=(s.sectT||0)+dt;if(s.sectT>=8){s.sectT=0;sectTick()}s.zoneT=(s.zoneT==null?99:s.zoneT)+dt;if(s.zoneT>=1.5){s.zoneT=0;zoneTick()}s.shopT=(s.shopT||0)+dt;if(s.shopT>=20){s.shopT=0;mobShopRoll()}
 if(s.recT>=8){s.recT=0;recruitTick()}
 if(s.warT>=5){s.warT=0;skirmishRoll()}
 if(s.chalT>=30){s.chalT=0;challengeRoll()}
}

/* ---- лут осколков: всё, что получают за убийство, падает на землю; подобрать может игрок или любой противник ---- */
function dropLoot(x,y,k,v){
 const s=arenaState;v=Math.floor(v);if(!s||v<=0)return;s.loot=s.loot||[];
 const near=s.loot.find(q=>q.k===k&&Math.hypot(q.x-x,q.y-y)<60);
 if(near){near.v+=v;return}
 if(s.loot.length>=300)s.loot.shift();
 s.loot.push({x:x+rnd(-14,14),y:y+rnd(-14,14),k,v});
}
/* что падает с убитого: награда по его культивации + всё, что он сам успел накопить */
function dropVictimLoot(v){
 gearDeathDrop(v);
 const cols=v.columns||0,stage2=cols>0||v.core>0,rw=v.core>0?10:(stage2?cols:Math.floor(v.stars||0));
 if(stage2)dropLoot(v.x,v.y,2,rw);else dropLoot(v.x,v.y,1,rw);
 if(v.sh1>0){dropLoot(v.x,v.y,1,v.sh1);v.sh1=0}if(v.sh2>0){dropLoot(v.x,v.y,2,v.sh2);v.sh2=0}
 return{k:stage2?2:1,v:rw};
}
function lootPickups(dt){
 const s=arenaState;if(!s||!s.loot||!s.loot.length)return;s.lootT=(s.lootT||0)+dt;if(s.lootT<.25)return;s.lootT=0;
 for(const e of s.enemies.concat(aliveBosses(s))){
  if(e.hp<=0||!((e.stars||0)>0))continue;
  for(let i=s.loot.length-1;i>=0;i--){const q=s.loot[i];if(Math.hypot(q.x-e.x,q.y-e.y)<46){if(q.k===3){if(gearUseful(e,q.item)){entEquip(e,q.item);s.loot.splice(i,1)}}else{if(q.k===2)e.sh2=(e.sh2||0)+q.v;else e.sh1=(e.sh1||0)+q.v;s.loot.splice(i,1)}}}
 }
}
function nearestLoot(e,r){const s=arenaState;let best=null,bd=r;for(const q of (s.loot||[])){if(q.k===3&&!gearUseful(e,q.item))continue;const d=Math.hypot(q.x-e.x,q.y-e.y);if(d<bd){bd=d;best=q}}return best}
function drawLoot(time){
 const s=arenaState;if(!s||!s.loot)return;const W=aw/devicePixelRatio,H=ah/devicePixelRatio;
 for(const q of s.loot){const p=worldToScreen(q.x,q.y);if(p.x<-40||p.x>W+40||p.y<-40||p.y>H+40)continue;
  if(q.k===3){const bob=Math.sin(time*3+q.x)*2;ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y+bob,18,'#7fe0ff',.5);ax.globalCompositeOperation='source-over';ax.font='20px sans-serif';ax.textAlign='center';ax.fillText((GEAR[q.item]||{icon:'?'}).icon,p.x,p.y+7+bob);continue}
  const col=q.k===2?'#c9a8ff':'#ffd85b',bob=Math.sin(time*3+q.x)*2;
  ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y+bob,16+Math.min(14,Math.sqrt(q.v)),col,.55);ax.globalCompositeOperation='source-over';
  ax.fillStyle=col;ax.beginPath();ax.moveTo(p.x,p.y-8+bob);ax.lineTo(p.x+5,p.y+bob);ax.lineTo(p.x,p.y+8+bob);ax.lineTo(p.x-5,p.y+bob);ax.closePath();ax.fill();
  outText(ax,fmt(q.v),p.x,p.y-12+bob,col,10)}
}

/* ---- армии боссов: босс держит под контролем мобов (e.lord = номер босса, e.team — то же для боевых проверок) ---- */
function armyCap(b){return 6+4*(b.index||1)}
function armyOf(idx){return arenaState.enemies.filter(m=>m.hp>0&&m.lord===idx)}
function recruitTick(){
 const s=arenaState,pl=m=>Math.hypot(m.x-s.px,m.y-s.py);
 for(const b of aliveBosses(s)){
  let n=armyOf(b.index).length;if(n>=armyCap(b))continue;const h=b.home||b;
  const cand=s.enemies.filter(m=>m.hp>0&&(m.stars||0)>0&&!m.lord&&!m.sect&&m.foeId==null&&!(m.hostile&&pl(m)<700)&&Math.hypot(m.x-h.x,m.y-h.y)<1600)
   .sort((a,c)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(c.x-h.x,c.y-h.y));
  for(const m of cand){if(n>=armyCap(b))break;m.lord=m.team=b.index;m.zoneBound=true;n++}
 }
}
/* босс пал: его солдаты освобождаются; если его убил другой босс — забирает их себе (в пределах своего лимита) */
function releaseArmy(idx,taker){
 const s=arenaState;let room=taker?armyCap(taker)-armyOf(taker.index).length:0;
 for(const m of armyOf(idx)){
  if(taker&&room>0){m.lord=m.team=taker.index;room--;m.foeId=null}
  else{m.lord=null;m.team=null}
 }
}
