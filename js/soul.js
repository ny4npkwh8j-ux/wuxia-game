'use strict';
/* ===== 4 стадия: «Зарождающаяся душа» (основа: формирование и три этапа) =====
   Открывается после полного уплотнения ядра. Этапы: I Зачаток / II Стабильная / III Совершенная; каждый — риска нет, цена Ци или осколками 2 этапа (как у ядра, 1:100).
   Этап даёт множитель к здоровью и запасу Ци. Связь с качеством прошлых стадий: ядро ниже среднего качества (множитель < SOUL_CORE_MID) не даёт душе подняться выше II этапа.
   Сохранение (только добавленные ключи): soulStage 0..3, soulDeposit. Выход из тела и захват — отдельными патчами. */
const SOUL_NAMES=['','НАЧАЛЬНАЯ ДУША','СРЕДНЯЯ ДУША','ПИКОВАЯ ДУША','ПОСЛЕДНЯЯ ДУША'],SOUL_MAX=4;
const SOUL_MULT=[1,1.1,1.2,1.3,1.4];
const SOUL_QI=[0,300000,600000,1200000,2400000],SOUL_SHARDS=[0,COL_SH,COL_SH*2,COL_SH*4,COL_SH*8];
const SOUL_CORE_MID=1.9;
function soulStage(){return save.soulStage||0}
function hasSoul(){return soulStage()>0}
function soulUnlocked(){return hasCore()&&(save.coreDens||0)>=coreDensMax()}
/* потолок души: ядро из 3 колонн — только начальная, из 4–5 — до последней; ядро ниже среднего качества — на этап ниже.
   Для прорыва дальше последней (трансформация души, позже) ядро из 4 колонн потребует в 10 раз больше, чем из 5: soulNextK(). */
/* шансы прорыва души: [ранг ядра][ступень]; 0 — ступень недоступна по качеству ядра */
const SOUL_CHANCE=[null,[70,15,0,0],[80,40,10,0],[90,65,35,10],[95,80,60,35],[98,90,80,65]];
function soulChanceBase(){const r=Math.max(1,coreRank()||1),b=(SOUL_CHANCE[r]||SOUL_CHANCE[3])[soulStage()]||0;return b?Math.max(5,Math.min(100,b+pathChanceBonus(r))):0}
function soulChance(){const b=soulChanceBase();return b?Math.min(100,b+10*(save.pityS||0)):0}
function soulRankCap(){const t=SOUL_CHANCE[Math.max(1,coreRank()||1)]||SOUL_CHANCE[3];let c=0;for(let i=0;i<SOUL_MAX;i++)if(t[i]>0)c=i+1;return c}
function soulCols(){return save.coreCols==null?5:save.coreCols}
function soulCap(){const byCols=soulCols()<=3?1:SOUL_MAX;return Math.min(byCols,soulRankCap())}
function soulNextK(){return soulCols()>=5?1:soulCols()===4?10:1e6}
function soulMult(){return SOUL_MULT[soulStage()]||1}
function soulQiCost(){return Math.round((SOUL_QI[soulStage()+1]||0)*foundK(coreRank()))}
function soulShardCost(){return Math.round((SOUL_SHARDS[soulStage()+1]||0)*foundK(coreRank()))}
function soulQiFraction(){const c=soulQiCost();return c?Math.min(1,(save.soulDeposit||0)/c):0}
function soulShardsLeft(){return Math.max(0,Math.ceil(soulShardCost()*(1-soulQiFraction())-1e-9))}
function soulCanGrow(){return soulUnlocked()&&soulStage()<soulCap()}
function soulHoldRate(){return HOLD_BASE*Math.max(.5,myCore())}
function openSoul(){renderSoul();$('soulModal').classList.add('show')}
function closeSoul(){$('soulModal').classList.remove('show')}
function renderSoul(){
 const st=soulStage(),cap=soulCap(),done=st>=SOUL_MAX,capped=!done&&st>=cap,can=soulCanGrow();
 let info=st?('<b>'+SOUL_NAMES[st]+'</b> · ×'+soulMult().toFixed(1)+' · этап <b>'+st+'/'+SOUL_MAX+'</b>'):'Душа ещё не зародилась';
 if(capped)info+='<br><span class="mhint">Потолок души задан ядром: '+(soulCols()<=3?'ядро из 3 колонн — выше начальной душа не вырастет.':'качество ядра не позволяет подняться выше этой ступени.')+'</span>';
 if(hasCore())info+='<br><span class="mhint">'+PATH_NAME[pathOf(coreRank())]+'</span>';
 info+='<br><span class="mhint">Осколки души (4 этапа): <b>'+fmt(Math.floor(save.rewards4||0))+'</b></span>';
 $('soulInfo').innerHTML=info;
 if(typeof renderTrans==='function')renderTrans(done);
 if(typeof renderSoulMem==='function')renderSoulMem();
 const box=$('soulForm');box.style.display=(done||capped)?'none':'block';if(done||capped)return;
 const need=soulQiCost(),left=soulShardsLeft();
 $('soulBarFill').style.width=(soulQiFraction()*100)+'%';
 $('soulProgress').textContent=(st?'Этап ':'Зарождение · ')+(st+1)+'/'+SOUL_MAX+' · шанс '+soulChance()+'% · Ци '+fmt(save.soulDeposit||0)+' / '+fmt(need);
 $('soulDepositBtn').disabled=!can||(save.soulDeposit||0)>=need;$('soulDepositBtn').textContent='Влить Ци · '+soulHoldRate().toFixed(1)+'/с';
 $('soulQiBtn').disabled=!can||(save.soulDeposit||0)<need;$('soulQiBtn').textContent=st?'Возвысить':'Зародить';
 $('soulShBtn').disabled=!can||left<=0||shBalance(4)<left;$('soulShBtn').textContent='Осколки · '+fmt(left);
}
/* смерть игрока с душой: тело смертно и гибнет, душа откатывается на пол-стадии (3/3 → 2/3, полоска наполовину), новое тело развивается заново и быстро */
function soulDeathRollback(){
 const n=soulStage();if(n<1)return '';
 if(save.soulTrans)return ' Душа пережила гибель тела: ступень сохранена.';
 const r=SOUL_MULT[n-1]/SOUL_MULT[n];
 save.soulStage=n-1;save.soulMV=2;save.soulDeposit=Math.floor(SOUL_QI[n]/2);save.soulQi=null;
 save.maxQi=Math.max(1,Math.round(save.maxQi*r));save.health=Math.max(1,Math.round(save.health*r));
 return ' Смертное тело погибло, душа откатилась: '+(n-1?SOUL_NAMES[n-1]:'душа не зародилась')+', полоска возвышения заполнена наполовину.';
}
/* вне тела единственный показатель — Ци души: она же здоровье и она же тратится на Удар Ци; обнулилась — душа гибнет */
function qiHave(){const s=arenaState;return s&&(s.soulOut||s.poss)&&hasSoul()?Math.max(0,soulQiNow()-1):save.qi}
function qiSpend(c){const s=arenaState;if(s&&(s.soulOut||s.poss)&&hasSoul()){save.soulQi=Math.max(1,soulQiNow()-c);if(s.poss)possBacklash()}else save.qi-=c}
/* слабое тело «не тянет» запас души: каждое применение способности бьёт по телу тем сильнее, чем больше разрыв между Ци души и ёмкостью тела.
   Разрыв ≤1.5× — без отдачи; растёт на 6% здоровья за каждое удвоение, потолок 40% (тело с нулём звёзд переживает 2 применения и погибает на 3-м) */
const BACKLASH_FREE=1.5,BACKLASH_STEP=.06,BACKLASH_MAX=.4;
function possBacklashFrac(e){const gap=soulMaxQi()/Math.max(1,e.maxQi||1);return gap<=BACKLASH_FREE?0:Math.min(BACKLASH_MAX,BACKLASH_STEP*Math.log2(gap/BACKLASH_FREE))}
function possBacklash(){
 const s=arenaState,P=s&&s.poss;if(!P)return;const f=possBacklashFrac(P.e);if(f<=0)return;
 const d=s.maxHp*f;s.hp-=d;s.hurt=1;floatText(s.px,s.py-40,'отдача -'+fmt(Math.max(1,d)),'#ff9a6a',13);burst(s.px,s.py,6,'#ff9a6a',160,.4,2.2);
}
function soulCoolLeft(){return Math.max(0,Math.ceil(((save.soulCool||0)-Date.now())/1000))}
async function soulFromQi(){
 if(!soulCanGrow()||(save.soulDeposit||0)<soulQiCost())return;
 if(soulCoolLeft()>0)return toast('Душа восстанавливается после неудачи: ещё '+soulCoolLeft()+' с.');
 if(!await confirmDialog((soulStage()?'Возвысить душу?':'Зародить душу?')+' Шанс успеха: '+soulChance()+'%. При неудаче теряется половина вложенного.','Подтвердить'))return;
 soulAdvance(()=>{save.soulDeposit-=soulQiCost()},()=>{save.soulDeposit+=Math.floor(soulQiCost()/2)});
}
async function soulFromShards(){
 const left=soulShardsLeft();if(!soulCanGrow()||left<=0)return;
 if(shBalance(4)<left)return toast('Нужно '+fmt(left)+' осколков 4 этапа (души).');
 if(soulCoolLeft()>0)return toast('Душа восстанавливается после неудачи: ещё '+soulCoolLeft()+' с.');
 if(!await confirmDialog((soulStage()?'Возвысить душу?':'Зародить душу?')+' Шанс успеха: '+soulChance()+'%. При неудаче теряется половина вложенного.','Подтвердить'))return;
 soulAdvance(()=>{shPay(4,left);save.soulDeposit=0},()=>{save.rewards4=(save.rewards4||0)+Math.floor(left/2)});
}
function soulAdvance(payFn,refundFn){
 if(!soulCanGrow()||soulStage()>=SOUL_MAX)return;/* защита: этап не выше IV и не выше предела по качеству ядра */
 payFn();
 if(Math.random()*100>=soulChance()){/* неудача: возвращается половина, душа восстанавливается 2 мин, следующая попытка удачнее (+10%) */
  if(refundFn)refundFn();save.pityS=(save.pityS||0)+1;save.soulCool=Date.now()+120000;persist();updateUI();renderSoul();
  playStageAnimation({kind:'core',success:false,title:'Прорыв души не удался',text:'Половина вложенного потеряна, душа нестабильна — отдохни 2 минуты. Следующая попытка удачнее (+10%).',onClose:()=>{}});return}
 save.pityS=0;const n=soulStage()+1,r=SOUL_MULT[n]/SOUL_MULT[n-1];
 save.soulStage=n;save.soulMV=2;save.soulDeposit=0;save.stageLevel=4;
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
const SOUL_QMAX=[.5,1,2,3],SOUL_DMGRATE=[3,1,.1,.05],SOUL_OUTK=[.3,.55,.8,.9],SOUL_RET=[300,900,3000,6000],SOUL_LEASH=[900,2000,4500,7000],SOUL_CH=2,SOUL_RANGE=170;
function soulMaxQi(){const st=soulStage();return st?Math.round(save.maxQi*SOUL_QMAX[st-1]):0}
/* общий запас Ци: при выходе душа забирает часть резерва тела (SOUL_TAKE), при возвращении отдаёт остаток */
const SOUL_TAKE_ST=[.3,.5,.8,.9];/* доля общего резерва, которую душа уносит при выходе: ЗД I—30%, II—50%, III—80%, IV—90%, после трансформации — 100% */
function soulTakeK(){return save.soulTrans?1:SOUL_TAKE_ST[Math.max(0,Math.min(3,soulStage()-1))]}
/* общий резерв «душа+тело»: душа выходит с долей soulTakeK от своего объёма (в той же степени заполнения, что и тело), тело отдаёт ту же долю своей Ци */
function soulTakeQi(){const mx=soulMaxQi(),p=Math.max(.02,Math.min(1,save.qi/Math.max(1,save.maxQi))),k=soulTakeK();return{soul:Math.max(1,Math.round(mx*p*k)),lent:save.qi*k}}
function soulFrac(){return Math.max(0,Math.min(1,soulQiNow()/Math.max(1,soulMaxQi())))}
function soulQiNow(){const m=soulMaxQi();if(typeof save.soulQi!=='number'||!Number.isFinite(save.soulQi))save.soulQi=m;save.soulQi=Math.max(0,Math.min(save.soulQi,m));return save.soulQi}
/* потеря Ци души вне тела: слабеет с ростом ступени (I—100%, IV—10%), после трансформации прекращается */
const SOUL_DRAIN_K=[1,.6,.3,.1];
function soulDrainK(){return save.soulTrans?0:SOUL_DRAIN_K[Math.max(0,Math.min(3,soulStage()-1))]}
function soulDmgK(){const s=arenaState;if(!s||!hasSoul())return 1;if(s.poss)return s.poss.k;if(s.soulOut)return save.soulTrans?1:SOUL_OUTK[soulStage()-1];return 1}
function soulHpFrac(s){return s.soulOut&&hasSoul()?soulQiNow()/Math.max(1,soulMaxQi()):s.hp/s.maxHp}
/* душа вне тела владеет только Ударом Ци; остальные техники проявляются лишь в теле (своём или захваченном) */
const SOUL_SPD=[2.5,3,3.5,4];
function arenaTechs(){const s=arenaState;return s&&s.poss?s.poss.techs:s&&s.soulOut?(save.soulTrans?save.techniques:save.techniques.filter(t=>t.type==='qiSingle')):save.bodyLost||save.starPts.length<1?save.techniques:save.techniques.filter(t=>typeof techOk!=='function'||techOk(t))}
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
 for(const e of s.enemies.concat(aliveBosses(s))){if(e.hp<=0||e.vessel)continue;const d=Math.hypot(e.x-s.px,e.y-s.py);if(d<bd){bd=d;best=e}}
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
  if(save.qi<save.maxQi*.2)return toast('Ци тела слишком мало: душа не может забрать резерв и выйти.');
  s.body={x:s.px,y:s.py,hp:s.hp,maxHp:s.maxHp,dead:false,hit:0,ang:s.facing||0};s.soulOut=true;s.possCh=null;{const tk=soulTakeQi();save.soulQi=tk.soul;save.soulTook=tk.soul;save.soulLent=tk.lent;save.qi=Math.max(0,save.qi-tk.lent)}burst(s.px,s.py,24,'#ffd23a',260,.8,3);toast('Душа покинула тело и забрала часть резерва Ци. Тело осталось стоять на месте.');if(typeof rebuildTechButtons==='function')rebuildTechButtons(true);return}
 s.possCh=null;const B=s.body;
 if(!B||B.dead)return toast('Тело уничтожено — вернуться некуда.');
 const d=Math.hypot(s.px-B.x,s.py-B.y);
 if(d>SOUL_RET[st-1])return toast('Тело слишком далеко для возвращения (нужно ближе '+SOUL_RET[st-1]+').');
 s.px=B.x;s.py=B.y;s.hp=B.hp;s.maxHp=B.maxHp;s.body=null;s.soulOut=false;save.qi=Math.min(save.maxQi,save.qi+(save.soulLent||0)*Math.min(1,soulQiNow()/Math.max(1,save.soulTook||1)));save.soulLent=0;save.soulTook=0;save.soulQi=null;burst(s.px,s.py,24,'#ffd23a',260,.8,3);toast('Душа вернулась в тело и вернула остаток Ци.');if(typeof rebuildTechButtons==='function')rebuildTechButtons(true);
}
function soulPossess(){
 const s=arenaState;if(!s||!s.soulOut||s.poss||s.possCh)return;const e=soulTarget();if(!e)return toast('Рядом нет цели для захвата.');
 if(!soulCanTake(e,soulStage()))return toast('Эта цель слишком сильна для твоей души.');
 s.possCh={id:e.id,t:0};
}
/* способности захваченного тела как техники игрока: длина маршрута — по звёздам тела */
function possTechs(e){
 const n=Math.max(3,Math.floor(e.stars||3)),out=[];
 /* сначала способности самой души (Удар Ци; после трансформации — все), затем те, что есть у тела; Ци для всех — запас души */
 for(const t of (save.soulTrans?save.techniques:save.techniques.filter(t=>t.type==='qiSingle')))out.push(t);
 for(const type of (e.techs||[])){if(!TECH_ZONES[type]||out.some(t=>t.type===type))continue;out.push({type,name:techniqueName(type),nodes:new Array(n).fill(0)})}
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
 if(save.bodyLost&&typeof possMakeMain==='function'){possMakeMain(e);return}
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
 if(save.bodyLost&&!s.soulOut&&!s.poss){s.body={x:s.px,y:s.py,hp:0,maxHp:s.maxHp,dead:true,hit:0,ang:s.facing||0};s.soulOut=true;s.hp=Math.max(1,s.maxHp)}
 /* в теле запас Ци общий (save.qi) */
 if(s.body){s.body.hit=Math.max(0,(s.body.hit||0)-dt)}
 if(s.soulOut){
  const B=s.body,d=B?Math.hypot(s.px-B.x,s.py-B.y):1e9;save.soulQi=soulQiNow()-mx*.004*soulDrainK()*(arenaMeditation.active&&arenaMeditation.soul?.25:1)*(d>SOUL_LEASH[st-1]?5:1)*dt;
  if(save.soulQi<=0){save.soulQi=0;s.hp=0;toast('Душа угасла вдали от тела.')}
  if(s.possCh){const e=s.enemies.concat(aliveBosses(s)).find(q=>q.id===s.possCh.id&&q.hp>0);
   if(!e||Math.hypot(e.x-s.px,e.y-s.py)>SOUL_RANGE*1.5)s.possCh=null;
   else{s.possCh.t+=dt;if(s.possCh.t>=SOUL_CH){s.possCh=null;soulPossRoll(e)}}}
 }
 if(s.poss&&s.hp<=0)possEnd('dead');
 soulBtnTick();
}
function soulBtnTick(){
 {const vb=$('vesselBtn');if(vb){const sv=!!(arenaState&&arenaState.poss);if(vb.__v!==sv){vb.style.display=sv?'flex':'none';vb.__v=sv}}}
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

/* ===== души у мобов =====
   Зарождение: только у мобов с ядром максимальной плотности, редкая попытка по таблице SOUL_CHANCE (потолок — по рангу ядра и колоннам, как у игрока).
   Смерть тела: душа уходит шариком (шанс растёт со стадией), ищет ближайшее тело слабее себя, 3 с захватывает его и возрождается с душой на пол-стадии ниже
   (стадия I остаётся I). Не нашла тело за ~25 с — угасает. Старость на душе стоит (ageRate). */
function mobSoulCap(e){const t=SOUL_CHANCE[Math.max(1,e.coreRank||1)]||SOUL_CHANCE[3];let c=0;for(let i=0;i<t.length;i++){if(t[i]>0)c=i+1;else break}const cols=e.coreCols||e.columns||0;return Math.min(cols<=3?1:SOUL_MAX,c)}
function mobSoulTry(e){
 const s=arenaState;if(!s||e.isBoss||e.animal||e.vessel||e.hp<=0||!(e.core>0)||e.foeId!=null)return;
 const st=e.soulStage||0;if(st>=mobSoulCap(e)||(e.dens||0)<coreDensMax(e))return;
 if((e.soulT||0)>s.t)return;e.soulT=s.t+240*(1+st)+Math.random()*120;
 const row=SOUL_CHANCE[Math.max(1,e.coreRank||1)]||SOUL_CHANCE[3];
 if(Math.random()*100>=(row[st]||0)*.5)return;
 const r=SOUL_MULT[st+1]/SOUL_MULT[st];e.soulStage=st+1;e.maxHp*=r;e.hp*=r;e.str*=r;if(e.maxQi!=null){e.maxQi*=r;e.qi*=r}
 floatText(e.x,e.y-52,'✦ душа!','#ffd23a',15);burst(e.x,e.y,20,'#ffd23a',220,.8,3);
 chron('Культиватор зародил душу: '+SOUL_NAMES[st+1]);
}
function mobSoulEscape(e){
 const s=arenaState;if(!s||e.isBoss||e.animal||e.vessel||!((e.soulStage||0)>0))return;
 if(Math.random()>=.5+.1*e.soulStage)return;
 (s.mobSouls=s.mobSouls||[]).push({x:e.x,y:e.y,stage:e.soulStage,stars:e.stars||0,tal:e.tal,t:0,hold:0,tgt:null,sect:e.sect,techs:(e.techs||[]).slice(),wantBody:Math.random()<.4});
 burst(e.x,e.y,18,'#ffd23a',200,.8,2.8);floatText(e.x,e.y-40,'душа ушла','#ffd23a',13);
}
function mobSoulHost(z){const s=arenaState;let best=null,bd=1e9;
 for(const e of s.enemies){if(e.hp<=0||e.removed||e.isBoss||e.animal||e.vessel||(e.soulStage||0)>0||(e.core>0&&e.core>=1.5&&0))continue;
  if((e.stars||0)>z.stars*1.1+20)continue;const old=Math.min(1,(e.age||0)/Math.max(1,lifeSpan(e))),d=Math.hypot(e.x-z.x,e.y-z.y)*(1+.6*old);if(d<bd&&d<900){bd=d;best=e}}/* молодое тело предпочтительнее старого: возраст — свойство носителя */
 return best}
function mobSoulTick(dt){
 const s=arenaState;if(!s||!s.mobSouls||!s.mobSouls.length)return;
 for(let i=s.mobSouls.length-1;i>=0;i--){const z=s.mobSouls[i];z.t+=dt;
  if(z.t>25){s.mobSouls.splice(i,1);chron('Душа угасла, не найдя тела');continue}
  const B=s.body&&!s.body.dead&&(s.soulOut||s.poss)&&z.wantBody&&Math.hypot(s.body.x-z.x,s.body.y-z.y)<800?s.body:null;
  let h=B?B:z.tgt!=null?s.enemies.find(q=>q.id===z.tgt&&q.hp>0&&!q.removed&&!(q.soulStage>0)):null;
  if(!h){z.tgt=null;h=mobSoulHost(z);if(h)z.tgt=h.id}
  if(!h){z.x+=Math.cos(z.t)*30*dt;z.y+=Math.sin(z.t*1.3)*30*dt;continue}
  const dx=h.x-z.x,dy=h.y-z.y,d=Math.hypot(dx,dy)||1,sp=SOUL_SPD[Math.min(3,z.stage-1)]*60;
  if(d>26){z.x+=dx/d*sp*dt;z.y+=dy/d*sp*dt;z.hold=0}
  else{z.hold+=dt;if(z.hold>=3){
   if(h===s.body){h.dead=true;s.possCh=null;toast('Чужая душа захватила твоё оставленное тело! Вернуться в него нельзя.');burst(h.x,h.y,30,'#ff5a5a',300,.9,3);chron('Душа захватила тело, оставленное игроком');s.mobSouls.splice(i,1);continue}
   const ns=Math.max(1,z.stage-1),r=SOUL_MULT[ns]/SOUL_MULT[0];h.techs=Array.from(new Set((h.techs||[]).concat(z.techs||[])));
   h.soulStage=ns;h.maxHp*=r;h.hp=Math.min(h.maxHp,h.hp*r+h.maxHp*.3);h.str*=r;if(h.maxQi!=null){h.maxQi*=r;h.qi=h.maxQi*.5}
   if(z.sect!=null)h.sect=z.sect;h.reborn=(h.reborn||0)+1;
   floatText(h.x,h.y-52,'✦ новое тело','#ffd23a',15);burst(h.x,h.y,26,'#ffd23a',240,.9,3);chron('Душа захватила новое тело ('+SOUL_NAMES[ns]+')');
   s.mobSouls.splice(i,1)}}
 }
}
function drawMobSouls(time){
 const s=arenaState;if(!s||!s.mobSouls)return;
 for(const z of s.mobSouls){const p=worldToScreen(z.x,z.y),bob=Math.sin(time*4+z.x)*3;
  ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y+bob,30,'#ffd23a',.5);glow(ax,p.x,p.y+bob,14,'#fff2a0',.85);ax.globalCompositeOperation='source-over';
  ax.fillStyle='#ffd23a';ax.beginPath();ax.arc(p.x,p.y+bob,7,0,TAU);ax.fill()}
}

/* ===== культивация захваченного тела: можно посмотреть и подтолкнуть (открыть технику, продвинуть этап за осколки игрока) ===== */
function soulDiscK(){return Math.max(.5,1-.12*(soulStage()||0))}
function vesselNext(e){
 /* следующий шаг тела — те же правила, что и у мобов (evolveTick); возвращает {tier,cost,label} или null */
 if(!e||e.isBoss)return null;const S=e.stars||0,C=e.columns||0;
 if(e.animal)return S<ANIMAL_CAP?{tier:1,cost:Math.ceil((10+5*S)*soulDiscK()),label:'звезда ★'+(S+1)}:null;
 if(e.core>0){const d=e.dens||0;return d<coreDensMax(e)?{tier:3,cost:Math.ceil(densShardCost0(d)*soulDiscK()),label:'уплотнение ядра '+(d+1)+'/'+CORE_DENS_MAX}:null}
 if(S<100)return{tier:1,cost:Math.ceil((10+5*S)*soulDiscK()),label:'звезда ★'+(S+1)};
 if(C>=coreAt(e)&&C>=CORE_MIN_PILLARS)return{tier:3,cost:Math.ceil(CORE_SHARD_COST*soulDiscK()),label:'формирование ядра'};
 if(C>=entMaxCols(e))return null;
 return C===0?{tier:1,cost:Math.ceil(10000*soulDiscK()),label:'колонна 1'}:{tier:2,cost:Math.ceil(COL_SH*soulDiscK()),label:'колонна '+(C+1)};
}
function vesselRecalc(){
 const s=arenaState,P=s&&s.poss;if(!P)return;const e=P.e,base=toughness(save.pillars,save.pillarCoef,myCore());
 const oldMax=s.maxHp;P.k=Math.max(.2,Math.min(8,entPow(e)/playerPow()));P.tr=Math.max(.2,Math.min(20,entToughness(e)/Math.max(1,base)));
 s.maxHp=e.maxHp;s.hp=Math.min(e.maxHp,s.hp+Math.max(0,e.maxHp-oldMax));
}
function vesselOpen(){const s=arenaState;if(!s||!s.poss)return;renderVessel();$('vesselModal').classList.add('show')}
function vesselClose(){$('vesselModal').classList.remove('show')}
function renderVessel(){
 const s=arenaState,P=s&&s.poss;if(!P){vesselClose();return}const e=P.e,box=$('vesselBody');
 const cult=e.isBoss?'Зверь-босс':e.animal?('зверь ★'+(e.stars||0)):('★'+(e.stars||0)+(e.core>0?' · ядро, плотность '+(e.dens||0)+'/'+CORE_DENS_MAX:(e.columns?' · колонн: '+e.columns:'')));
 const techs=(e.techs||[]).map(t=>techniqueName(t)).join(', ')||'нет';
 const nx=vesselNext(e),can=!e.isBoss,nq=nx?vesselQiCost(nx):0;
 let h='<p class="mline"><b>'+P.name+'</b></p><p class="mline sm">Культивация: <b>'+cult+'</b><br>Техники тела: '+techs+'<br>Ци души: <b>'+fmt(soulQiNow())+' / '+fmt(soulMaxQi())+'</b><br>Ёмкость тела по Ци: '+fmt(e.maxQi||0)+' · отдача за способность: <b>'+Math.round(possBacklashFrac(e)*100)+'%</b> здоровья тела<br>Скидка опыта души на развитие: '+Math.round((1-soulDiscK())*100)+'%</p>';
 h+='<div class="row"><button class="bigbtn secondary" '+((!can||!nx||shBalance(nx.tier)<nx.cost)?'disabled':'')+' onclick="vesselAdvance()">'+(nx?'Продвинуть: '+nx.label+' · '+fmt(nx.cost)+' ('+SH_NAME[nx.tier]+')':'Дальше продвинуть нельзя')+'</button></div>';
 if(nx)h+='<div class="row"><button class="bigbtn secondary" '+((!can||qiHave()<nq)?'disabled':'')+' onclick="vesselAdvance(true)">Продвинуть за Ци: '+nx.label+' · '+fmt(nq)+' Ци</button></div>';
 const known=save.techniques.filter(t=>TECH_ZONES[t.type]&&!(e.techs||[]).includes(t.type)),cost=Math.round(soulMaxQi()*.1);
 if(can&&!e.animal)for(const t of known)h+='<div class="row"><button class="bigbtn secondary" '+(soulQiNow()-1<cost?'disabled':'')+' onclick="vesselTeach(\''+t.type+'\')">Открыть технику: '+techniqueName(t.type)+' · '+fmt(cost)+' Ци души</button></div>';
 box.innerHTML=h;
}
function vesselQiCost(nx){return Math.ceil(nx.cost*Math.pow(SHARD_RATE,nx.tier-1))}/* 1 осколок 1 этапа = 1 Ци, дальше ×SHARD_RATE */
function vesselAdvance(byQi){
 const s=arenaState,P=s&&s.poss;if(!P||P.e.isBoss)return;const e=P.e,nx=vesselNext(e);if(!nx)return;
 if(byQi){const q=vesselQiCost(nx);if(qiHave()<q)return;save.soulQi=Math.max(1,soulQiNow()-q)}
 else{if(shBalance(nx.tier)<nx.cost)return;shPay(nx.tier,nx.cost)}
 e[ESH[nx.tier]]=(e[ESH[nx.tier]]||0)+nx.cost;e.growT=1e9;
 const st0=e.stars||0,c0=e.columns||0,k0=e.core||0,d0=e.dens||0;
 evolveTick(e,0);e.growT=0;
 if((e.stars||0)===st0&&(e.columns||0)===c0&&(e.core||0)===k0&&(e.dens||0)===d0)toast('Прорыв не удался: осколки потрачены.');else toast('Тело продвинуто: '+nx.label+'.');
 P.techs=possTechs(e);vesselRecalc();if(typeof rebuildTechButtons==='function')rebuildTechButtons(true);persist();renderVessel();
}
function vesselTeach(type){
 const s=arenaState,P=s&&s.poss;if(!P||P.e.isBoss||P.e.animal)return;const e=P.e,cost=Math.round(soulMaxQi()*.1);
 if(soulQiNow()-1<cost||(e.techs||[]).includes(type))return;
 qiSpend(cost);e.techs=(e.techs||[]).concat([type]);P.techs=possTechs(e);
 if(typeof rebuildTechButtons==='function')rebuildTechButtons(true);toast('Тело освоило технику: '+techniqueName(type)+'.');renderVessel();
}
