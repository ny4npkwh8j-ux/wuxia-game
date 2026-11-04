'use strict';
/* ===== демонические звери: временные векторные силуэты (позже заменяются готовыми спрайтами) =====
   Звери занимают место прежних боссов; сила, здоровье и техники — те же, меняется только вид и название.
   Порядок по силе (индекс босса 1…): паук, каменный страж, кровокрыл, лиса, владыка пустоты, печать ада; печати бездны и тьмы — для расширения числа боссов. */
const BEASTS={
 spider:{name:'ПАУК КОШМАРОВ',col:'#8e1a36',dk:'#3a0814',aur:'#ff3a5a'},
 golem:{name:'КАМЕННЫЙ СТРАЖ',col:'#8a6a4a',dk:'#40301f',aur:'#ffa040'},
 bird:{name:'КРОВОКРЫЛ',col:'#701226',dk:'#240810',aur:'#ff4040'},
 fox:{name:'ЛИСА ДЕСЯТИ ХВОСТОВ',col:'#efeaff',dk:'#9a86d8',aur:'#b48aff'},
 void:{name:'ВЛАДЫКА ПУСТОТЫ',col:'#2a1630',dk:'#100810',aur:'#ff3a6a'},
 hell:{name:'ПЕЧАТЬ АДА',col:'#8a1810',dk:'#2a0806',aur:'#ff6a20'},
 abyss:{name:'ПЕЧАТЬ БЕЗДНЫ',col:'#2a2418',dk:'#0e0c08',aur:'#ffc83a'},
 dark:{name:'ПЕЧАТЬ ТЬМЫ',col:'#5a4430',dk:'#201810',aur:'#ffb030'}};
const BEAST_ORDER=['spider','golem','bird','fox','void','hell','abyss','dark'];
function beastKind(i){return BEAST_ORDER[(Math.max(1,i||1)-1)%BEAST_ORDER.length]}
function beastOf(e){return BEASTS[e.beast||beastKind(e.index)]}
function bEll(c,x,y,rx,ry,rot,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,rot||0,0,TAU);c.fill()}
function bLeg(c,x0,y0,x1,y1,w,col){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke()}
/* рисует зверя в локальных координатах, морда смотрит по +x; размер ~ радиус 44 */
function drawBeastShape(c,k,time,wp,mv,flash,wind){
 const B=BEASTS[k],F=flash?'#fff':null,C=F||B.col,D=F||B.dk,A=F||B.aur,sw=Math.sin(wp||0)*mv;
 if(k==='spider'){
  for(let i=0;i<4;i++)for(const sd of[-1,1]){const a=.5+i*.45,ph=Math.sin((wp||0)+i*1.3*sd)*.18*mv;bLeg(c,0,0,Math.cos(a+ph)*sd*0+(i-1.5)*14,sd*(34+ph*20),4,D)}
  bEll(c,-10,0,22,17,0,C);bEll(c,16,0,13,11,0,D);bEll(c,-10,0,9,7,0,A);bEll(c,22,-4,3,3,0,'#fff');bEll(c,22,4,3,3,0,'#fff');
 }else if(k==='golem'){
  bEll(c,0,0,28,26,0,D);for(let i=0;i<7;i++){const a=i*TAU/7;bEll(c,Math.cos(a)*20,Math.sin(a)*18,11,9,a,C)}
  bEll(c,18,0,10,9,0,C);bEll(c,0,0,10,10,0,A);bEll(c,22,-3,2.5,2.5,0,'#ffe0a0');bEll(c,22,3,2.5,2.5,0,'#ffe0a0');
  for(const sd of[-1,1])bEll(c,2+sw*6*sd,sd*30,10,8,0,D);
 }else if(k==='bird'){
  const fl=Math.sin(time*(wind?14:7))*.5;
  for(const sd of[-1,1]){c.save();c.scale(1,sd);c.rotate(fl*.6);c.fillStyle=C;c.beginPath();c.moveTo(4,4);c.quadraticCurveTo(-6,44,-36,52);c.quadraticCurveTo(-22,26,-24,6);c.closePath();c.fill();c.fillStyle=D;c.beginPath();c.moveTo(0,6);c.quadraticCurveTo(-8,30,-24,38);c.lineTo(-14,10);c.fill();c.restore()}
  bEll(c,0,0,20,10,0,D);bEll(c,18,0,8,7,0,C);c.fillStyle='#ffd24a';c.beginPath();c.moveTo(25,-2);c.lineTo(35,0);c.lineTo(25,3);c.fill();bEll(c,20,-3,2,2,0,'#fff');bEll(c,-22,0,10,4,0,C);
 }else if(k==='fox'){
  for(let i=0;i<9;i++){const a=(i-4)*.2+Math.sin(time*2+i)*.06;c.save();c.rotate(Math.PI+a);c.fillStyle=i%2?C:'#d8ccff';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(26,-9,44,0);c.quadraticCurveTo(26,9,0,0);c.fill();bEll(c,40,0,5,3,0,A);c.restore()}
  bEll(c,0,0,22,12,0,C);bEll(c,20,0,10,8,0,C);c.fillStyle=C;for(const sd of[-1,1]){c.beginPath();c.moveTo(20,sd*5);c.lineTo(14,sd*17);c.lineTo(26,sd*8);c.fill()}
  bEll(c,26,-3,2,2,0,A);bEll(c,26,3,2,2,0,A);bEll(c,0,0,5,5,0,A);
 }else if(k==='void'){
  c.fillStyle=C;c.beginPath();c.moveTo(18,0);c.quadraticCurveTo(-4,-30,-40,-18);c.quadraticCurveTo(-26,0,-40,18);c.quadraticCurveTo(-4,30,18,0);c.fill();
  bEll(c,2,0,10,10,0,D);bEll(c,8,0,7,7,0,F||'#f0d8e4');c.strokeStyle=F||'#e8e0ff';c.lineWidth=3;c.beginPath();c.moveTo(4,0);c.quadraticCurveTo(-24,-10+Math.sin(time*3)*5,-48,-4);c.moveTo(4,0);c.quadraticCurveTo(-24,10-Math.sin(time*3)*5,-48,6);c.stroke();
  bEll(c,0,0,26,26,0,'rgba(255,58,106,.12)');bEll(c,12,-2,2,2,0,A);bEll(c,12,2,2,2,0,A);
 }else if(k==='hell'){
  for(let i=0;i<5;i++){const a=Math.sin(time*9+i*2)*.4;c.save();c.translate(-30,0);c.rotate(Math.PI+(i-2)*.3+a*.3);c.fillStyle=i%2?'#ff9a30':'#ff4a1a';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(14,-7,30,0);c.quadraticCurveTo(14,7,0,0);c.fill();c.restore()}
  for(let i=0;i<4;i++){const sd=i%2?1:-1,px=(i<2?16:-14)+Math.sin((wp||0)+(i%3)*2)*8*mv;bLeg(c,px,0,px+5,sd*26,7,D)}
  bEll(c,-4,0,32,16,0,C);bEll(c,28,0,15,12,0,C);c.fillStyle=D;for(const sd of[-1,1]){c.beginPath();c.moveTo(30,sd*7);c.lineTo(24,sd*20);c.lineTo(36,sd*10);c.fill()}
  bEll(c,38,-4,2.5,2.5,0,'#ffe060');bEll(c,38,4,2.5,2.5,0,'#ffe060');for(let i=0;i<6;i++)bEll(c,-26+i*10,Math.sin(i*2)*5,3,2,0,'#ff8a30');
 }else if(k==='abyss'){
  const n=14;for(let i=n;i>=0;i--){const x=-48+i*7,y=Math.sin(time*2.2+i*.55)*10*(1-i/(n*1.6)),r=(6+Math.sin(i/n*Math.PI)*8);bEll(c,x,y,r,r*.9,0,i%2?C:D);if(i%3===0)bEll(c,x,y,3,3,0,A)}
  const hy=Math.sin(time*2.2+n*.55)*6;bEll(c,56,hy,13,9,0,C);c.fillStyle=D;for(const sd of[-1,1]){c.beginPath();c.moveTo(52,hy+sd*5);c.lineTo(40,hy+sd*18);c.lineTo(60,hy+sd*7);c.fill()}
  bEll(c,60,hy-3,2.5,2.5,0,A);bEll(c,60,hy+3,2.5,2.5,0,A);
 }else{ /* dark: бык-великан */
  for(let i=0;i<4;i++){const sd=i%2?1:-1,px=(i<2?18:-18)+Math.sin((wp||0)+(i%3)*2)*6*mv;bLeg(c,px,0,px,sd*30,11,D)}
  bEll(c,-2,0,36,26,0,C);bEll(c,30,0,17,14,0,D);c.strokeStyle=F||'#e8d8a8';c.lineWidth=6;c.lineCap='round';for(const sd of[-1,1]){c.beginPath();c.moveTo(32,sd*10);c.quadraticCurveTo(46,sd*26,60,sd*18);c.stroke()}
  bEll(c,-4,0,13,11,0,A);bEll(c,40,-4,2.5,2.5,0,'#ffe060');bEll(c,40,4,2.5,2.5,0,'#ffe060');
 }
}

/* ===== животные: малые версии боссов-зверей =====
   Простой рост (только звёзды, до ANIMAL_CAP), без колонн/ядра/сект; часть из них — свита босса своего вида (e.escort = номер босса). */
const ANIMAL_CAP=60,ANIMAL_START=24;
function animalStars(idx){return Math.min(ANIMAL_CAP,Math.max(3,Math.round((6+7*bossPidx(idx))*(.6+Math.random()*.8))))}
function makeAnimal(x,y,idx,stars){
 const e=applyKit({id:nid(),x,y,r:18,s:50+Math.random()*25,ang:0,hit:0,seenT:0,wanderT:0,animal:true,beast:beastKind(idx),kin:idx,hunger:100,noSectT:1e12,zoneBound:false},{stars:stars||animalStars(idx),techs:['qiSingle','dodge']});
 return e;
}
function animalSpot(state){for(let t=0;t<30;t++){const x=800+Math.random()*(state.world-1600),y=800+Math.random()*(state.world-1600);if(!(state.obstacles||[]).some(o=>Math.abs(o.x-x)<o.w/2+40&&Math.abs(o.y-y)<o.h/2+40))return{x,y}}return{x:state.world/2,y:state.world/2}}
/* старые и новые сохранения: один раз рассыпаем животных по карте */
function seedAnimals(state){
 if(state.animalsV)return;state.animalsV=1;
 for(let i=0;i<ANIMAL_START;i++){const p=animalSpot(state);state.enemies.push(makeAnimal(p.x,p.y,1+i%BOSS_N))}
}
/* свита: у каждого живого босса рядом держатся несколько зверей его вида */
function escortCap(b){return 2+bossPidx(b.index||1)}
function escortTick(){
 const s=arenaState;if(!s)return;
 for(const m of s.enemies)if(m.expire&&s.t>m.expire&&m.hp>0){m.hp=0;m.removed=true}
 for(const b of aliveBosses(s)){
  const idx=b.index||1,have=s.enemies.filter(m=>m.hp>0&&m.escort===idx).length;if(have>=escortCap(b))continue;
  const h=b.home||b,a=Math.random()*TAU,d=150+Math.random()*250,x=h.x+Math.cos(a)*d,y=h.y+Math.sin(a)*d;
  if(blocked(x,y,24))continue;
  const m=makeAnimal(x,y,idx,Math.round(animalStars(idx)*.8));m.escort=m.team=idx;m.zoneBound=true;s.enemies.push(m);
 }
}
function drawAnimal(e,p,time){
 const k=e.beast||beastKind(e.kin),B=BEASTS[k],mv=e.mv||0,st=e.stars||0;
 ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y,26,B.aur,.25);ax.globalCompositeOperation='source-over';
 ax.fillStyle='rgba(0,0,0,.28)';ax.beginPath();ax.ellipse(p.x+1,p.y+14,15,5,0,0,TAU);ax.fill();
 ax.save();ax.translate(p.x,p.y);ax.rotate(e.ang||0);ax.scale(.5,.5);drawBeastShape(ax,k,time,e.wp||0,mv,0,e.wind);
 if(e.hit>0){ax.globalAlpha=Math.min(.8,e.hit/.18*.8);drawBeastShape(ax,k,time,e.wp||0,mv,1,e.wind);ax.globalAlpha=1}
 ax.restore();
 if(e.stun>0){ax.fillStyle='#fff3a0';for(let i=0;i<3;i++){const a=time*3.4+i*TAU/3;star4(ax,p.x+Math.cos(a)*12,p.y-26+Math.sin(a)*4,4);ax.fill()}}
 if(e.shield>0){ax.save();ax.strokeStyle='rgba(99,233,255,.55)';ax.lineWidth=1.6;ax.setLineDash([5,5]);ax.beginPath();ax.arc(p.x,p.y,24,0,TAU);ax.stroke();ax.restore()}
 const as=arenaState,near=Math.hypot(e.x-as.px,e.y-as.py)<MOB_LABEL_R||e.hit>0||e.hostile||e.foeId!=null;
 if(near||e.hp<e.maxHp*.995)drawBar(ax,p.x,p.y-30,32,e.hp/(e.maxHp||100),4);
 if(near)outText(ax,'🐾 '+B.name.toLowerCase()+' ★'+st,p.x,p.y-36,B.aur,10);
}

/* ===== способности боссов-зверей (по описанию карточек) =====
   Урон — от «удара» босса (TECH_BASE.qiSingle × сила), эффекты на игроке: s.dot (горение/кровь/яд), s.slowT (замедление). */
function bossHit(b){return TECH_BASE.qiSingle*entMult(b)}
function plHurt(b,k,pierce){/* pierce — урон мимо щитов и брони */
 const s=arenaState,a=bossHit(b)*k;s.lastDmgBoss={i:b.index,t:s.t};
 if(pierce){if(s.invuln>0)return;const v=a/myToughness();s.hp=Math.max(0,s.hp-v);floatText(s.px,s.py-34,'-'+fmt(Math.max(1,v)),'#ff3a8a',16);s.hurt=1;s.hitFlash=1;burst(s.px,s.py,9,'#ff3a8a',200,.45,2.6);s.invuln=.22}
 else takeDamage(a,'melee');
}
function plDot(b,t,k,col){const s=arenaState;s.dot={t,dps:bossHit(b)*k,col,i:b.index}}
function plQiDrain(frac){const m=save.maxQi||0,d=Math.min(save.qi,m*frac);save.qi-=d;return d}
function moveK(s){return (s.slowT>0?.45:1)*(s.soulOut&&!s.poss&&typeof soulStage==='function'&&soulStage()>0?SOUL_SPD[soulStage()-1]:1)}
function playerDotTick(dt){
 const s=arenaState;if(!s)return;s.slowT=Math.max(0,(s.slowT||0)-dt);const d=s.dot;if(!d)return;
 d.t-=dt;if(s.hp>0&&!s.soulOut){s.hp=Math.max(0,s.hp-d.dps*dt/myToughness());s.lastDmgBoss={i:d.i,t:s.t};if(Math.random()<dt*8)addPart({k:'spark',x:s.px+rnd(-12,12),y:s.py+rnd(-10,10),vx:0,vy:-30,t:0,max:.6,size:2.6,col:d.col,drag:1})}
 if(d.t<=0)s.dot=null;
}
function bossMeleeFx(b){/* вызывается при каждом физическом ударе босса */
 const k=b.beast||beastKind(b.index);
 if(k==='hell'){plDot(b,5,.1,'#ff6a20');const q=plQiDrain(.03);if(q>0)floatText(arenaState.px,arenaState.py-50,'🔥-'+fmt(q)+' Ци','#ff9a3a',11)}
 else if(k==='bird')plDot(b,6,.07,'#ff2a3a');
 else if(k==='spider')plDot(b,8,.06,'#9bff6a');
}
function bossSpecial(b,dt,d){
 const s=arenaState,k=b.beast||beastKind(b.index),T=b.spT||(b.spT={a:2+Math.random()*3,b:4+Math.random()*3});
 T.a-=dt;T.b-=dt;
 if(k==='abyss'){/* дальний бой, поглощение Ци, регенерация */
  b.hp=Math.min(b.maxHp,b.hp+b.maxHp*.01*dt);
  if(T.a<=0&&d<520){T.a=5;plHurt(b,.6);const q=plQiDrain(.08);b.qi=Math.min(b.maxQi,b.qi+q);b.hp=Math.min(b.maxHp,b.hp+q*.5);burst(s.px,s.py,14,'#ffc83a',200,.6,2.6);if(q>0)floatText(s.px,s.py-50,'-'+fmt(q)+' Ци','#ffd23a',11)}
 }else if(k==='dark'){/* танк, теневые атаки */
  if(T.a<=0&&d<700){T.a=7;b.shadow={x:s.px,y:s.py,t:.9}}
  if(b.shadow){b.shadow.t-=dt;if(b.shadow.t<=0){const sh=b.shadow;b.shadow=null;burst(sh.x,sh.y,26,'#201810',260,.7,3.4);if(Math.hypot(s.px-sh.x,s.py-sh.y)<110)plHurt(b,1.2)}}
 }else if(k==='bird'){/* воздушный бой, призыв стаи воронов */
  if(T.a<=0&&d<900){T.a=9;for(let i=0;i<3;i++){const a=Math.random()*TAU,m=makeAnimal(b.x+Math.cos(a)*60,b.y+Math.sin(a)*60,3,Math.max(5,Math.round(animalStars(3)*.5)));m.expire=s.t+25;m.hostile=true;m.team=b.index;m.crow=true;s.enemies.push(m)}toast('Кровокрыл призвал стаю воронов!')}
 }else if(k==='spider'){/* контроль, яд, ловушки: паутина */
  if(T.a<=0&&d<450){T.a=8;s.slowT=2.5;plQiDrain(.05);burst(s.px,s.py,18,'#e8e8e8',140,.8,2.4);floatText(s.px,s.py-50,'🕸 паутина','#ffffff',12)}
 }else if(k==='fox'){/* иллюзии, маскировка, ментальный урон */
  if(T.a<=0&&d>250&&d<900){T.a=6;const a=Math.atan2(s.py-b.y,s.px-b.x)+Math.PI+(Math.random()-.5);b.x=s.px+Math.cos(a)*130;b.y=s.py+Math.sin(a)*130;burst(b.x,b.y,20,'#b48aff',220,.6,3)}
  if(T.b<=0&&d<450){T.b=7;plHurt(b,.5,true);plQiDrain(.15);s.slowT=1;floatText(s.px,s.py-50,'ментальный удар','#d8b8ff',12)}
 }else if(k==='golem'){/* ближний бой, разрушение */
  if(T.a<=0&&d<140){T.a=7;burst(b.x,b.y,30,'#ffa040',280,.7,3.4);shake(8);plHurt(b,1);s.slowT=1.5}
 }else if(k==='void'){/* дальний бой, игнор защиты, телепорт */
  if(T.a<=0&&d>350&&d<1000){T.a=6;const a=Math.random()*TAU;b.x=s.px+Math.cos(a)*220;b.y=s.py+Math.sin(a)*220;burst(b.x,b.y,20,'#ff3a6a',220,.6,3)}
  if(T.b<=0&&d<650){T.b=4;plHurt(b,.8,true);burst(s.px,s.py,16,'#ff3a6a',200,.5,2.6)}
 }else if(k==='hell'){/* ближний бой, огненный урон: рывок */
  if(T.a<=0&&d>150&&d<500){T.a=6;const a=Math.atan2(s.py-b.y,s.px-b.x);moveBoss(b,Math.cos(a)*(d-70),Math.sin(a)*(d-70));burst(b.x,b.y,18,'#ff6a20',220,.5,3)}
 }
}
/* убийство делает босса сильнее: ускоряется рост, к осколкам добавляется добыча жертвы */
function bossKillCredit(b,v){
 if(!b||!b.isBoss||b.hp<=0)return;b.kills=(b.kills||0)+1;b.growT=(b.growT||0)+60;
 if(v){b.sh1=(b.sh1||0)+Math.floor(v.stars||0);if(v.columns>0||v.core>0)b.sh2=(b.sh2||0)+(v.core>0?10:v.columns)}
 else{b.sh1=(b.sh1||0)+100}
 floatText(b.x,b.y-90,'☠ '+b.kills,'#ff5a4a',14);
}
function playerKilledByBoss(s){
 s.dot=null;s.slowT=0;const L=s.lastDmgBoss;if(!L||s.t-L.t>8)return;s.lastDmgBoss=null;
 const b=aliveBosses(s).find(q=>q.index===L.i);bossKillCredit(b,null);
}
