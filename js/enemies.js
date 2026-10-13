'use strict';
/* ===== enemies / bosses use the same power formula ===== */
/* ===== mobs: stars, techniques, AI, drops ===== */
function maxMobStars(bossIndex){
 const target=.85*bossMult({columns:Math.max(0,bossIndex-1)});
 let lo=1,hi=100,ans=1;
 while(lo<=hi){const mid=(lo+hi)>>1;if(mobMult(mid)<=target){ans=mid;lo=mid+1}else hi=mid-1}
 return ans;
}
function mobTierRange(bossIndex){const cap=maxMobStars(bossIndex);return{a:Math.max(3,Math.round(cap*.3)),b:cap}}
const MOB_W={shield:40,dodge:22,qiSingle:18,qiShield:12,qiArea:6};
function rollKit(bossIndex){
 const T=mobTierRange(bossIndex),r=Math.random();let stars=0,cnt=0;
 if(r<.10){stars=Math.max(8,1+Math.floor(Math.random()*T.b));cnt=1+Math.floor(Math.random()*3)}
 else if(r<.10+1/3){stars=Math.max(3,1+Math.floor(Math.random()*T.a));cnt=1}
 if(!stars)return{stars:0,techs:[]};
 let techs=[];
 if(stars>=60){techs=['shield','dodge','qiSingle','qiArea'];if(Math.random()<.4)techs.push('qiShield')}
 else{
  const pool=Object.keys(MOB_W).filter(t=>MOB_MIN[t]<=stars);
  for(let i=0;i<cnt&&pool.length;i++){const tot=pool.reduce((a,t)=>a+MOB_W[t],0);let x=Math.random()*tot,pick=pool[0];for(const t of pool){x-=MOB_W[t];if(x<=0){pick=t;break}}techs.push(pick);pool.splice(pool.indexOf(pick),1)}
 }
 return{stars,techs};
}
function applyKit(e,kit){
 const mh=100+4*kit.stars,mq=100+10*kit.stars;
 Object.assign(e,{v:3,stars:kit.stars,techs:kit.techs,technique:kit.techs[0]||null,hp:mh,maxHp:mh,qi:mq,maxQi:mq,shield:0,shieldMax:0,qiShieldOn:kit.techs.includes('qiShield'),qsFlash:0,wind:null,cd:{atk:2+Math.random()*3,sh:0,dash:2+Math.random()*3}});
 return e;
}
function makeMob(x,y,bossIndex){return applyKit({id:nid(),x,y,r:20,s:(45+Math.random()*25),ang:0,hit:0,seenT:0,wanderT:0},rollKit(bossIndex))}
function rerollLiveMobs(bossIndex){
 const s=arenaState;if(!s)return;
 for(const e of s.enemies){if(e.hp<=0)continue;const k=rollKit(bossIndex);applyKit(e,k);e.s=(45+Math.random()*25)*(1+k.stars/500)}
}
function damageEnemy(e,damage){
 if(e.hp<=0)return false;let dmg=damage;
 if(e.shield>0){const a=Math.min(e.shield,dmg);e.shield-=a;dmg-=a}
 if(dmg>0&&e.qiShieldOn&&e.qi>0){const a=Math.min(dmg,e.qi/QI_SHIELD_RATIO);e.qi=Math.max(0,e.qi-a*QI_SHIELD_RATIO);dmg-=a;e.qsFlash=1;if(e.qi<=0)e.qiShieldOn=false}
 if(dmg>0)e.hp=Math.max(0,e.hp-dmg);e.hit=.25;
 if(arenaState){floatText(e.x,e.y-(e.isBoss?66:30),fmt(Math.max(1,damage)),'#ffffff',damage>=30?18:14);burst(e.x,e.y,e.isBoss?7:5,'#ffe9a0',170,.35,2.2);if(e.hp<=0)spawnDeath(e)}
 return e.hp<=0;
}
/* mob AI: returns true while the mob is busy (winding up) and must not walk */
function mobAI(e,dt,d){
 const s=arenaState,tc=e.techs;if(!tc||!tc.length)return false;
 const cd=e.cd||(e.cd={atk:2,sh:0,dash:2});cd.atk-=dt;cd.sh-=dt;cd.dash-=dt;
 e.qi=Math.min(e.maxQi,e.qi+.5*e.stars/100*dt);e.qsFlash=Math.max(0,(e.qsFlash||0)-dt*3);
 if(e.wind){const w=e.wind;w.t+=dt;if(w.t>=w.dur){mobFire(e,w);e.wind=null}return true}
 const m=mobMult(e.stars),cost=t=>Math.ceil(TECH_COST[t]+.3*e.stars);
 if(tc.includes('shield')&&e.shield<=0&&cd.sh<=0&&d<450&&e.qi>=cost('shield')){e.qi-=cost('shield');e.shieldMax=TECH_BASE.shield*m;e.shield=e.shieldMax;cd.sh=7;burst(e.x,e.y,8,'#63e9ff',150,.4,2.4)}
 if(cd.atk<=0){
  const opts=[];if(tc.includes('qiSingle')&&d<280&&e.qi>=cost('qiSingle'))opts.push('single');if(tc.includes('qiArea')&&d<330&&e.qi>=cost('qiArea'))opts.push('area');
  if(opts.length){const k=opts[Math.floor(Math.random()*opts.length)];e.wind={type:k,t:0,dur:k==='single'?.65:1.1,ang:e.ang};e.qi-=cost(k==='single'?'qiSingle':'qiArea');cd.atk=4+Math.random()*3;return true}
 }
 const dc=Math.ceil(.05*e.maxQi);
 if(tc.includes('dodge')&&cd.dash<=0&&d>240&&d<650&&e.qi>=dc){const dist=Math.min(dashDist(e.stars),d-70);if(dist>40){e.qi-=dc;burst(e.x,e.y,8,'#69ef8b',150,.35,2.6);moveEnemy(e,Math.cos(e.ang)*dist,Math.sin(e.ang)*dist);burst(e.x,e.y,8,'#69ef8b',150,.35,2.6);cd.dash=dashCdOf(e.stars)*2+3}}
 return false;
}
function mobFire(e,w){
 const s=arenaState,dmg=TECH_BASE[w.type==='single'?'qiSingle':'qiArea']*mobMult(e.stars);
 if(w.type==='single'){
  s.qiEffects.push({type:'single',x:e.x,y:e.y,ang:w.ang,life:0,duration:.38,range:300,cone:Math.PI/7,hostile:true});
  const dd=Math.hypot(s.px-e.x,s.py-e.y),ad=Math.atan2(s.py-e.y,s.px-e.x);if(dd<=300&&Math.abs(angDiff(ad,w.ang))<=Math.PI/7)takeDamage(dmg);
 }else{s.qiEffects.push({type:'area',hostile:true,x:e.x,y:e.y,life:0,duration:.5,radius:350});if(Math.hypot(s.px-e.x,s.py-e.y)<=350)takeDamage(dmg)}
 shake(5);
}
function drawMobTelegraphs(time){
 const s=arenaState,W=aw/devicePixelRatio;
 for(const e of s.enemies){
  if(e.hp<=0||!e.wind)continue;const w=e.wind,p=worldToScreen(e.x,e.y),k=Math.min(1,w.t/w.dur);
  if(p.x<-400||p.x>W+400)continue;
  ax.save();ax.translate(p.x,p.y);ax.setLineDash([10,7]);ax.lineDashOffset=-time*40;
  if(w.type==='single'){ax.rotate(w.ang);sector(ax,300,Math.PI/7);ax.fillStyle='rgba(255,50,50,.10)';ax.fill();sector(ax,300*k,Math.PI/7);ax.fillStyle='rgba(255,70,50,'+(.2+.3*k)+')';ax.fill();sector(ax,300,Math.PI/7);ax.strokeStyle='rgba(255,110,90,.9)';ax.lineWidth=2;ax.stroke()}
  else{ax.beginPath();ax.arc(0,0,350,0,TAU);ax.fillStyle='rgba(255,50,50,.08)';ax.fill();ax.beginPath();ax.arc(0,0,350*k,0,TAU);ax.fillStyle='rgba(255,70,50,'+(.18+.25*k)+')';ax.fill();ax.beginPath();ax.arc(0,0,350,0,TAU);ax.strokeStyle='rgba(255,110,90,.9)';ax.lineWidth=2;ax.stroke()}
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
 if(st>0){outText(ax,'★'+st,p.x-2,p.y-46,'#ffd85b',10);const ts=e.techs||[];ts.slice(0,5).forEach((tt,i)=>{ax.fillStyle=MOB_DOT[tt]||'#fff';ax.beginPath();ax.arc(p.x+13+i*6,p.y-50,2.6,0,TAU);ax.fill()})}
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
 if(!arenaState||arenaState.enemies.filter(e=>e.hp>0).length>=50)return;
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
