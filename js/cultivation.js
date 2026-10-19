'use strict';
/* ===== body zones: built from the real silhouette of the body picture (normalized coords) ===== */
const ARM_SEAM=[[-.335,.16],[-.30,.16],[-.285,.235],[-.16,.235],[-.10,.255],[-.04,.30],[0,.334],[.04,.34],[.6,.34]];
function armSeamX(y){for(let i=1;i<ARM_SEAM.length;i++){const a=ARM_SEAM[i-1],b=ARM_SEAM[i];if(y<=b[0]){const t=(y-a[0])/(b[0]-a[0]||1);return a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,t))}}return .34}
function starZone(p){
 const x=p.x,y=p.y,ax=Math.abs(x);
 if(y<-.31&&ax<.16)return 'head';                                   // head, neck, top of trapezius (down to the collarbones)
 if(y>=-.335&&y<=.14&&ax>=armSeamX(y))return x<0?'leftHand':'rightHand';    // shoulders, arms, hands (seam follows the armpit gap)
 if(y<-.335)return 'head';
 if(y>=0)return x<0?'leftLeg':'rightLeg';                          // ноги начинаются у паха (ниже дантяня остаётся зона торса — для треугольника «Лечения»)
 return 'body';                                                     // torso between collarbones and pelvis
}
function zoneKey(z){return z==='head'?'head':z.includes('Hand')?'hand':z.includes('Leg')?'leg':'body'}
function zoneCounts(nodes){const c={head:0,leg:0,hand:0,body:0,leftHand:0,rightHand:0,leftLeg:0,rightLeg:0};for(const i of nodes){const p=save.starPts[i];if(!p)continue;const z=starZone(p);if(z==='head')c.head++;else if(z.includes('Leg')){c.leg++;c[z]++}else if(z.includes('Hand')){c.hand++;c[z]++}else c.body++}return c}
/* ===== columns (pillars) ===== */
function roman(n){return ['','I','II','III','IV','V'][n]||String(n)}
function openPillar(){renderPillar();$('pillarModal').classList.add('show')}
function closePillar(){$('pillarModal').classList.remove('show')}
/* цена колонны: Ци — как раньше (10 000 × номер); осколки — для колонн 2+ в 100 раз дешевле (100 × номер),
   для первой по-прежнему 10 000 осколков души. Ци и осколки можно сочетать: внесённая доля Ци уменьшает доплату осколками. */
function activeShardCost(){return save.pillars===0?10000:100*(save.pillars+1)}
function pillarQiFraction(){return Math.min(1,(save.pillarQi||0)/activeColumnCost())}
function pillarShardsLeft(){return Math.max(0,Math.ceil(activeShardCost()*(1-pillarQiFraction())-1e-9))}
function pillarBalance(){return save.pillars===0?save.rewards:save.rewards2}
function pillarChanceStep(){return Math.floor(Math.max(0,save.pillarChanceExtra||0)/10000)+1} /* какой по счёту шаг +10% сейчас покупается (1, 2, 3…) */
function pillarChanceCost(){return (save.pillars===0?100:10*(save.pillars+1))*pillarChanceStep()} /* осколки: база × номер шага (первая колонна: 100, 200, 300…; следующие: 20, 40, 60… / 30, 60, 90…) */
function pillarChanceQiCost(){return 10000*(save.pillars+1)*pillarChanceStep()} /* Ци: 10 000 × номер колонны × номер шага */
function renderPillar(){
 const done=save.pillars>=MAX_PILLARS,first=save.pillars===0,okStars=save.stars>=FIRST_PILLAR_STARS||!first;
 const qiCost=activeColumnCost(),left=pillarShardsLeft(),chance=pillarChance(save.pillarChanceExtra),bal=pillarBalance(),kind=first?' души':' 2 этапа',chCost=pillarChanceCost();
 let info;
 if(first)info=okStars?('Первая колонна доступна ('+save.stars+' ★).'):('Первая колонна открывается с '+FIRST_PILLAR_STARS+' звёзд (сейчас '+save.stars+').');
 else info='Колонн: <b>'+save.pillars+'/'+MAX_PILLARS+'</b>. Качество: <b>'+save.pillarQuality+'</b> ('+save.pillarStars+' ★ при формировании). Оплата — Ци, осколками 2 этапа или вместе.';
 if(!done&&okStars)info+=' Шанс успеха: <b>'+chance+'%</b>.'+(first?'':(' +'+save.pillarQiBonus+' Ци при успехе.'));
 $('pillarInfo').innerHTML=info;$('pillarHelp').textContent=hintPlaceholder('pillar');
 $('pillarProgressText').textContent=done?'Все колонны сформированы.':('Ци: '+fmt(save.pillarQi)+' / '+fmt(qiCost)+' · Осколки'+kind+': '+fmt(bal)+' · для полной оплаты не хватает '+fmt(left)+' осколков');
 $('pillarBarFill').style.width=(done?100:pillarQiFraction()*100)+'%';
 $('pillarDepositBtn').style.display='flex';
 $('pillarDepositBtn').disabled=done||!okStars||save.qi<PILLAR_STEP||save.pillarQi>=qiCost;
 $('pillarDepositBtn').textContent='Внести '+PILLAR_STEP+' Ци';
 $('pillarRewardsBtn').disabled=done||!okStars||left<=0||bal<left;
 $('pillarRewardsBtn').textContent=(save.pillarQi>0?'Доплатить ':'Оплатить ')+fmt(left)+' осколков'+kind;
 $('pillarFormBtn').style.display='flex';
 $('pillarFormBtn').disabled=done||!okStars||save.pillarQi<qiCost;
 $('pillarFormBtn').textContent='Сформировать за Ци ('+fmt(qiCost)+')';
 $('pillarChanceBtn').disabled=done||!okStars||chance>=90||bal<chCost;
 $('pillarChanceQiBtn').disabled=done||!okStars||chance>=90||save.qi<pillarChanceQiCost();$('pillarChanceQiBtn').textContent='Вложить '+fmt(pillarChanceQiCost())+' Ци (+10% шанс, сейчас '+chance+'%)';
 $('pillarChanceBtn').textContent='Вложить '+fmt(chCost)+' осколков'+kind+' (+10% шанс, сейчас '+chance+'%)';
}
function removeRandomStars(n){
 n=Math.min(n,save.starPts.length);if(n<=0)return 0;
 const idxs=[];while(idxs.length<n){const i=Math.floor(Math.random()*save.starPts.length);if(!idxs.includes(i))idxs.push(i)}
 idxs.sort((a,b)=>b-a);
 const removedSet=new Set(idxs);
 save.meridianEdges=save.meridianEdges.filter(([a,b])=>!removedSet.has(a)&&!removedSet.has(b));
 for(const idx of idxs){
  save.starPts.splice(idx,1);
  save.meridianEdges=save.meridianEdges.map(([a,b])=>[a>idx?a-1:a,b>idx?b-1:b]);
  save.maxQi=Math.max(100,save.maxQi-10);save.dantian=Math.max(0,save.dantian-1);save.str=Math.max(1,save.str-.9);save.spd=Math.max(1,save.spd-.1);save.health=Math.max(10,save.health-4);
 }
 save.stars=save.starPts.length;save.meridians=save.meridianEdges.length;save.qi=Math.min(save.qi,save.maxQi);
 return n;
}
async function attemptPillar(cost,payFn){
 payFn();
 const chance=pillarChance(save.pillarChanceExtra),wasFirst=save.pillars===0;
 save.pillarChanceExtra=0;save.pillarQi=0;
 if(Math.random()*100<chance){
  if(wasFirst){
   const q=pillarQualityFor(save.stars);save.pillarQuality=q.name;save.pillarCoef=q.coef;save.pillarQiBonus=q.qi;save.pillarStars=save.stars;placingStar=false;$('cultHint').classList.remove('show');
   save.pillars=1;save.stageLevel=2;
   save.maxQi+=save.pillarQiBonus||0;
   toast('Первая колонна сформирована · '+save.pillarQuality+'! Дальнейшие колонны — Ци или осколками второго этапа.');
   setTimeout(()=>playStageAnimation({kind:'col',success:true,title:'Переход на этап II',text:'Первая колонна сформирована · '+save.pillarQuality+'. Колонны растут внутри дань-тяня.'}),400);
  }else{
   save.pillars++;save.maxQi+=save.pillarQiBonus||0;
   toast('Колонна '+roman(save.pillars)+' сформирована · '+save.pillarQuality+'.');
  }
 }else{
  if(wasFirst){const lost=removeRandomStars(20);toast('Формирование первой колонны не удалось! Утрачено '+lost+' звёзд, вложенные ресурсы потеряны.')}
  else{if(save.pillars>0){save.maxQi=Math.max(100,save.maxQi-(save.pillarQiBonus||0));save.pillars--}toast('Формирование не удалось! Колонна разрушена. Осталось: '+save.pillars+'.')}
 }
 save.qi=Math.min(save.qi,save.maxQi);persist();renderPillar();
}
function contributePillarQi(){
 if(save.pillars>=MAX_PILLARS)return;
 const cost=activeColumnCost();
 if(save.pillars===0&&save.stars<FIRST_PILLAR_STARS)return toast('Первая колонна открывается с '+FIRST_PILLAR_STARS+' звёзд.');
 if(save.pillarQi>=cost)return toast('Накоплено достаточно Ци, можно формировать колонну.');
 if(save.qi<PILLAR_STEP)return toast('Нужно '+PILLAR_STEP+' Ци для взноса.');
 save.qi-=PILLAR_STEP;save.pillarQi=Math.min(cost,save.pillarQi+PILLAR_STEP);persist();renderPillar();
}
async function formPillarFromQi(){
 if(save.pillars>=MAX_PILLARS)return;
 const first=save.pillars===0,cost=activeColumnCost();
 if(save.pillarQi<cost)return toast('Нужно накопить '+fmt(cost)+' Ци.');
 if(first&&save.stars<FIRST_PILLAR_STARS)return;
 if(!await confirmDialog((first?'Сформировать первую колонну? ':'Сформировать колонну? ')+'Шанс успеха: '+pillarChance(save.pillarChanceExtra)+'%.'+(first?'':' При неудаче будет разрушена одна из уже сформированных колонн.'),'Сформировать'))return;
 attemptPillar(cost,()=>{save.pillarQi-=cost});
}
async function payPillarRewards(){
 const first=save.pillars===0,left=pillarShardsLeft(),bal=pillarBalance();
 if(save.pillars>=MAX_PILLARS||left<=0)return;
 if(first&&save.stars<FIRST_PILLAR_STARS)return;
 if(bal<left)return toast('Нужно '+fmt(left)+' осколков'+(first?' души':' 2 этапа')+'.');
 if(!await confirmDialog(first?('Сформировать первую колонну? Шанс успеха: '+pillarChance(save.pillarChanceExtra)+'%.'):('Сформировать колонну? Шанс успеха: '+pillarChance(save.pillarChanceExtra)+'%. При неудаче будет разрушена одна из уже сформированных колонн.'),'Сформировать'))return;
 attemptPillar(left,()=>{if(first)save.rewards-=left;else save.rewards2-=left});
}
function investPillarChanceQi(){
 const cost=pillarChanceQiCost();if(pillarChance(save.pillarChanceExtra)>=90)return;
 if(save.qi<cost)return toast('Нужно ещё '+fmt(cost-save.qi)+' Ци.');
 save.qi-=cost;save.pillarChanceExtra+=10000;persist();renderPillar();
}
function investPillarChance(){
 const first=save.pillars===0,bal=pillarBalance(),cost=pillarChanceCost();
 if(bal<cost)return toast('Нужно ещё '+fmt(cost)+' осколков'+(first?' души':' 2 этапа')+'.');
 if(first)save.rewards-=cost;else save.rewards2-=cost;
 save.pillarChanceExtra+=10000;persist();renderPillar();
}
function openColumns(){
 const el=$('columnsList');el.innerHTML='';
 for(let i=1;i<=save.pillars;i++){const d=document.createElement('div');d.className='scrollcard';
  d.innerHTML='<div class="sc-head"><b>КОЛОННА '+roman(i)+'</b><span class="sc-tag">+'+save.pillarQiBonus+' Ци</span></div><p>'+save.pillarQuality+(i===1?' · '+save.pillarStars+' ★ при формировании':' · наследует качество первой')+'</p>';el.appendChild(d)}
 $('columnsTotal').textContent='Коэффициент качества техник: ×'+currentQualityCoef().toFixed(2)+' · Множитель силы: ×'+colFactor(save.pillars,currentQualityCoef()).toFixed(2);
 $('columnsModal').classList.add('show');startDview('colView',()=>({core:false,columns:save.pillars}),()=>$('columnsModal').classList.contains('show'));
}
function closeColumns(){$('columnsModal').classList.remove('show')}
function cultDantianTap(x,y){
 if(placingStar&&starsLocked()){placingStar=false;$('cultHint').classList.remove('show');toast('После первой колонны новые звёзды создавать нельзя.');return true}
 if(placingStar||window.__meridianMode)return false;
 const r=$('cultBody').getBoundingClientRect(),dx=r.left+r.width/2+save.panX*save.zoom,dy=r.top+r.height/2-20+save.panY*save.zoom+DANTIAN_Y*520*save.zoom;
 if(Math.hypot(x-dx,y-dy)>Math.max(26,16*save.zoom))return false;
 if(hasCore())openCore();else if(save.pillars>0)openColumns();else toast('Дань-тянь — начало любой техники. Колонны появятся после первой колонны (нужно 50 звёзд).');
 return true;
}
function renderScrolls(){
 const el=$('scrollList');el.innerHTML='';
 for(const id in SCROLLS){
  const sc=SCROLLS[id],has=true,made=save.techniques.some(t=>t.type===sc.type);
  if(!(save.scrolls||[]).includes(id)&&!made)continue; /* неполученные свитки скрыты: только полученные или уже созданные самим игроком */
  const d=document.createElement('div');d.className='scrollcard'+(has?'':' locked');
  if(has){
   d.innerHTML='<div class="sc-head"><b>📜 '+sc.name+'</b><span class="sc-tag">'+(made?'техника создана':'не создана')+'</span></div>'
    +'<p><b>Геометрия:</b> минимум '+sc.minStars+' звёзд по цепочке от Дан-тяня; '+sc.geo+'. Звёзды тела и Дан-тяня подходят любые и никогда не мешают технике.</p>'
    +'<p><b>Действие:</b> '+sc.effect()+'</p>';
   const b=document.createElement('button');b.className='bigbtn';b.textContent=made?'Изменить технику':'Сформировать технику';b.onclick=()=>{closeScrolls();openTechnique()};d.appendChild(b);
  }else d.innerHTML='<div class="sc-head"><b>🔒 Неизвестный свиток</b><span class="sc-tag">выпадает из '+sc.from+'</span></div><p>Победи босса, чтобы получить инструкцию новой техники.</p>';
  el.appendChild(d);
 }
 if(!el.children.length)el.innerHTML='<p class="sc-empty">Свитков пока нет. Новые техники приходят от боссов и торговцев — тогда они появятся здесь.</p>';
 renderBlueprints(el);
}
const SLOTS={
 head:[[0,-.45],[.04,-.42],[-.04,-.39],[.03,-.36],[-.03,-.34],[0,-.32],[.06,-.40],[-.06,-.43],[.05,-.47],[-.05,-.46]],
 body:[[0,-.28],[.07,-.25],[-.07,-.22],[.07,-.19],[-.07,-.16],[.06,-.13],[-.06,-.11],[0,-.09],[.11,-.24],[-.11,-.20],[.11,-.16],[-.11,-.13]],
 rightHand:[[.36,-.26],[.39,-.20],[.41,-.14],[.42,-.08],[.44,-.02],[.45,.04],[.33,-.24],[.38,-.30],[.40,-.17],[.43,-.05]],
 leftHand:[[-.36,-.26],[-.39,-.20],[-.41,-.14],[-.42,-.08],[-.44,-.02],[-.45,.04],[-.33,-.24],[-.38,-.30],[-.40,-.17],[-.43,-.05]],
 rightLeg:[[.11,0],[.11,.06],[.12,.12],[.12,.18],[.11,.24],[.11,.30],[.10,.36],[.10,.42],[.15,.05],[.15,.15],[.14,.25],[.13,.35]],
 leftLeg:[[-.11,0],[-.11,.06],[-.12,.12],[-.12,.18],[-.11,.24],[-.11,.30],[-.10,.36],[-.10,.42],[-.15,.05],[-.15,.15],[-.14,.25],[-.13,.35]]
};
function dantianPoint(w,h){return{x:techOX(w),y:techCY(h)+DANTIAN_Y*520*techK(h)}}
let placingStar=false,meridianPick=null,dragId=null,lastX=0,lastY=0,pinchStart=0;
const cc=$('cultCanvas'),ctx=cc.getContext('2d');let cW=0,cH=0;
function resizeCult(){const r=$('cultBody').getBoundingClientRect();cW=cc.width=Math.max(1,Math.floor(r.width*devicePixelRatio));cH=cc.height=Math.max(1,Math.floor(r.height*devicePixelRatio));cc.style.width=r.width+'px';cc.style.height=r.height+'px';ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);drawCult()}
window.addEventListener('resize',()=>{if($('cult').classList.contains('active'))resizeCult();if($('arena').classList.contains('active'))resizeArena();if($('techModal').classList.contains('show'))resizeTech()});
const BODY_IMAGE_SRC='assets/body.webp';
const bodyImage=new Image();
bodyImage.src=BODY_IMAGE_SRC;
const bodyMask=document.createElement('canvas'), bodyMaskCtx=bodyMask.getContext('2d',{willReadFrequently:true});
let bodyMaskReady=false;
bodyImage.onload=()=>{
 bodyMask.width=bodyImage.naturalWidth; bodyMask.height=bodyImage.naturalHeight;
 bodyMaskCtx.clearRect(0,0,bodyMask.width,bodyMask.height);
 bodyMaskCtx.drawImage(bodyImage,0,0);
 bodyMaskReady=true;
 drawCult();
};
function bodyDisplaySize(){return {w:210,h:520}}
function worldToBodyPixel(x,y){
 const sz=bodyDisplaySize();
 return {x:(x+.5)*bodyImage.naturalWidth,y:(y+.5)*bodyImage.naturalHeight};
}
function bodyPointInside(xn,yn){
 if(!bodyMaskReady)return false;
 const p=worldToBodyPixel(xn,yn);
 if(p.x<0||p.y<0||p.x>=bodyMask.width||p.y>=bodyMask.height)return false;
 return bodyMaskCtx.getImageData(Math.floor(p.x),Math.floor(p.y),1,1).data[3]>20;
}
function segmentInsideBody(p,q,steps=12){
 for(let i=0;i<=steps;i++){const t=i/steps;if(!bodyPointInside(p.x+(q.x-p.x)*t,p.y+(q.y-p.y)*t))return false}
 return true;
}
function cultPointerToWorld(x,y){
 const r=$('cultBody').getBoundingClientRect();
 return {x:((x-r.left-r.width/2)/save.zoom-save.panX)/210,
         y:((y-r.top-r.height/2+20)/save.zoom-save.panY)/520};
}
function starOverlaps(p){return save.starPts.some(q=>Math.hypot((q.x-p.x)*210,(q.y-p.y)*520)<13)}
function primaryCultAction(){if(starsLocked())return toast('После первой колонны новые звёзды создавать нельзя.');const cost=starBaseCost();if(!canAfford(cost))return toast('Недостаточно ресурса. Нужно '+cost+' Ци/осколков.');placingStar=true;$('cultHint').classList.add('show');toast('Выбери свободную точку внутри тела')}
function startMeridianMode(){if(save.stars<2)return toast('Нужно минимум 2 звезды.');placingStar=false;$('cultHint').classList.remove('show');meridianPick=null;window.__meridianMode=true;toast('Выбери две звезды. Цена меридиана: '+meridianCost()+' (Ци и награды).');drawCult()}
function openScrolls(){renderScrolls();$('scrollModal').classList.add('show')}
function closeScrolls(){$('scrollModal').classList.remove('show')}
function cultStarScreenPoint(p){const r=$('cultBody').getBoundingClientRect();return{x:r.left+r.width/2+save.panX*save.zoom+p.x*210*save.zoom,y:r.top+r.height/2-20+save.panY*save.zoom+p.y*520*save.zoom}}
function handleCultTap(x,y){if(cultDantianTap(x,y))return;if(placingStar){const p=cultPointerToWorld(x,y);if(!bodyPointInside(p.x,p.y))return toast('Звезду можно ставить только внутри тела.');if(starOverlaps(p))return toast('Здесь уже есть звезда.');const cost=starCostAt(p),extra=cost-starBaseCost();if(!canAfford(cost))return toast('Недостаточно Ци и осколков души. Нужно '+cost+(extra>0?' (из них +'+extra+' за тесноту)':'')+'.');spendStarCost(cost);save.stars++;save.maxQi+=10;save.dantian+=1;save.str+=.9;save.spd+=.1;save.health+=4;save.starPts.push(p);placingStar=false;$('cultHint').classList.remove('show');persist();toast('Звезда сформирована'+(extra>0?' · цена '+cost+' (+'+extra+' за тесноту)':'')+'.');return}if(window.__meridianMode){let best=-1,bd=32;save.starPts.forEach((p,i)=>{const q=cultStarScreenPoint(p),d=Math.hypot(x-q.x,y-q.y);if(d<bd){bd=d;best=i}});if(best<0)return;if(meridianPick===null){meridianPick=best;toast('Первая звезда выбрана. Выбери вторую.');drawCult();return}if(best===meridianPick)return toast('Выбери другую звезду.');if(save.meridianEdges.some(e=>(e[0]===meridianPick&&e[1]===best)||(e[0]===best&&e[1]===meridianPick)))return toast('Этот меридиан уже существует.');if(!segmentInsideBody(save.starPts[meridianPick],save.starPts[best]))return toast('Меридиан должен идти только внутри тела. Выбери другую звезду.');const cost=meridianCost();if(!canAfford(cost))return toast('Недостаточно Ци и осколков души. Нужно '+cost+'.');spendStarCost(cost);save.meridianEdges.push([meridianPick,best]);save.meridians++;meridianPick=null;window.__meridianMode=false;persist();toast('Меридиан сформирован. Цена: '+cost+' (Ци и награды).');return}}
let cultPointers=new Map(), cultGestureStart=null, cultMoved=false, cultStartX=0, cultStartY=0;
cc.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 cc.setPointerCapture?.(e.pointerId);
 cultPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(cultPointers.size===2){
   const vals=[...cultPointers.values()],a=vals[0],b=vals[1];
   cultGestureStart={dist:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:save.zoom,panX:save.panX,panY:save.panY};
   cultMoved=true; return;
 }
 dragId=e.pointerId;lastX=e.clientX;lastY=e.clientY;cultStartX=e.clientX;cultStartY=e.clientY;cultMoved=false;
});
cc.addEventListener('pointermove',e=>{
 if(!cultPointers.has(e.pointerId))return;
 cultPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(cultPointers.size===2 && cultGestureStart){
   const vals=[...cultPointers.values()],a=vals[0],b=vals[1];
   const dist=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
   save.zoom=Math.max(.55,Math.min(3.5,cultGestureStart.zoom*dist/cultGestureStart.dist));
   const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,r=$('cultBody').getBoundingClientRect();
   save.panX=cultGestureStart.panX+(cx-(r.left+r.width/2))/save.zoom;
   save.panY=cultGestureStart.panY+(cy-(r.top+r.height/2-20))/save.zoom;
   drawCult(); return;
 }
 if(e.pointerId!==dragId)return;
 const dx=e.clientX-lastX,dy=e.clientY-lastY;
 if(Math.hypot(e.clientX-cultStartX,e.clientY-cultStartY)>7)cultMoved=true;
 lastX=e.clientX;lastY=e.clientY;
 save.panX+=dx/save.zoom;save.panY+=dy/save.zoom;drawCult();
});
cc.addEventListener('pointerup',e=>{
 const wasMoved=cultMoved;
 cultPointers.delete(e.pointerId);
 if(cultPointers.size<2)cultGestureStart=null;
 if(e.pointerId===dragId){
   dragId=null;
   if(!wasMoved)handleCultTap(e.clientX,e.clientY);
 }
});
cc.addEventListener('pointercancel',e=>{cultPointers.delete(e.pointerId);if(e.pointerId===dragId)dragId=null;if(cultPointers.size<2)cultGestureStart=null});
cc.addEventListener('wheel',e=>{e.preventDefault();zoomCult(e.deltaY<0?1.08:.92)},{passive:false});
function drawBody(c){
 const sz=bodyDisplaySize();
 c.save();
 c.globalAlpha=.92;
 if(bodyMaskReady)c.drawImage(bodyImage,-sz.w/2,-sz.h/2,sz.w,sz.h);
 else{
   c.fillStyle='#dcecff22';c.beginPath();c.ellipse(0,-185,18,22,0,0,7);c.fill();
   c.fillStyle='#dcecff18';c.beginPath();c.roundRect(-35,-150,70,210,28);c.fill();
 }
 c.globalAlpha=1;
 c.restore();
}
function drawCult(){
 if(!cW)return;
 const r=$('cultBody').getBoundingClientRect(),w=r.width,h=r.height;
 ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
 ctx.clearRect(0,0,w,h);
 ctx.save();
 ctx.translate(w/2+save.panX*save.zoom,h/2-20+save.panY*save.zoom);
 ctx.scale(save.zoom,save.zoom);
 ctx.strokeStyle='#ffffff0b';ctx.lineWidth=1/save.zoom;
 for(let y=-300;y<=300;y+=40){ctx.beginPath();ctx.moveTo(-210,y);ctx.lineTo(210,y);ctx.stroke()}
 for(let x=-210;x<=210;x+=40){ctx.beginPath();ctx.moveTo(x,-300);ctx.lineTo(x,300);ctx.stroke()}
 drawBody(ctx);
 ctx.strokeStyle='#f0b92ecc';ctx.lineWidth=1.2/save.zoom; /* меридианы того же золотого цвета, что и звёзды */
 for(const [a,b] of save.meridianEdges){
   const p=save.starPts[a],q=save.starPts[b];if(!p||!q)continue;
   ctx.beginPath();ctx.moveTo(p.x*210,p.y*520);ctx.lineTo(q.x*210,q.y*520);ctx.stroke();
 }
 save.starPts.forEach((p,i)=>{
    const selected=i===meridianPick,sx=p.x*210,sy=p.y*520;
    if(!starSprite(ctx,sx,sy,selected?11:8,i*.9,1)){ctx.fillStyle=selected?'#ffffff':'#ffd85b';ctx.beginPath();ctx.arc(sx,sy,selected?5:3.2,0,7);ctx.fill()}
    if(selected){ctx.strokeStyle='#fff';ctx.lineWidth=1.4/save.zoom;ctx.beginPath();ctx.arc(sx,sy,12,0,7);ctx.stroke()}
  });
 if(placingStar){ctx.strokeStyle='#ffd85b22';ctx.lineWidth=1/save.zoom;for(const q of save.starPts){ctx.beginPath();ctx.arc(q.x*210,q.y*520,STAR_CROWD_R,0,7);ctx.stroke()}}
 const dY=DANTIAN_Y*520;
 /* колонны стоят ВНУТРИ дань-тяня, а на его месте после слияния появляется ядро */
 if(!drawDantianMark(ctx,dY,performance.now()/1000)){ctx.fillStyle='#b56bff';ctx.shadowBlur=18;ctx.shadowColor='#b56bff';ctx.beginPath();ctx.arc(0,dY,6,0,7);ctx.fill();ctx.shadowBlur=0}
 ctx.fillStyle='#e7d3ff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(hasCore()?'ЯДРО':'ДАНЬ-ТЯНЬ',0,dY+(hasCore()?44:26));
 ctx.restore();
}
function zoomCult(k){save.zoom=Math.max(.55,Math.min(3.5,save.zoom*k));persist()}
