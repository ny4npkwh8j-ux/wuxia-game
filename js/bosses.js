'use strict';
/* версия записи босса и его полный набор техник (все типы, что бывают у игрока) */
const BOSS_V=3;
const BOSS_KIT=['shield','dodge','qiSingle','qiArea','qiShield','stun','heal'];
function newBoss(index=1){
 index=Math.max(1,Math.min(MAX_BOSS_INDEX,index));
 const cols=index-1,tier=index>=2?2:1,b={id:nid(),x:5000,y:3400,r:tier===1?34:38,s:tier===1?72:78,ang:0,hit:0,isBoss:true,tier,index,columns:cols,invuln:0,seenT:0,wanderT:0,mv:0,wp:0};
 /* 100 звёзд + колонны: здоровье, сила, Ци и сила техник — по тем же формулам, что у игрока */
 applyKit(b,{stars:100,techs:BOSS_KIT.slice()});b.v=BOSS_V;
 return b;
}
function onBossDefeated(){
 const s=arenaState,b=s&&s.boss;if(!b)return;
 const finishedIndex=b.index||1;
 if(BOSS_SCROLL[finishedIndex])dropBossScroll(finishedIndex);
 if(finishedIndex>=MAX_BOSS_INDEX){rerollLiveMobs(finishedIndex);s.boss=newBoss(MAX_BOSS_INDEX);toast('Босс '+finishedIndex+' повержен. Мобы стали ещё сильнее.');persist();return}
 const next=finishedIndex+1;s.bossIndex=next;s.boss=newBoss(next);rerollLiveMobs(next);
 const cw=(next-1)===1?'а':((next-1)<5?'ы':'');toast('Босс '+finishedIndex+' повержен. Следующий — Босс '+next+' · '+(next-1)+' колонн'+cw);persist();
}
function dropBossScroll(tier){
 const id=BOSS_SCROLL[tier];if(!id)return;const b=arenaState.boss;
 addBlueprint({type:id,n:PATH_CAP,tier:'high',src:'boss'});
 showBanner('📜 Выпал чертёж техники\n«'+SCROLLS[id].name+'» · высокое качество\nКультивация → Свитки');burst(b.x,b.y,30,'#c58cff',280,1.1,3.2);floatText(b.x,b.y-100,'📜 '+SCROLLS[id].name,'#e6d0ff',17);
}
/* ---- stun (hold to cast) ---- */
/* ---- boss ---- */
function bossLoop(dt){
 const s=arenaState,b=s.boss;if(!b||b.hp<=0)return;
 b.invuln=Math.max(0,(b.invuln||0)-dt);b.hit=Math.max(0,(b.hit||0)-dt);entTick(b,dt);
 if(b.stun>0){b.stun-=dt;b.mv=0;b.wind=null;return}
 const dx=s.px-b.x,dy=s.py-b.y,d=Math.hypot(dx,dy)||1,seePlayer=d<=VISION_RADIUS;
 if(seePlayer){b.seenT=TARGET_MEMORY_TIME;b.lastX=s.px;b.lastY=s.py}else b.seenT=Math.max(0,(b.seenT||0)-dt);
 const engaged=seePlayer||b.seenT>0;
 if(!engaged){
  b.wind=null;
  b.wanderT=(b.wanderT||0)-dt;if(b.wanderT<=0){b.wanderAng=Math.random()*TAU;b.wanderT=2+Math.random()*3}
  b.ang=b.wanderAng;
  const ox=b.x,oy=b.y;moveBoss(b,Math.cos(b.ang)*b.s*.4*dt,Math.sin(b.ang)*b.s*.4*dt);
  const md=Math.hypot(b.x-ox,b.y-oy);b.mv=(b.mv||0)+((md>.05?1:0)-(b.mv||0))*Math.min(1,dt*8);b.wp=(b.wp||0)+md*.09;
  /* вне боя босс лечится техникой «Лечение»: 3 Ци = 1 здоровья, скорость как у игрока */
  if(b.hp<b.maxHp&&b.qi>0){const sp=Math.min(healRate({nodes:{length:PATH_CAP}})*dt,b.qi);b.qi-=sp;b.healAcc=(b.healAcc||0)+sp;const g=Math.floor(b.healAcc/3);if(g>0){b.healAcc-=g*3;b.hp=Math.min(b.maxHp,b.hp+g)}}
  return;
 }
 const tgx=seePlayer?dx:b.lastX-b.x,tgy=seePlayer?dy:b.lastY-b.y;
 b.ang=b.wind?b.wind.ang:Math.atan2(tgy,tgx);
 const busy=seePlayer&&mobAI(b,dt,d);
 if(busy)b.mv=0;
 else if(d>55){const ox=b.x,oy=b.y;moveBoss(b,Math.cos(b.ang)*b.s*dt,Math.sin(b.ang)*b.s*dt);const md=Math.hypot(b.x-ox,b.y-oy);b.mv+=((md>.05?1:0)-(b.mv||0))*Math.min(1,dt*8);b.wp=(b.wp||0)+md*.09}
 else b.mv=0;
 /* физический удар — собственная сила босса по формуле игрока (10 + 0,9 за звезду) */
 if(d<58&&b.mcd<=0){takeDamage(entMelee(b));b.mcd=.65}
}
function moveBoss(b,dx,dy){let nx=Math.max(100,Math.min(9900,b.x+dx)),ny=Math.max(100,Math.min(9900,b.y+dy));if(!blocked(nx,b.y,b.r,b.id))b.x=nx;if(!blocked(b.x,ny,b.r,b.id))b.y=ny}
/* boss portraits (frame rects inside the boss atlas) */
const BOSSP={master:[0,0,122,144],elite:[142,0,112,146]},BOSS_S=.86;
function bossFrame(c,img,m,x,y,sc,al){const w=m[2]*sc,h=m[3]*sc;c.globalAlpha=al;c.drawImage(img,m[0],m[1],m[2],m[3],x-w/2,y-h/2,w,h)}
function drawBoss(W,H,time){
 const s=arenaState,b=s.boss;if(!b||b.hp<=0)return;const p=worldToScreen(b.x,b.y);if(p.x<-150||p.x>W+150||p.y<-150||p.y>H+150)return;
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
 outText(ax,(t2?'ПРАКТИК':'БОСС')+' · 100 ★'+(b.columns?' · '+b.columns+' КОЛОННА':''),p.x,p.y-80,'#fff',11);
}
