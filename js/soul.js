'use strict';
/* ===== 4 стадия: «Зарождающаяся душа» (основа: формирование и три этапа) =====
   Открывается после полного уплотнения ядра. Этапы: I Зачаток / II Стабильная / III Совершенная; каждый — риска нет, цена Ци или осколками 2 этапа (как у ядра, 1:100).
   Этап даёт множитель к здоровью и запасу Ци. Связь с качеством прошлых стадий: ядро ниже среднего качества (множитель < SOUL_CORE_MID) не даёт душе подняться выше II этапа.
   Сохранение (только добавленные ключи): soulStage 0..3, soulDeposit. Выход из тела и захват — отдельными патчами. */
const SOUL_NAMES=['','ЗАЧАТОК ДУШИ','СТАБИЛЬНАЯ ДУША','СОВЕРШЕННАЯ ДУША'];
const SOUL_MULT=[1,1.3,1.6,2.0];
const SOUL_QI=[0,300000,600000,1200000],SOUL_SHARDS=[0,3000,6000,12000];
const SOUL_CORE_MID=1.9;
function soulStage(){return save.soulStage||0}
function hasSoul(){return soulStage()>0}
function soulUnlocked(){return hasCore()&&(save.coreDens||0)>=CORE_DENS_MAX}
function soulCap(){return (save.coreCoef||0)>=SOUL_CORE_MID?3:2}
function soulMult(){return SOUL_MULT[soulStage()]||1}
function soulQiCost(){return SOUL_QI[soulStage()+1]||0}
function soulShardCost(){return SOUL_SHARDS[soulStage()+1]||0}
function soulQiFraction(){const c=soulQiCost();return c?Math.min(1,(save.soulDeposit||0)/c):0}
function soulShardsLeft(){return Math.max(0,Math.ceil(soulShardCost()*(1-soulQiFraction())-1e-9))}
function soulCanGrow(){return soulUnlocked()&&soulStage()<soulCap()}
function soulHoldRate(){return HOLD_BASE*Math.max(.5,myCore())}
function openSoul(){renderSoul();$('soulModal').classList.add('show')}
function closeSoul(){$('soulModal').classList.remove('show')}
function renderSoul(){
 const st=soulStage(),cap=soulCap(),done=st>=3,capped=!done&&st>=cap,can=soulCanGrow();
 let info=st?('<b>'+SOUL_NAMES[st]+'</b> · ×'+soulMult().toFixed(1)+' · этап <b>'+st+'/3</b>'):'Душа ещё не зародилась';
 if(capped)info+='<br><span class="mhint">Ядро ниже среднего качества — выше «Стабильной» душа не вырастет.</span>';
 $('soulInfo').innerHTML=info;
 const box=$('soulForm');box.style.display=(done||capped)?'none':'block';if(done||capped)return;
 const need=soulQiCost(),left=soulShardsLeft();
 $('soulBarFill').style.width=(soulQiFraction()*100)+'%';
 $('soulProgress').textContent=(st?'Этап ':'Зарождение · ')+(st+1)+'/3 · Ци '+fmt(save.soulDeposit||0)+' / '+fmt(need);
 $('soulDepositBtn').disabled=!can||(save.soulDeposit||0)>=need;$('soulDepositBtn').textContent='Влить Ци · '+soulHoldRate().toFixed(1)+'/с';
 $('soulQiBtn').disabled=!can||(save.soulDeposit||0)<need;$('soulQiBtn').textContent=st?'Возвысить':'Зародить';
 $('soulShBtn').disabled=!can||left<=0||save.rewards2<left;$('soulShBtn').textContent='Осколки · '+fmt(left);
}
async function soulFromQi(){
 if(!soulCanGrow()||(save.soulDeposit||0)<soulQiCost())return;
 if(!await confirmDialog(soulStage()?'Возвысить душу? Риска нет.':'Зародить душу? Риска нет.','Подтвердить'))return;
 soulAdvance(()=>{save.soulDeposit-=soulQiCost()});
}
async function soulFromShards(){
 const left=soulShardsLeft();if(!soulCanGrow()||left<=0)return;
 if(save.rewards2<left)return toast('Нужно '+fmt(left)+' осколков 2 этапа.');
 if(!await confirmDialog(soulStage()?'Возвысить душу? Риска нет.':'Зародить душу? Риска нет.','Подтвердить'))return;
 soulAdvance(()=>{save.rewards2-=left;save.soulDeposit=0});
}
function soulAdvance(payFn){
 if(!soulCanGrow()||soulStage()>=3)return;/* защита: этап не выше III и не выше предела по качеству ядра */
 payFn();const n=soulStage()+1,r=SOUL_MULT[n]/SOUL_MULT[n-1];
 save.soulStage=n;save.soulDeposit=0;save.stageLevel=4;
 /* здоровье и запас Ци растут вместе с множителем этапа (как при уплотнении ядра) */
 save.maxQi=Math.round(save.maxQi*r);save.health=Math.round(save.health*r);save.qi=Math.min(save.qi,save.maxQi);
 persist();updateUI();closeSoul();
 playStageAnimation({kind:'dens',d0:5,success:true,title:SOUL_NAMES[n],text:'Сила и запас Ци выросли в ×'+r.toFixed(2)+' раза. Всего ×'+SOUL_MULT[n].toFixed(1)+'.'});
}

/* ===== душа на арене: выход из тела, возврат, захват чужого тела =====
   Выход: тело остаётся стоять на месте (его могут атаковать; если тело уничтожено — вернуться в него нельзя), душа — жёлтый шарик.
   Вне тела душа: Ци души = здоровье (урон × SOUL_DMGRATE: 3 / 1 / 0.1), она медленно тратит Ци и бьёт слабее тела (30% / 55% / 80%). Ци души закончилась — смерть как на арене.
   Захват: удержание рядом с целью 2 с, шанс по Ци души против Ци цели. Захваченное тело выглядит как оно само, используются только его способности, запас Ци общий.
   Без ограничения по времени: душа выходит кнопкой (или когда тело убито) и остаётся на месте, где вышла; захваченное тело остаётся в мире. */
const SOUL_QMAX=[.5,1,2],SOUL_DMGRATE=[3,1,.1],SOUL_OUTK=[.3,.55,.8],SOUL_RET=[300,900,3000],SOUL_LEASH=[900,2000,4500],SOUL_CH=2,SOUL_RANGE=170;
function soulMaxQi(){const st=soulStage();return st?Math.round(save.maxQi*SOUL_QMAX[st-1]):0}
function soulQiNow(){const m=soulMaxQi();if(typeof save.soulQi!=='number'||!Number.isFinite(save.soulQi))save.soulQi=m;save.soulQi=Math.max(0,Math.min(save.soulQi,m));return save.soulQi}
function soulDmgK(){const s=arenaState;if(!s||!hasSoul())return 1;if(s.poss)return s.poss.k;if(s.soulOut)return SOUL_OUTK[soulStage()-1];return 1}
function soulHpFrac(s){return s.soulOut&&hasSoul()?soulQiNow()/Math.max(1,soulMaxQi()):s.hp/s.maxHp}
function arenaTechs(){const s=arenaState;return s&&s.poss?s.poss.techs:save.techniques}
function soulHit(amount){
 const s=arenaState,st=soulStage();if(s.invuln>0)return;
 const loss=amount*SOUL_DMGRATE[st-1];save.soulQi=soulQiNow()-loss;s.possCh=null;
 floatText(s.px,s.py-34,'-'+fmt(Math.max(1,loss))+' души','#ffd23a',15);s.hurt=1;s.hitFlash=1;burst(s.px,s.py,9,'#ffd23a',200,.45,2.6);s.invuln=.22;
 if(save.soulQi<=0){save.soulQi=0;s.hp=0;toast('Душа погибла.')}
}
/* удар по оставленному телу: его стойкость — как у тела игрока */
function bodyHit(amount,kind){
 const s=arenaState,B=s&&s.body;if(!B||B.dead)return;
 amount/=toughness(save.pillars,save.pillarCoef,myCore());if(kind==='melee')amount*=1-armorCut();
 B.hp-=amount;B.hit=.25;floatText(B.x,B.y-34,'-'+fmt(Math.max(1,amount)),'#ff6a6a',14);burst(B.x,B.y,6,'#ff5a5a',160,.4,2.2);
 if(B.hp<=0){B.hp=0;B.dead=true;s.possCh=null;toast('Тело уничтожено! Вернуться в него нельзя.');burst(B.x,B.y,30,'#ff5a5a',300,.9,3)}
}
function soulTarget(){
 const s=arenaState;let best=null,bd=SOUL_RANGE;
 for(const e of s.enemies.concat(aliveBosses(s))){if(e.hp<=0||e.vessel||isMate(e))continue;const d=Math.hypot(e.x-s.px,e.y-s.py);if(d<bd){bd=d;best=e}}
 return best;
}
function soulCanTake(e,st){
 if(e.isBoss)return st>=3;
 if(st>=3)return true;
 if(st===2)return !(e.core>0);
 return (e.stars||0)<=40&&!(e.columns>0)&&!(e.core>0);
}
function soulAct(){
 const s=arenaState;if(!s||!hasSoul())return;const st=soulStage();
 if(s.poss)return possEnd('leave');
 if(!s.soulOut){
  if(soulQiNow()<soulMaxQi()*.2)return toast('Ци души слишком мало для выхода.');
  s.body={x:s.px,y:s.py,hp:s.hp,maxHp:s.maxHp,dead:false,hit:0,ang:s.facing||0};s.soulOut=true;s.possCh=null;burst(s.px,s.py,24,'#ffd23a',260,.8,3);toast('Душа покинула тело. Тело осталось стоять на месте.');return}
 s.possCh=null;const B=s.body;
 if(!B||B.dead)return toast('Тело уничтожено — вернуться некуда.');
 const d=Math.hypot(s.px-B.x,s.py-B.y);
 if(d>SOUL_RET[st-1])return toast('Тело слишком далеко для возвращения (нужно ближе '+SOUL_RET[st-1]+').');
 s.px=B.x;s.py=B.y;s.hp=B.hp;s.maxHp=B.maxHp;s.body=null;s.soulOut=false;burst(s.px,s.py,24,'#ffd23a',260,.8,3);toast('Душа вернулась в тело.');
}
function soulPossess(){
 const s=arenaState;if(!s||!s.soulOut||s.poss||s.possCh)return;const e=soulTarget();if(!e)return toast('Рядом нет цели для захвата.');
 if(!soulCanTake(e,soulStage()))return toast('Эта цель слишком сильна для твоей души.');
 s.possCh={id:e.id,t:0};
}
/* способности захваченного тела как техники игрока: длина маршрута — по звёздам тела */
function possTechs(e){
 const n=Math.max(3,Math.floor(e.stars||3)),out=[];
 for(const type of (e.techs||[])){if(!TECH_ZONES[type])continue;out.push({type,name:techniqueName(type),nodes:new Array(n).fill(0)})}
 return out;
}
function soulPossRoll(e){
 const s=arenaState,mx=soulMaxQi(),sq=soulQiNow(),res=Math.max(1,(e.maxQi||100)*Math.max(.3,e.hp/Math.max(1,e.maxHp||1))),p=Math.max(.1,Math.min(.9,sq/(sq+res)));
 save.soulQi=Math.max(1,sq-mx*.15);
 if(Math.random()>=p){save.soulQi=soulQiNow()-mx*.25;e.hostile=true;e.provoked=true;e.noSeeT=0;toast('Захват не удался (шанс '+Math.round(p*100)+'%). Цель в ярости.');if(save.soulQi<=0){save.soulQi=0;s.hp=0}return}
 const base=toughness(save.pillars,save.pillarCoef,myCore()),k=Math.max(.2,Math.min(8,entPow(e)/playerPow())),tr=Math.max(.2,Math.min(20,entToughness(e)/Math.max(1,base)));
 s.poss={e,name:e.isBoss?beastOf(e).name:'культиватор ★'+(e.stars||0),k,tr,techs:possTechs(e)};
 e.vessel=true;e.foeId=-999;e.hostile=false;s.maxHp=e.maxHp;s.hp=e.hp;s.px=e.x;s.py=e.y;s.soulOut=false;s.invuln=.5;
 if(typeof rebuildTechButtons==='function')rebuildTechButtons(true);
 burst(s.px,s.py,30,'#ffd23a',300,.9,3.2);toast('Тело захвачено: '+s.poss.name+'. Используются его способности.');
}
function possEnd(reason){
 const s=arenaState,P=s&&s.poss;if(!P)return;const e=P.e,B=s.body;
 e.vessel=false;e.foeId=null;e.noSeeT=0;e.hp=reason==='dead'?0:Math.max(0,s.hp);
 if(e.hp<=0){e.hp=0;if(e.isBoss){e.respawnT=BOSS_RESPAWN;releaseArmy(e.index,null)}else e.removed=true}
 s.poss=null;s.soulOut=true;
 if(B){s.maxHp=B.maxHp;s.hp=B.dead?B.maxHp:B.hp}
 s.invuln=.5;
 if(reason==='dead'){save.soulQi=soulQiNow()-soulMaxQi()*.3;toast('Захваченное тело погибло. Душа ранена и осталась на месте.');if(save.soulQi<=0){save.soulQi=0;s.hp=0}}
 else toast('Душа покинула захваченное тело и осталась на месте.');
 if(typeof rebuildTechButtons==='function')rebuildTechButtons(true);
 burst(s.px,s.py,24,'#ffd23a',260,.8,3);
}
function soulTick(dt){
 const s=arenaState;if(!s||!hasSoul()){soulBtnTick();return}
 const st=soulStage(),mx=soulMaxQi();
 if(!s.soulOut&&!s.poss)save.soulQi=Math.min(mx,soulQiNow()+mx*.05*dt);
 if(s.body){s.body.hit=Math.max(0,(s.body.hit||0)-dt)}
 if(s.soulOut){
  const B=s.body,d=B?Math.hypot(s.px-B.x,s.py-B.y):1e9;save.soulQi=soulQiNow()-mx*.004*(d>SOUL_LEASH[st-1]?5:1)*dt;
  if(save.soulQi<=0){save.soulQi=0;s.hp=0;toast('Душа угасла вдали от тела.')}
  if(s.possCh){const e=s.enemies.concat(aliveBosses(s)).find(q=>q.id===s.possCh.id&&q.hp>0);
   if(!e||Math.hypot(e.x-s.px,e.y-s.py)>SOUL_RANGE*1.5)s.possCh=null;
   else{s.possCh.t+=dt;if(s.possCh.t>=SOUL_CH){s.possCh=null;soulPossRoll(e)}}}
 }
 if(s.poss&&s.hp<=0)possEnd('dead');
 soulBtnTick();
}
function soulBtnTick(){
 const s=arenaState,a=$('soulActBtn'),b=$('soulPossBtn');if(!a||!b)return;
 const show=!!s&&hasSoul();if(a.__v!==show){a.style.display=show?'flex':'none';a.__v=show}
 let at='Выйти',bs=false,bt='Захватить';
 if(show){if(s.poss){at='Покинуть тело'}else if(s.soulOut){at=s.body&&!s.body.dead?'Вернуться':'Тело погибло';bs=!!soulTarget()||!!s.possCh;if(s.possCh)bt='Захват '+Math.round(s.possCh.t/SOUL_CH*100)+'%'}}
 if(a.__t!==at){a.__t=at;$('soulActTxt').textContent=at}
 if(b.__v!==bs){b.style.display=bs?'flex':'none';b.__v=bs}
 if(b.__t!==bt){b.__t=bt;$('soulPossTxt').textContent=bt}
}
/* рисование: оставленное тело (как обычный игрок, неподвижно), жёлтый шарик души, кольцо захвата */
function drawSoulBody(time){
 const s=arenaState;if(!s||!s.body)return;const B=s.body;
 if(B.dead){const p=worldToScreen(B.x,B.y);ax.strokeStyle='#ff5a5a';ax.lineWidth=2;ax.setLineDash([6,5]);ax.beginPath();ax.arc(p.x,p.y,24,0,TAU);ax.stroke();ax.setLineDash([]);outText(ax,'ТЕЛО УНИЧТОЖЕНО',p.x,p.y-30,'#ff9a9a',11)}
 else{
  const keep={px:s.px,py:s.py,dx:s.dx,dy:s.dy,dashTime:s.dashTime,aimT:s.aimT,channel:s.channel,qiCast:s.qiCast,mv:s.mv,facing:s.facing,hitFlash:s.hitFlash,shield:s.shield,qiShieldOn:s.qiShieldOn};
  s.px=B.x;s.py=B.y;s.dx=0;s.dy=0;s.dashTime=0;s.aimT=0;s.channel=null;s.qiCast=0;s.mv=0;s.facing=B.ang;s.hitFlash=B.hit>0?1:0;s.shield=0;s.qiShieldOn=false;
  try{drawPlayer(time)}finally{Object.assign(s,keep)}
  const p=worldToScreen(B.x,B.y);if(B.hp<B.maxHp)drawBar(ax,p.x,p.y-52,60,B.hp/B.maxHp,6);
  ax.strokeStyle='rgba(255,210,58,.55)';ax.lineWidth=2;ax.setLineDash([6,5]);ax.beginPath();ax.arc(p.x,p.y+6,30,0,TAU);ax.stroke();ax.setLineDash([]);
 }
 if(s.possCh){const e=s.enemies.concat(aliveBosses(s)).find(q=>q.id===s.possCh.id);if(e){const q=worldToScreen(e.x,e.y);ax.strokeStyle='#ffd23a';ax.lineWidth=3;ax.beginPath();ax.arc(q.x,q.y,40,-Math.PI/2,-Math.PI/2+TAU*s.possCh.t/SOUL_CH);ax.stroke()}}
}
function drawSoulBall(time){
 const s=arenaState,p=worldToScreen(s.px,s.py),bob=Math.sin(time*4)*3;
 ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y+bob,38,'#ffd23a',.55);glow(ax,p.x,p.y+bob,18,'#fff2a0',.9);ax.globalCompositeOperation='source-over';
 ax.fillStyle='#ffd23a';ax.beginPath();ax.arc(p.x,p.y+bob,9,0,TAU);ax.fill();ax.fillStyle='#fffbe0';ax.beginPath();ax.arc(p.x-2,p.y+bob-2,4,0,TAU);ax.fill();
}
