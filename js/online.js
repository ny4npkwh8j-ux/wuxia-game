'use strict';
/* ===== онлайн-культивация и зажимаемое вливание Ци =====
   1) Окно культивации открывается поверх арены (кнопка ☯ или клавиша C): арена идёт в реальном времени, зона Ци восполняет Ци, а урон можно получить.
   2) Вливание Ци в колонну, шанс колонны, ядро и уплотнение ядра — зажимаемое: держишь кнопку, Ци утекает, скорость зависит от качества прошлого этапа:
      колонна 1 — по звёздам (100 ★ → 9 Ци/с), колонны 2+ — по качеству первой колонны и их числу, ядро — по качеству колонн, уплотнение — по качеству ядра. ===== */
const HOLD_BASE=9;
function pillarHoldRate(){return save.pillars===0?HOLD_BASE*Math.max(.3,save.stars/100):HOLD_BASE*(save.pillarCoef||1)*save.pillars}
function coreHoldRate(){return HOLD_BASE*Math.max(.3,save.pillars*(save.pillarCoef||1))}
function densHoldRate(){return HOLD_BASE*Math.max(.5,myCore())}
const HOLD={
 pillar:{modal:'pillarModal',ok:()=>save.pillars<MAX_PILLARS&&(save.pillars>0||save.stars>=FIRST_PILLAR_STARS),rate:pillarHoldRate,room:()=>activeColumnCost()-(save.pillarQi||0),add:n=>{save.pillarQi=(save.pillarQi||0)+n},ui:()=>renderPillar()},
 pchance:{modal:'pillarModal',ok:()=>save.pillars<MAX_PILLARS&&(save.pillars>0||save.stars>=FIRST_PILLAR_STARS)&&pillarChance(save.pillarChanceExtra)<90,rate:pillarHoldRate,room:()=>pillarChanceQiCost()-(save.pillarChanceQi||0),
  add:n=>{const c=pillarChanceQiCost();save.pillarChanceQi=(save.pillarChanceQi||0)+n;if(save.pillarChanceQi>=c-1e-6){save.pillarChanceQi=0;save.pillarChanceExtra+=10000;toast('Шанс колонны +10% (сейчас '+pillarChance(save.pillarChanceExtra)+'%)')}},ui:()=>renderPillar()},
 core:{modal:'coreModal',ok:()=>!hasCore()&&coreUnlocked(),rate:coreHoldRate,room:()=>CORE_QI_COST-(save.coreDeposit||0),add:n=>{save.coreDeposit=(save.coreDeposit||0)+n},ui:()=>renderCore()},
 dens:{modal:'coreModal',ok:()=>hasCore()&&(save.coreDens||0)<CORE_DENS_MAX,rate:densHoldRate,room:()=>densQiCost()-(save.coreDeposit||0),add:n=>{save.coreDeposit=(save.coreDeposit||0)+n},ui:()=>renderCore()}
};
let holdK=null,holdLast=0,holdUiT=0,holdSaveT=0,holdRaf=0;
function holdStart(k){
 if(holdK)return;const h=HOLD[k];if(!h||!h.ok()||h.room()<=0)return;
 holdK=k;holdLast=performance.now();holdUiT=0;holdSaveT=0;holdRaf=requestAnimationFrame(holdLoop);
 const b=document.querySelector('[data-hold="'+k+'"]');if(b)b.classList.add('holding');
}
function holdStop(){
 if(!holdK)return;const k=holdK;holdK=null;cancelAnimationFrame(holdRaf);
 document.querySelectorAll('[data-hold].holding').forEach(b=>b.classList.remove('holding'));
 persist();try{HOLD[k].ui();updateUI()}catch(e){}
}
function holdLoop(now){
 if(!holdK)return;const h=HOLD[holdK],dt=Math.min(.1,Math.max(0,(now-holdLast)/1000));holdLast=now;
 if(!h.ok()||h.room()<=0||!$(h.modal).classList.contains('show')){holdStop();return}
 /* пока Ци нет, держишь дальше: поток продолжится, когда Ци восполнится (в зоне Ци это идёт само) */
 const n=Math.min(h.rate()*dt,Math.max(0,save.qi),h.room());
 if(n>0){save.qi-=n;h.add(n)}
 holdUiT+=dt;if(holdUiT>=.08){holdUiT=0;h.ui();updateUI()}
 holdSaveT+=dt;if(holdSaveT>=4){holdSaveT=0;persist()}
 holdRaf=requestAnimationFrame(holdLoop);
}
function bindHold(id,k){
 const b=$(id);if(!b)return;b.removeAttribute('onclick');b.onclick=null;b.dataset.hold=k;b.style.touchAction='none';b.style.userSelect='none';b.style.webkitUserSelect='none';
 b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}holdStart(k)});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,holdStop);
 b.addEventListener('contextmenu',e=>e.preventDefault());
}
bindHold('pillarDepositBtn','pillar');bindHold('pillarChanceQiBtn','pchance');bindHold('coreDepositBtn','core');bindHold('densDepositBtn','dens');

/* ---- окно культивации поверх арены ---- */
let cultFlash=0,cultHpLast=0,cultLiveT=0;
function openCultOnline(){
 const s=arenaState;if(!s||cultOnline)return;
 arenaMeditation.active&&interruptArenaMeditation();
 kb.keys.clear();s.dx=0;s.dy=0;if(typeof applyKbMove==='function')applyKbMove();
 cultOnline=true;cultHpLast=s.hp;cultFlash=0;cultLiveT=1;
 $('cult').classList.add('active','cult-online');$('cultHpPill').style.display='';$('cultLeaveBtn').textContent='← К арене';
 resizeCult();updateUI();drawCult();
 radarMove(true);
}
/* радар остаётся на виду поверх окна культивации (слева над панелью), чтобы видеть приближающихся врагов */
function radarMove(on){const r=document.getElementById('radarCv');if(!r)return;if(on){r.style.left='12px';r.style.right='auto';r.style.top='auto';r.style.bottom='98px';r.style.zIndex='90'}else{r.style.left='auto';r.style.right='12px';r.style.top='112px';r.style.bottom='auto';r.style.zIndex='58'}}
function closeCultOnline(){
 if(!cultOnline)return;holdStop();cultOnline=false;radarMove(false);
 $('cult').classList.remove('active','cult-online');$('cult').style.boxShadow='';$('cultHpPill').style.display='none';$('cultLeaveBtn').textContent='← Выход';
 closePillar();closeCore();closeTechnique();closeScrolls();closeColumns();
 persist();
}
function leaveCult(){cultOnline?closeCultOnline():goHome()}
/* вызывается из цикла арены каждый кадр, пока окно открыто */
function cultOnlineTick(dt){
 if(!cultOnline||!arenaState)return;const s=arenaState;
 if(s.hp<cultHpLast-.5)cultFlash=1;cultHpLast=s.hp;cultFlash=Math.max(0,cultFlash-dt*2.2);
 const low=s.hp/s.maxHp<.3?.25+.15*Math.sin(performance.now()/160):0,f=Math.max(cultFlash,low);
 $('cult').style.boxShadow=f>.01?'inset 0 0 '+Math.round(50+60*f)+'px rgba(255,50,50,'+(.65*f).toFixed(2)+')':'';
 cultLiveT+=dt;if(cultLiveT>=.25){cultLiveT=0;$('cultHp').textContent=Math.ceil(s.hp)+'/'+Math.ceil(s.maxHp);if(!holdK)updateUI()}
}
