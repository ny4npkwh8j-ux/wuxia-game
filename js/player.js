'use strict';
/* под оцепенением от босса действовать нельзя */
function stunBlock(){const s=arenaState;if(s&&s.stun>0){toast('Оцепенён ещё '+s.stun.toFixed(1)+' с');return true}return false}
/* сколько «силы» удара поглощает цель, пока её пробивают: здоровье + щиты, умноженные на стойкость (до деления урона) */
function entStopPower(e){return Math.max(1,((e.hp||0)+(e.shield>0?e.shield:0)+(e.qiShieldOn&&e.qi>0?e.qi/QI_SHIELD_RATIO:0))*entToughness(e))}
function activateQiStrike(t,held){
 interruptArenaMeditation();const s=arenaState;if(!s||!t||(t.type!=='qiSingle'&&t.type!=='qiArea'))return;if(stunBlock())return;
 if(t.type==='qiArea'&&s.cdArea>0)return toast('Удар по площади перезаряжается: '+s.cdArea.toFixed(1)+' с');
 const f=chargeFactor(held),cost=Math.max(1,Math.round(techCost(t)*f));if(save.qi<cost)return toast('Недостаточно Ци. Нужно '+cost);
 save.qi-=cost;if(t.type==='qiArea')s.cdArea=AREA_CD.qiArea;s.qiCast=QD;s.attackAnim=.36;s.punchDur=.36;s.punchSide=Math.random()<.5?1:0;s.aimT=t.type==='qiSingle'?.6:0;
 const total=techDamage(t)*f,targets=[],bl=aliveBosses(s);
 if(t.type==='qiSingle'){
  const range=300,cone=Math.PI/7;
  s.qiEffects.push({type:'single',x:s.px,y:s.py,ang:s.shootAng,life:0,duration:QD,range,cone});
  for(const e of s.enemies){if(e.hp<=0||isMate(e))continue;const dx=e.x-s.px,dy=e.y-s.py;if(Math.hypot(dx,dy)<=range&&Math.abs(angDiff(Math.atan2(dy,dx),s.shootAng))<=cone)targets.push(e)}
  for(const b of bl){const dx=b.x-s.px,dy=b.y-s.py;if(Math.hypot(dx,dy)<=range&&Math.abs(angDiff(Math.atan2(dy,dx),s.shootAng))<=cone)targets.push(b)}
  for(let i=0;i<18;i++){const aa=s.shootAng+rnd(-cone,cone)*.9,sp=rnd(280,560);addPart({k:'spark',x:s.px+Math.cos(aa)*30,y:s.py+Math.sin(aa)*30,vx:Math.cos(aa)*sp,vy:Math.sin(aa)*sp,t:0,max:rnd(.25,.5),size:rnd(1.6,3.2),col:'#ffe27a',drag:2.6})}
  shake(4);
 }else{
  const r=600;s.qiEffects.push({type:'area',x:s.px,y:s.py,life:0,duration:.5,radius:r});
  for(const e of s.enemies){if(e.hp>0&&!isMate(e)&&Math.hypot(e.x-s.px,e.y-s.py)<=r)targets.push(e)}
  for(const b of bl)if(Math.hypot(b.x-s.px,b.y-s.py)<=r)targets.push(b);
  for(let i=0;i<34;i++){const aa=rnd(0,TAU),sp=rnd(200,620);addPart({k:'spark',x:s.px,y:s.py,vx:Math.cos(aa)*sp,vy:Math.sin(aa)*sp,t:0,max:rnd(.3,.7),size:rnd(1.6,3.4),col:'#fff0a0',drag:2.2})}
  shake(7);
 }
 const piercing=(list,total)=>{
  list.sort((a,b)=>Math.hypot(a.x-s.px,a.y-s.py)-Math.hypot(b.x-s.px,b.y-s.py));
  let energy=total,hit=0;
  for(const e of list){if(energy<=1)break;hit++;const stop=entStopPower(e);if(damageEnemy(e,energy))killReward(e);energy-=stop}
  return hit;
 };
 if(t.type==='qiSingle'){
  /* как пуля: у удара есть запас силы; первая цель получает его целиком, а каждая цель на пути «съедает» часть
     (столько, сколько нужно, чтобы её пробить: здоровье + щиты с учётом стойкости). Слабых удар пробивает насквозь, сильная цель его останавливает. */
  targets.sort((a,b)=>Math.hypot(a.x-s.px,a.y-s.py)-Math.hypot(b.x-s.px,b.y-s.py));
  let energy=total,hit=0;
  for(const e of targets){
   if(energy<=1)break;hit++;const stop=entStopPower(e),dmg=energy;
   if(damageEnemy(e,dmg))killReward(e);energy-=stop;
  }
  persist();toast('Одиночный Удар Ци: '+Math.round(f*100)+'% силы · '+fmt(total)+' урона первой цели · пробито целей: '+hit+' из '+targets.length);return;
 }
 /* волна по площади идёт от игрока наружу: ближние цели получают весь удар, каждая поглощает часть, до дальних доходит остаток */
 const hitA=piercing(targets,total);
 persist();
 toast('Удар Ци по площади: '+Math.round(f*100)+'% силы · '+fmt(total)+' урона ближней цели · пробито целей: '+hitA+' из '+targets.length);
}
function activateShield(t){
 interruptArenaMeditation();const s=arenaState;if(!s||!t)return;if(stunBlock())return;
 if(s.shield>0)return toast('Щит уже активен.');const cost=techCost(t);if(save.qi<cost)return toast('Недостаточно Ци. Нужно '+cost);
 save.qi-=cost;s.shieldMax=techShieldMax(t);s.shield=s.shieldMax;s.shieldFlash=1;s.qiEffects.push({type:'ring',x:s.px,y:s.py,life:0,duration:.5,radius:70,col:'#63e9ff'});burst(s.px,s.py,14,'#63e9ff',190,.5,2.6);
 toast('Защитный покров: '+fmt(s.shieldMax)+' прочности');
}
function startDash(t){
 const s=arenaState;if(!s||!t||s.dashCd>0||s.dashTime>0)return;if(stunBlock())return;interruptArenaMeditation();const cost=techCost(t);
 if(save.qi<cost)return toast('Недостаточно Ци. Нужно '+cost);
 const m=Math.hypot(s.dx,s.dy);let dx,dy;if(m>.08){dx=s.dx/m;dy=s.dy/m}else{dx=Math.cos(s.facing);dy=Math.sin(s.facing)}
 const n=t.nodes.length,dist=dashDist(n),cd=dashCdOf(n);s.dashDuration=.18;s.dashSpeed=dist/.18;s.lastMoveX=dx;s.lastMoveY=dy;s.facing=Math.atan2(dy,dx);save.qi-=cost;s.dashTime=s.dashDuration;s.invuln=.4;s.dashCd=cd;s.dashCdMax=cd;s.ghostAcc=1;shake(2);persist();
}
function beginQiCharge(type){const s=arenaState;if(!s)return;if(type==='qiArea'&&s.cdArea>0)return toast('Удар по площади перезаряжается: '+s.cdArea.toFixed(1)+' с');s.qiCharge={type,start:performance.now()}}
function endQiCharge(type,t){const s=arenaState;if(!s)return;let held=0;if(s.qiCharge&&s.qiCharge.type===type)held=(performance.now()-s.qiCharge.start)/1000;s.qiCharge=null;activateQiStrike(t,held)}
function cancelQiCharge(type){const s=arenaState;if(s&&s.qiCharge&&s.qiCharge.type===type)s.qiCharge=null}
function toggleQiShield(){
 const s=arenaState;if(!s)return;if(stunBlock())return;interruptArenaMeditation();
 if(s.qiShieldOn){s.qiShieldOn=false;return toast('Личный щит выключен.')}
 if(save.qi<1)return toast('Нет Ци для личного щита.');
 s.qiShieldOn=true;s.qiShieldFlash=1;toast('Личный щит включён: 1 урона за 0,5 Ци.');
}
function beginHeal(t){const s=arenaState;if(!s||s.heal||s.channel)return;if(stunBlock())return;interruptArenaMeditation();s.heal={tech:t,frac:0}}
function endHeal(){const s=arenaState;if(!s)return;s.heal=null}
function updateHeal(dt){
 const s=arenaState;if(!s||!s.heal)return;
 if(s.hp>=s.maxHp)return;
 const rate=healRate(s.heal.tech);
 const gapQi=(s.maxHp-s.hp)*3-(s.heal.frac||0);
 let spend=Math.min(rate*dt,save.qi,Math.max(0,gapQi));
 if(spend<=0)return;
 save.qi-=spend;s.heal.frac=(s.heal.frac||0)+spend;
 const gained=Math.floor(s.heal.frac/3);
 if(gained>0){s.heal.frac-=gained*3;s.hp=Math.min(s.maxHp,s.hp+gained);floatText(s.px,s.py-38,'+'+gained,'#8dffb8',14);burst(s.px,s.py,3,'#8dffb8',80,.4,2.2)}
}
function applyStun(t){
 const s=arenaState,r=500;
 s.qiEffects.push({type:'stun',x:s.px,y:s.py,life:0,duration:.95,radius:r});shake(8);
 const list=[];for(const e of s.enemies)if(e.hp>0&&!isMate(e)&&Math.hypot(e.x-s.px,e.y-s.py)<=r)list.push(e);
 for(const b of aliveBosses(s))if(Math.hypot(b.x-s.px,b.y-s.py)<=r)list.push(b);
 const S=myMult(t);let stunned=0;
 for(const e of list){
  const dead=damageEnemy(e,10);if(dead){killReward(e);continue}
  const R=entMult(e),dur=S>0?stunMaxDur(t.nodes.length)*S/(S+R):0;
  if(dur>.05){e.stun=Math.max(e.stun||0,dur);stunned++;burst(e.x,e.y,8,'#c9a8ff',120,.6,2.6)}
 }
 persist();toast('Оцепенение: оглушено '+stunned+' из '+list.length);
}
function beginChannel(t){
 const s=arenaState;if(!s||!t||s.channel)return;if(arenaMeditation.active)return;if(stunBlock())return;if(s.cdStun>0)return toast('Оцепенение перезаряжается: '+s.cdStun.toFixed(1)+' с');interruptArenaMeditation();
 const cost=techCost(t);if(save.qi<cost)return toast('Недостаточно Ци. Нужно '+cost);
 s.channel={t:0,dur:castTime(t.cast||5),tech:t};
}
function endChannel(){const s=arenaState;if(!s||!s.channel)return;s.channel=null;toast('Оцепенение прервано');burst(s.px,s.py,8,'#c58cff',130,.4,2.4)}
function takeDamage(amount,kind){
 const s=arenaState;if(s.invuln>0)return;interruptArenaMeditation();amount/=myToughness();if(kind==='melee')amount*=1-armorCut();if(s.buffGuard>0)amount*=.75;
 if(s.soulOut&&typeof soulHit==='function'){soulHit(amount);return}/* душа вне тела: урон идёт в Ци души */
 if(s.shield>0){const ab=Math.min(s.shield,amount);s.shield-=ab;amount-=ab;if(ab>0){floatText(s.px,s.py-32,'-'+fmt(ab),'#63e9ff',13);s.shieldFlash=1;burst(s.px,s.py,10,'#63e9ff',170,.4,2.4)}}
 if(amount>0&&s.qiShieldOn&&save.qi>0){
  const ab=Math.min(amount,save.qi/QI_SHIELD_RATIO);save.qi=Math.max(0,save.qi-ab*QI_SHIELD_RATIO);amount-=ab;
  if(ab>0){floatText(s.px,s.py-46,'-'+fmt(ab),'#c58cff',13);s.qiShieldFlash=1;burst(s.px,s.py,10,'#c58cff',170,.4,2.4)}
  if(save.qi<=0){save.qi=0;s.qiShieldOn=false;toast('Личный щит погас: Ци закончилась.')}
 }
 if(amount>0){s.hp=Math.max(0,s.hp-amount);floatText(s.px,s.py-34,'-'+fmt(Math.max(1,amount)),'#ff6a6a',16);s.hurt=1;s.hitFlash=1;shake(Math.min(11,4+amount*.08));burst(s.px,s.py,9,'#ff5a5a',200,.45,2.6)}
 s.invuln=.22;
}
function movePlayer(dx,dy){let nx=Math.max(70,Math.min(arenaState.world-70,arenaState.px+dx)),ny=Math.max(70,Math.min(arenaState.world-70,arenaState.py+dy));if(!blocked(nx,arenaState.py,22,'player'))arenaState.px=nx;if(!blocked(arenaState.px,ny,22,'player'))arenaState.py=ny}
/* ---- damage ---- */
function arenaAttack(){
 const s=arenaState;if(!s)return;if(stunBlock()||s.punchCd>0)return;interruptArenaMeditation();s.punchCd=.32;
 s.attackAnim=.32;s.punchDur=.32;s.aimT=.55;s.punchSide=Math.random()<.5?1:0;s.slashes.push({x:s.px,y:s.py,ang:s.shootAng,t:0,max:.24,side:s.punchSide});
 let hits=0;
 const bl=s.bladeT>0,rng=(bl?TECH2.blade.range:48)+weaponRange(),cn=bl?TECH2.blade.cone:1.35,dm=(bl?(gearWeapon()?playerStr()+(s.bladeDmg||0):Math.max(playerStr(),s.bladeDmg||0)):playerStr())+weaponDmg();
 if(bl){s.qiEffects.push({type:'single',x:s.px,y:s.py,ang:s.shootAng,life:0,duration:.25,range:rng,cone:cn*.5})}
 for(const e of s.enemies.concat(aliveBosses(s))){if(e.hp<=0||isMate(e))continue;const dx=e.x-s.px,dy=e.y-s.py,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);if(d<=rng&&Math.abs(angDiff(a,s.shootAng))<=cn){hits++;if(damageEnemy(e,dm,undefined,true))killReward(e)}}
 if(hits){shake(3);persist()}
}
/* player atlas: 8 columns (label order) x 3 rows (idle, left punch, right punch) */
const PL={FW:304,FH:222,HX:142,HY:44,S:.31,DY:19,COL:[2,1,0,7,6,5,4,3]};
function plFrame(c,img,col,row,x,y,al){c.globalAlpha=al;c.drawImage(img,col*PL.FW,row*PL.FH,PL.FW,PL.FH,x-PL.HX*PL.S,y-PL.HY*PL.S,PL.FW*PL.S,PL.FH*PL.S)}
function drawGhost(g){
 const o=SPR.player,p=worldToScreen(g.x,g.y),k=1-g.t/g.max;if(!o.ok)return;
 const im=tinted('player','#7fd0ff')||o.img,col=PL.COL[sectOf(g.ang)];
 ax.globalCompositeOperation='lighter';plFrame(ax,im,col,0,p.x,p.y-PL.DY,.42*k);ax.globalAlpha=1;ax.globalCompositeOperation='source-over';
}
function drawPlayer(time){
 const s=arenaState,p=worldToScreen(s.px,s.py),o=SPR.player,dashing=s.dashTime>0,still=Math.hypot(s.dx,s.dy)<=.08,med=arenaMeditation.active&&still&&!dashing,ch=s.channel;
 const ang=s.aimT>0?s.shootAng:s.facing,col=PL.COL[sectOf(ang)],cq=s.qiCast>0?1-s.qiCast/QD:-1,qr=save.maxQi?save.qi/save.maxQi:0;
 const healing=!!s.heal,aura=healing?'#8dffb8':med?'#63e9ff':dashing?'#9fd8ff':qr>.7?'#55ddff':null;
 if(aura){ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y+4,(healing?50:med?60:44)*(1+.08*Math.sin(time*5)),aura,healing?.7:med?.75:dashing?.6:.22);ax.globalCompositeOperation='source-over'}
 ax.fillStyle='rgba(0,0,0,.3)';ax.beginPath();ax.ellipse(p.x+1,p.y+PL.DY+5,19,7,0,0,TAU);ax.fill();
 if(o.ok){
  const mv=s.mv,bob=-Math.abs(Math.sin(s.wp))*2.4*mv,sway=Math.sin(s.wp)*.04*mv,kk=s.attackAnim>0?1-s.attackAnim/(s.punchDur||.32):-1;
  const w=kk<0?0:(kk<.22?ease(kk/.22):kk<.55?1:1-ease((kk-.55)/.45)),lunge=5.5*w,hx=p.x+Math.cos(ang)*lunge,hy=p.y-PL.DY+bob+Math.sin(ang)*lunge*.6,row=s.punchSide?2:1;
  ax.save();ax.translate(hx,p.y+PL.DY);ax.rotate(sway);ax.translate(-hx,-(p.y+PL.DY));
  if(med){ax.translate(hx,hy+30);ax.scale(.97,.95);ax.translate(-hx,-(hy+30))}
  if(s.qiShieldOn){const yt=tinted('player','#ffd23a');if(yt){ax.save();ax.globalCompositeOperation='lighter';ax.translate(p.x,p.y);ax.scale(1.13,1.1);ax.translate(-p.x,-p.y);const ga=Math.min(1,.5+.2*Math.sin(time*4)+.35*(s.qiShieldFlash||0));if(w<.98)plFrame(ax,yt,col,0,hx,hy,ga*(dashing?.9:1-w));if(w>0)plFrame(ax,yt,col,row,hx,hy,ga*w);ax.restore()}}
  if(w<.98)plFrame(ax,o.img,col,0,hx,hy,dashing?.9:1-w);
  if(w>0)plFrame(ax,o.img,col,row,hx,hy,w);
  if(s.hitFlash>0){const wt=tinted('player','#ffffff');if(wt){plFrame(ax,wt,col,0,hx,hy,Math.min(.7,s.hitFlash*.8));if(w>0)plFrame(ax,wt,col,row,hx,hy,Math.min(.7,s.hitFlash*.8)*w)}}
  ax.globalAlpha=1;ax.restore();
  if(cq>=0){const bx=p.x+Math.cos(ang)*FIST,by=p.y-PL.DY+Math.sin(ang)*FIST*.8,rb=22*ease(Math.min(1,cq/.12))*(1-ease((cq-.14)/.2));if(rb>1){ax.globalCompositeOperation='lighter';glow(ax,bx,by,rb*1.8,'#ffd85b',.85);starSprite(ax,bx,by,rb,time*4,.95);glow(ax,bx,by,rb*.6,'#ffffff',.9);ax.globalCompositeOperation='source-over'}}
 }else drawFighter(ax,{x:p.x,y:p.y,ang,pal:PAL.player,wp:s.wp,mv:s.mv,t:time,punch:s.attackAnim>0?1-s.attackAnim/.32:-1,side:s.punchSide,flash:s.hitFlash});
 if(s.stun>0){ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y,32,'#8fb8ff',.45);ax.globalCompositeOperation='source-over';ax.fillStyle='#fff3a0';for(let i=0;i<3;i++){const a=time*3.4+i*TAU/3;star4(ax,p.x+Math.cos(a)*14,p.y-34+Math.sin(a)*4,4.4);ax.fill()}}
 if(s.shield>0)shieldBubble(ax,p.x,p.y+2,42+2*Math.sin(time*5),Math.min(1,s.shield/Math.max(1,s.shieldMax||20)),s.shieldFlash||0,time);
 if(ch){const k=ch.t/ch.dur,R=94-58*k;ax.save();ax.translate(p.x,p.y);ax.globalCompositeOperation='lighter';
  glow(ax,Math.cos(ang)*26,Math.sin(ang)*16-4,8+22*k,'#c58cff',.9);glow(ax,Math.cos(ang)*26,Math.sin(ang)*16-4,4+9*k,'#ffffff',.9);
  ax.rotate(time*2.2);ax.strokeStyle='rgba(197,140,255,'+(.35+.4*k)+')';ax.lineWidth=2;ax.setLineDash([9,7]);ax.beginPath();ax.arc(0,0,R,0,TAU);ax.stroke();ax.setLineDash([]);
  for(let i=0;i<8;i++){const a=i*TAU/8;ax.fillStyle='rgba(226,196,255,'+(.5+.4*k)+')';ax.save();ax.rotate(a);ax.translate(R,0);ax.rotate(Math.PI/4);ax.fillRect(-2.6,-2.6,5.2,5.2);ax.restore()}
  ax.rotate(-time*4.4);ax.strokeStyle='rgba(255,255,255,'+(.25+.45*k)+')';ax.beginPath();ax.arc(0,0,R*.62,0,TAU*k);ax.stroke();ax.restore()}
}
