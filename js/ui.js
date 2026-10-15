'use strict';
function confirmDialog(text,okLabel){
 return new Promise(res=>{
  $('confirmText').textContent=text;$('confirmOkBtn').textContent=okLabel||'Подтвердить';
  $('confirmModal').classList.add('show');
  const cleanup=v=>{$('confirmModal').classList.remove('show');ok.removeEventListener('click',onOk);cc.removeEventListener('click',onCancel);res(v)};
  const ok=$('confirmOkBtn'),cc=$('confirmCancelBtn');
  const onOk=()=>cleanup(true),onCancel=()=>cleanup(false);
  ok.addEventListener('click',onOk);cc.addEventListener('click',onCancel);
 });
}
async function openSettings(){$('settingsModal').classList.add('show')}
function closeSettings(){$('settingsModal').classList.remove('show')}
function fmt(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')}
function toggleStats(){$('statsCard').classList.toggle('open')}
function setTxt(el,txt){if(el.__t!==txt){el.textContent=txt;el.__t=txt}}
function setSkB(b,dim,frac,col){if(b.__d!==dim){b.classList.toggle('dim',dim);b.__d=dim}const ov=b.querySelector('.cdov'),v=frac>.001?'conic-gradient('+col+' '+(Math.min(1,frac)*100).toFixed(1)+'%,transparent 0)':'none';if(ov.__v!==v){ov.style.background=v;ov.__v=v}}
function updateArenaUI(){
 const s=arenaState,qi=save.qi;
 $('hpBar').style.width=Math.max(0,s.hp/s.maxHp*100)+'%';const qp=save.maxQi?Math.max(0,Math.min(100,qi/save.maxQi*100)):0;$('qiBar').style.width=qp+'%';setTxt($('qiBarText'),Math.floor(qi)+' / '+Math.floor(save.maxQi));$('arenaRewards').textContent=Math.floor(save.rewards);$('arenaRewards2').textContent=Math.floor(save.rewards2);$('enemyCount').textContent=s.enemies.filter(e=>e.hp>0).length;
 rebuildTechButtons();npcTick();
 for(const b of $('techCol').querySelectorAll('.tbtn')){
  const t=save.techniques[+b.dataset.i];if(!t)continue;const lab=b.querySelector('small'),cost=techCost(t);
  if(t.type==='qiArea'&&s.cdArea>0){setTxt(lab,TECH_SHORT.qiArea+'\n'+s.cdArea.toFixed(1)+' с');setSkB(b,true,s.cdArea/AREA_CD.qiArea,'rgba(0,0,0,.62)')}
  else if(t.type==='qiSingle'||t.type==='qiArea'){
   const chg=s.qiCharge&&s.qiCharge.type===t.type,heldSec=chg?Math.min(CHARGE_MAX,(performance.now()-s.qiCharge.start)/1000):0,f=chargeFactor(heldSec),liveCost=Math.max(1,Math.round(techCost(t)*f));
   setTxt(lab,TECH_SHORT[t.type]+'\n'+(chg?Math.round(f*100)+'% · '+liveCost+' Ци':Math.round(techCost(t)*CHARGE_MIN_F)+'-'+Math.round(techCost(t)*CHARGE_MAX_F)+' Ци'));
   setSkB(b,qi<Math.round(techCost(t)*CHARGE_MIN_F),chg?heldSec/CHARGE_MAX:0,'rgba(255,216,77,.6)');
  }
  else if(t.type==='heal'){const hl=s.heal&&s.heal.tech===t?s.heal:null;setTxt(lab,hl?'ЛЕЧИТ…':'ЛЕЧЕНИЕ\nдержи');setSkB(b,s.hp>=s.maxHp||qi<3,0,'rgba(141,255,184,.5)')}
  else if(t.type==='shield'){setTxt(lab,'ЩИТ\n'+cost+' Ци');setSkB(b,qi<cost&&s.shield<=0,s.shield>0?s.shield/Math.max(1,s.shieldMax):0,'rgba(99,233,255,.4)')}
  else if(t.type==='dodge'){setTxt(lab,'РЫВОК\n'+cost+' Ци');setSkB(b,qi<cost||s.dashCd>0,s.dashCd/(s.dashCdMax||.8),'rgba(0,0,0,.62)')}
  else if(t.type==='stun'&&s.cdStun>0&&!(s.channel&&s.channel.tech===t)){setTxt(lab,'СТАН\n'+s.cdStun.toFixed(1)+' с');setSkB(b,true,s.cdStun/AREA_CD.stun,'rgba(0,0,0,.62)')}
  else if(t.type==='stun'){const ch=s.channel&&s.channel.tech===t?s.channel:null;setTxt(lab,ch?'ДЕРЖИ '+Math.max(0,ch.dur-ch.t).toFixed(1)+'с':'СТАН\n'+cost+' Ци · '+castTime(t.cast||5).toFixed(1)+'с');setSkB(b,!ch&&qi<cost,ch?ch.t/ch.dur:0,'rgba(197,140,255,.6)')}
  else if(t.type==='qiShield'){setTxt(lab,'ЛИЧНЫЙ\n'+(s.qiShieldOn?'ВКЛ':'ВЫКЛ'));b.classList.toggle('on',!!s.qiShieldOn);setSkB(b,!s.qiShieldOn&&qi<1,0,'')}
 }
 const sh=s.shield>0;$('shieldBar').classList.toggle('show',sh);$('shieldFill').style.width=(sh?s.shield/Math.max(1,s.shieldMax)*100:0)+'%';
}
let tipTimer=0;
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1800)}
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id).classList.add('active')}
function goHome(){if(arenaState)saveArenaCheckpoint();stopArena();closeTechnique();closePillar();closeScrolls();closeColumns();closeModal();show('home');updateUI()}
function openCult(){show('cult');resizeCult();updateUI()}
function updateUI(){
 $('verText').textContent=BUILD_VERSION;$('homeQi').textContent=Math.floor(save.qi);$('homeStage').textContent=hasCore()?'Ядро':save.pillars+'/'+MAX_PILLARS;$('cultQi').textContent=Math.floor(save.qi);$('cultMax').textContent=Math.floor(save.maxQi);$('qiMax2').textContent=Math.floor(save.maxQi);$('starCount').textContent=save.stars;$('meridianCount').textContent=save.meridians;$('pillarCount').textContent=save.pillars;$('dantianStore').textContent=Math.floor(save.dantian);$('strVal').textContent=save.str.toFixed(1);$('spdVal').textContent=save.spd.toFixed(1);$('hpVal').textContent=Math.floor(save.health);$('qiVal').textContent=Math.floor(save.qi);$('cultRewards').textContent=Math.floor(save.rewards);$('cultRewards2').textContent=Math.floor(save.rewards2);$('zoomText').textContent=Math.round(save.zoom*100)+'%';$('castBonus').textContent=(.1*save.meridians).toFixed(1);$('regenVal').textContent=starRegen().toFixed(2);$('scrollOpenBtn').textContent='📜 Свитки'+(save.scrolls.length?' ('+save.scrolls.length+')':'');
  $('nextCost').textContent=starsLocked()?(hasCore()?'Новые звёзды закрыты (есть ядро)':'Новые звёзды закрыты (есть колонна)'):(save.stars<100?('Следующая звезда: '+currentStarCost()+' Ци'):'Все 100 звёзд');
 $('starBtn').style.display=starsLocked()?'none':'flex';$('starBtn').disabled=save.stars>=100;$('starBtnCost').textContent=save.stars<100?currentStarCost():'MAX';
 $('meridianBtn').disabled=save.stars<2||save.meridians>=200;$('merBtnCost').textContent=currentStarCost();
 $('pillarBtn').style.display=(!hasCore()&&(save.stars>=FIRST_PILLAR_STARS||save.pillars>0))?'flex':'none';$('coreBtn').style.display=(hasCore()||coreUnlocked())?'flex':'none';$('coreBtnTxt').textContent=hasCore()?'×'+save.coreCoef:'Ядро';$('pillarBtnTxt').textContent=save.pillars+'/'+MAX_PILLARS;$('pillarBtn').disabled=false;
 $('stageText').textContent=hasCore()?('Ядро · '+save.coreQuality+' ×'+save.coreCoef):save.pillars?('Колонн '+save.pillars+'/'+MAX_PILLARS+' · '+save.pillarQuality+' ×'+save.pillarCoef.toFixed(2)):'Формирование звёзд';
$('techOpenBtn').style.display='block';$('techOpenBtn').textContent='☯ Техника'+(save.techniques.length?' ('+save.techniques.length+')':'');drawCult();
}
function openEvent(title,text){$('modalTitle').textContent=title;$('modalText').textContent=text;$('modal').classList.add('show')}
function closeModal(){$('modal').classList.remove('show')}
function showBanner(text){const b=$('banner');b.textContent=text;b.classList.remove('show');void b.offsetWidth;b.classList.add('show')}
function cornerToast(text){const b=$('cornerToast');if(!b)return;b.textContent=text;b.classList.remove('show');void b.offsetWidth;b.classList.add('show')}
