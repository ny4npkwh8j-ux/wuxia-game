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
