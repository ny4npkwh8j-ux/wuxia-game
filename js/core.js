'use strict';
/* ===== ядро (3-й этап): создаётся из колонн, колонны при этом рассыпаются ===== */
function hasCore(){return (save.coreCoef||0)>0}
function starsLocked(){return save.pillars>=1||hasCore()}
function coreUnlocked(){return !hasCore()&&save.pillars>=CORE_MIN_PILLARS}
function coreQiFraction(){return Math.min(1,(save.coreDeposit||0)/CORE_QI_COST)}
function coreShardsLeft(){return Math.max(0,Math.ceil(CORE_SHARD_COST*(1-coreQiFraction())-1e-9))}
function coreChance(){return coreChanceFor(save.pillars,save.coreChanceExtra||0)}
const CORE_DEPOSIT_STEP=1000;

/* ---------- отрисовка: кадры из листов и процедурные колонны ---------- */
function sheetFrame(key,i){const o=SPR[key];if(!o||!o.ok)return null;const n=5,fw=o.img.naturalWidth/n;return{img:o.img,sx:Math.round(fw*i),sy:0,sw:Math.round(fw),sh:o.img.naturalHeight}}
function drawFrameCover(c,key,i,W,H,al){const f=sheetFrame(key,i);if(!f)return false;const k=Math.max(W/f.sw,H/f.sh),w=f.sw*k,h=f.sh*k;c.globalAlpha=al;c.drawImage(f.img,f.sx,f.sy,f.sw,f.sh,(W-w)/2,(H-h)/2,w,h);c.globalAlpha=1;return true}
const COL_LAYOUT={1:[[0,1]],2:[[-.5,.9],[.5,.9]],3:[[-.8,.85],[0,1],[.8,.85]],4:[[-1.15,.8],[-.4,.95],[.4,.95],[1.15,.8]],5:[[-1.5,.75],[-.75,.9],[0,1],[.75,.9],[1.5,.75]]};
function glowDisc(c,x,y,r,col,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=a;c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,7);c.fill();c.globalAlpha=1}
/* n колонн вокруг точки (x,y); u — ширина «шага» в пикселях, hh — высота колонны */
function drawColumnsAt(c,n,x,y,u,hh,t,alpha=1){
 const L=COL_LAYOUT[Math.max(1,Math.min(5,n))],o=SPR.column;
 for(let i=0;i<L.length&&i<n;i++){const px=x+L[i][0]*u,h=hh*L[i][1],w=h*.26;
  c.globalCompositeOperation='lighter';glowDisc(c,px,y-h*.45,h*.5,'#ffcf5a',(.35+.12*Math.sin(t*2+i))*alpha);
  if(o&&o.ok){c.globalAlpha=alpha;c.drawImage(o.img,px-w/2,y-h,w,h);c.globalAlpha=1}
  else{c.globalCompositeOperation='source-over';c.fillStyle='#ffd45b';c.globalAlpha=alpha;c.fillRect(px-w/4,y-h,w/2,h);c.globalAlpha=1}
  c.globalCompositeOperation='source-over'}
}
function drawCoreAt(c,x,y,sz,t,alpha=1){
 const o=SPR.core,p=1+.05*Math.sin(t*2.4);
 c.globalCompositeOperation='lighter';glowDisc(c,x,y,sz*.9*p,'#ffb84a',.55*alpha);
 if(o&&o.ok){const h=sz*p,w=h*o.img.naturalWidth/o.img.naturalHeight;c.globalAlpha=alpha;c.drawImage(o.img,x-w/2,y-h/2,w,h);c.globalAlpha=1}
 else{c.fillStyle='#ffe08a';c.globalAlpha=alpha;c.beginPath();c.arc(x,y,sz*.3,0,7);c.fill();c.globalAlpha=1}
 c.globalCompositeOperation='source-over';
}
function drawDantianScene(cv,t,mode){
 const W=cv.clientWidth||196,H=cv.clientHeight||234,d=Math.min(2,devicePixelRatio||1);
 if(cv.width!==Math.round(W*d)){cv.width=Math.round(W*d);cv.height=Math.round(H*d)}
 const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,W,H);c.fillStyle='#060a18';c.fillRect(0,0,W,H);
 if(mode.core){drawFrameCover(c,'coreAnim',4,W,H,1);drawCoreAt(c,W/2,H*.52,H*.62,t)}
 else{drawFrameCover(c,'colAnim',0,W,H,1);glowDisc(c,W/2,H*.7,W*.5,'#8a5cff',.35);drawColumnsAt(c,mode.columns,W/2,H*.72,W*.2,H*.62,t)}
}
function startDview(id,getMode,isOpen){
 const cv=$(id);if(!cv)return;const tok=cv.__tok=(cv.__tok||0)+1;
 (function loop(){if(cv.__tok!==tok||!isOpen())return;drawDantianScene(cv,performance.now()/1000,getMode());requestAnimationFrame(loop)})();
}
/* метка в дань-тяне на экране культивации; true — если нарисовано */
function drawDantianMark(c,dY,t){
 if(hasCore()){drawCoreAt(c,0,dY,74,t);return true}
 if(save.pillars>0){
  c.globalCompositeOperation='lighter';glowDisc(c,0,dY,30,'#8a5cff',.55);c.globalCompositeOperation='source-over';
  c.fillStyle='#b56bff';c.beginPath();c.arc(0,dY+4,5,0,7);c.fill();
  drawColumnsAt(c,save.pillars,0,dY+10,11,34,t);return true}
 return false;
}
setInterval(()=>{if($('cult').classList.contains('active')&&(hasCore()||save.pillars>0))drawCult()},100);

/* ---------- окно ядра ---------- */
function openCore(){renderCore();$('coreModal').classList.add('show');startDview('coreView',()=>({core:hasCore(),columns:Math.max(1,save.pillars)}),()=>$('coreModal').classList.contains('show'))}
function closeCore(){$('coreModal').classList.remove('show')}
function renderCore(){
 if(hasCore()){
  $('coreForm').style.display='none';
  $('coreInfo').innerHTML='Ядро: <b>'+save.coreQuality+'</b> · множитель <b>×'+save.coreCoef+'</b> ко всему: здоровье, сила, Ци, мощь техник и стойкость. Колонны слились в ядро.';return}
 $('coreForm').style.display='block';
 const sc=save.pillars*(save.pillarCoef||1),q=coreQualityFor(save.pillars,save.pillarCoef||1),chance=coreChance(),bal=save.rewards2,left=coreShardsLeft(),canQ=coreUnlocked();
 $('coreInfo').innerHTML=canQ?('Колонн: <b>'+save.pillars+'</b> · качество колонн ×'+(save.pillarCoef||0).toFixed(2)+'. Ожидаемое ядро: <b>'+q.name+'</b> (×'+q.coef+'). Шанс успеха: <b>'+chance+'%</b>.'+hintText('core')):('Ядро открывается после '+CORE_MIN_PILLARS+'-й колонны.');
 $('coreBarFill').style.width=(coreQiFraction()*100)+'%';
 $('coreProgress').textContent='Ци: '+fmt(save.coreDeposit||0)+' / '+fmt(CORE_QI_COST)+' · Осколки 2 этапа: '+fmt(bal)+' · не хватает '+fmt(left)+' осколков';
 $('coreDepositBtn').disabled=!canQ||save.qi<100||(save.coreDeposit||0)>=CORE_QI_COST;$('coreDepositBtn').textContent='Внести '+fmt(CORE_DEPOSIT_STEP)+' Ци';
 $('coreFormBtn').disabled=!canQ||(save.coreDeposit||0)<CORE_QI_COST;$('coreFormBtn').textContent='Сформировать за Ци ('+fmt(CORE_QI_COST)+')';
 $('coreRewardsBtn').disabled=!canQ||left<=0||bal<left;$('coreRewardsBtn').textContent=((save.coreDeposit||0)>0?'Доплатить ':'Оплатить ')+fmt(left)+' осколков';
 $('coreChanceBtn').disabled=!canQ||chance>=90||bal<CORE_CHANCE_UNIT;$('coreChanceBtn').textContent='Вложить '+fmt(CORE_CHANCE_UNIT)+' осколков (+10% шанс, сейчас '+chance+'%)';
}
function contributeCoreQi(){
 if(!coreUnlocked())return;const need=CORE_QI_COST-(save.coreDeposit||0);if(need<=0)return;
 const n=Math.min(Math.floor(save.qi),need,CORE_DEPOSIT_STEP);if(n<100)return toast('Нужно хотя бы 100 Ци.');
 save.qi-=n;save.coreDeposit=(save.coreDeposit||0)+n;persist();renderCore();
}
async function formCoreFromQi(){
 if(!coreUnlocked()||(save.coreDeposit||0)<CORE_QI_COST)return;
 if(!await confirmDialog('Создать ядро? Шанс успеха: '+coreChance()+'%. Колонны будут уничтожены, при неудаче — все.','Создать'))return;
 attemptCore(()=>{save.coreDeposit-=CORE_QI_COST});
}
async function payCoreRewards(){
 const left=coreShardsLeft();if(!coreUnlocked()||left<=0)return;
 if(save.rewards2<left)return toast('Нужно '+fmt(left)+' осколков 2 этапа.');
 if(!await confirmDialog('Создать ядро? Шанс успеха: '+coreChance()+'%. Колонны будут уничтожены, при неудаче — все.','Создать'))return;
 attemptCore(()=>{save.rewards2-=left;save.coreDeposit=0});
}
function investCoreChance(){
 if(!coreUnlocked()||coreChance()>=90)return;
 if(save.rewards2<CORE_CHANCE_UNIT)return toast('Нужно '+CORE_CHANCE_UNIT+' осколков 2 этапа.');
 save.rewards2-=CORE_CHANCE_UNIT;save.coreChanceExtra=(save.coreChanceExtra||0)+CORE_CHANCE_UNIT;persist();renderCore();
}
function attemptCore(payFn){
 payFn();const chance=coreChance(),n=save.pillars,q=coreQualityFor(n,save.pillarCoef||1);
 save.coreDeposit=0;save.coreChanceExtra=0;
 closeCore();
 if(Math.random()*100<chance){
  /* бонус Ци колонн исчезает вместе с ними; ядро умножает всё */
  save.maxQi=Math.max(100,save.maxQi-n*(save.pillarQiBonus||0))*q.coef;save.health*=q.coef;
  save.coreCoef=q.coef;save.coreQuality=q.name;save.pillars=0;save.stageLevel=3;save.qi=Math.min(save.qi,save.maxQi);
  persist();updateUI();
  playStageAnimation({kind:'core',success:true,title:'Ядро: '+q.name,text:'Колонны рассыпались и сплавились в ядро. Всё стало сильнее в ×'+q.coef+' раз.',onClose:openCore});
 }else{
  save.pillars=0;save.maxQi=Math.max(100,save.maxQi-n*(save.pillarQiBonus||0));save.qi=Math.min(save.qi,save.maxQi);
  persist();updateUI();
  playStageAnimation({kind:'core',success:false,title:'Ядро не удалось',text:'Ресурсы потеряны, все колонны разрушены.',onClose:()=>{}});
 }
}

/* ---------- анимация перехода между стадиями ---------- */
let stageAnimState=null;
function playStageAnimation(o){
 const cv=$('stageAnimCv'),dur=o.kind==='core'?(o.success?7:5):5;
 stageAnimState={o,t0:performance.now(),dur,done:false,parts:[],seed:Math.random()};
 $('stageAnimTitle').textContent=' ';$('stageAnimText').textContent=' ';$('stageAnimBtn').textContent='Пропустить';
 $('stageAnim').classList.add('show');
 const st=stageAnimState;
 (function loop(){
  if(stageAnimState!==st)return;
  const t=(performance.now()-st.t0)/1000;
  drawStageAnim(cv,st,Math.min(t,dur));
  if(t>=dur&&!st.done)finishStageAnim();
  requestAnimationFrame(loop);
 })();
}
function finishStageAnim(){
 const st=stageAnimState;if(!st||st.done)return;st.done=true;
 $('stageAnimTitle').textContent=st.o.title||' ';$('stageAnimText').textContent=st.o.text||' ';$('stageAnimBtn').textContent='Продолжить';
}
function stageAnimBtnClick(){if(!stageAnimState)return;if(!stageAnimState.done){stageAnimState.t0-=1e6;finishStageAnim();return}closeStageAnim()}
function closeStageAnim(){const st=stageAnimState;stageAnimState=null;$('stageAnim').classList.remove('show');if(st&&st.o.onClose)st.o.onClose()}
function drawStageAnim(cv,st,t){
 const W=cv.clientWidth||196,H=cv.clientHeight||234,d=Math.min(2,devicePixelRatio||1),o=st.o;
 if(cv.width!==Math.round(W*d)){cv.width=Math.round(W*d);cv.height=Math.round(H*d)}
 const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.fillStyle='#060a18';c.fillRect(0,0,W,H);
 const cx=W/2,cy=H*.55,rnd=i=>{const x=Math.sin((i+1)*12.9898+st.seed*78.233)*43758.5453;return x-Math.floor(x)};
 if(o.kind==='core'){
  /* кадры листа: 0..4 — колонны → ядро; успех проходит все, неудача останавливается на 2 */
  const maxF=o.success?4:2,tEnd=o.success?4.4:2.2,f=Math.min(maxF,t/tEnd*maxF),i0=Math.floor(f),fr=f-i0;
  drawFrameCover(c,'coreAnim',i0,W,H,1);if(i0<maxF)drawFrameCover(c,'coreAnim',i0+1,W,H,fr);
  c.globalCompositeOperation='lighter';
  if(o.success){
   for(let i=0;i<26;i++){const a=rnd(i)*6.283,r0=W*(.5+rnd(i+50)*.4),k=Math.max(0,Math.min(1,(t-.8)/3.6)),r=r0*(1-k*k);const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.8;if(k<1)glowDisc(c,x,y,6,'#ffd45b',.9)}
   if(t>4.4){const k=(t-4.4)/2.6,fl=Math.max(0,1-Math.abs(t-4.6)/.5);glowDisc(c,cx,cy,H*.5*(1+k*.1),'#ffe9a8',.25+.5*fl)}
  }else{
   for(let i=0;i<22;i++){const a=rnd(i)*6.283,k=Math.max(0,(t-1.6)/3.4),r=k*W*.6*(.4+rnd(i+9));glowDisc(c,cx+Math.cos(a)*r,cy+Math.sin(a)*r,5,'#ff8a5a',Math.max(0,.9-k))}
  }
  c.globalCompositeOperation='source-over';
  if(!o.success){c.fillStyle='rgba(0,0,0,'+Math.min(.55,Math.max(0,(t-2.5)/4))+')';c.fillRect(0,0,W,H)}
 }else{
  const k=Math.min(1,t/3.5),i0=Math.min(3,Math.floor(k*4)),fr=k*4-i0;
  drawFrameCover(c,'colAnim',i0,W,H,1);drawFrameCover(c,'colAnim',Math.min(4,i0+1),W,H,fr);
  c.globalCompositeOperation='lighter';
  for(let i=0;i<20;i++){const x=W*(.2+rnd(i)*.6),y=H*(.9-((t*.18+rnd(i+30))%1)*.7);glowDisc(c,x,y,5,'#b890ff',.7)}
  c.globalCompositeOperation='source-over';
 }
}

/* ---------- подсказки по культивации: выпадают из противников ---------- */
const HINTS={
 pillar:{name:'Колонны',text:'Каждая следующая колонна дороже предыдущей и формируется не гарантированно — есть шанс неудачи. Первую можно оплатить Ци (по 500) или осколками души; остальные — Ци или осколками второго этапа. Лишние осколки повышают шанс.'},
 core:{name:'Ядро',text:' Колонны рассыпаются на осколки и сплавляются в ядро — чем больше и лучше колонны, тем выше шанс и качество. При неудаче ресурсы теряются, а все колонны разрушаются.'}
};
function hasHint(id){return (save.hints||[]).includes(id)}
function hintText(id){return hasHint(id)?HINTS[id].text:''}
function hintPlaceholder(id){return hasHint(id)?HINTS[id].text:'🔒 Подсказка «'+HINTS[id].name+'» не найдена — выпадает из противников.'}
function dropHint(e){
 const left=Object.keys(HINTS).filter(k=>!hasHint(k));if(!left.length)return;
 const chance=e.isBoss?1:Math.min(.08,.01+(e.stars||0)/2000);
 if(Math.random()>=chance)return;
 const id=left[Math.floor(Math.random()*left.length)];
 save.hints=(save.hints||[]).concat(id);persist();
 showBanner('💡 Подсказка по культивации\n«'+HINTS[id].name+'»\nОткрыта в меню формирования');
}
