'use strict';
/* ===== управление сектой: приказы главы-игрока, исключение, образ культивации и техники главы =====
   Меню открывается кнопкой «☯ Секта» (видна, пока игрок возглавляет секту) или из окна обмена с учеником.
   Приказы (sc.order): free — как обычно · follow — идут за главой и дерутся с тем, с кем дерётся он ·
   retreat — выходят из боя и уходят в зону секты (или к главе) · hunt — расходятся и ищут почти равных для боя ·
   «Сдать ресурсы» — разовое действие: все ученики отдают свои осколки главе.
   Образ главы: у моба-главы — его «узор» (по зерну pseed), у игрока — снимок расстановки его звёзд (sc.form.pts).
   Ученик, у которого уже 40+ звёзд (или совсем нет звёзд), культивирует по образу главы и растёт быстрее.
   Техники главы: ученики получают его набор (если хватает звёзд) и «версию школы» — техники бьют сильнее. ===== */
const FORM_FROM=40,FORM_SPEED=.7,TECH_VER=1.15;
const MOB_TECHS=['shield','dodge','qiSingle','qiArea','qiShield','stun','heal'];
const ORDER_NAME={free:'Свободно',follow:'Следовать',retreat:'Отступаем',hunt:'На охоту'};
function sameSect(a,b){return !!a&&!!b&&a.sect!=null&&a.sect===b.sect}
function techVer(e){return e&&e.tver!=null&&e.tver===e.sect?TECH_VER:1}
function formK(e){return e.fm!=null&&e.fm===e.sect&&((e.stars||0)>=FORM_FROM||e.fmFull)?FORM_SPEED:1}
function sectOrderOf(e){const sc=e.sect!=null?sectById(e.sect):null;return sc&&sc.pl&&sc.order?sc.order:'free'}
function sectOrdered(e){return sectOrderOf(e)!=='free'}
function sectRetreat(e){return sectOrderOf(e)==='retreat'}
/* ---- образ: узор звёзд главы-моба по зерну (одинаковый всегда) ---- */
function rng32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const FORM_BOXES=[[-.12,.12,-.5,-.33],[-.2,.2,-.33,.1],[-.44,-.18,-.3,.16],[.18,.44,-.3,.16],[-.2,.2,.1,.5]];
function inFormBody(x,y){return FORM_BOXES.some(b=>x>=b[0]&&x<=b[1]&&y>=b[2]&&y<=b[3])}
function formPts(seed,n){
 const r=rng32(seed),pts=[];let tries=0;
 while(pts.length<n&&tries++<n*80){const x=r()*.9-.45,y=r()-.5;if(!inFormBody(x,y))continue;if(pts.some(p=>Math.hypot((p[0]-x)*210,(p[1]-y)*520)<13))continue;pts.push([x,y])}
 return pts;
}
function sectFormPts(sc){
 if(sc.pl)return (sc.form&&sc.form.pts)||[];
 const m=SM.get(sc.id);if(!m)return[];if(m.pseed==null)m.pseed=1+Math.floor(Math.random()*2e9);
 return formPts(m.pseed,Math.min(100,Math.max(1,m.stars||1)));
}
/* ---- обучение: ученик перенимает образ и техники главы ---- */
function sectTeach(e,sc){
 if(!sc||e.sect!==sc.id||e.isBoss)return;
 if(sc.formOn&&e.fm!==sc.id){e.fm=sc.id;if(!((e.stars||0)>0))e.fmFull=true}
 if(sc.techOn&&sc.tech&&sc.tech.length){
  const S=e.stars||0;if(!e.techs)e.techs=[];let ch=false;
  for(const t of sc.tech){if(S<(MIN_STARS[t]||MOB_MIN[t]||1))continue;if(!e.techs.includes(t)){e.techs.push(t);ch=true}}
  if(ch){e.technique=e.techs[0]||null;if(e.techs.includes('qiShield'))e.qiShieldOn=true}
  e.tver=sc.id;
 }
}
/* раз в ~8 с (из sectTick): глава-моб сам учит учеников, гонит отставших, берёт новичков без звёзд; секта игрока учит по его команде */
function sectMentor(sc,m,mem){
 const s=arenaState;
 if(!sc.pl){
  sc.formOn=true;sc.techOn=true;sc.tech=(m.techs||[]).filter(t=>MOB_TECHS.includes(t));
  const pm=entPow(m);
  for(const q of mem){if(q===m||!((q.stars||0)>0))continue;if(entPow(q)/pm<.2){sectLeave(q);q.noSectT=s.t+240;sectNote('Глава секты «'+sc.name+'» изгнал слабого ученика',q)}}
  const nov=mem.filter(q=>q.sect===sc.id&&!((q.stars||0)>0)).length;
  if(nov<3&&mem.length<sectCapOf(sc,m)){
   for(const q of s.enemies){if(q.hp<=0||(q.stars||0)>0||q.lord||q.sect||q.foeId!=null||q.hostile||(q.noSectT||0)>s.t)continue;
    if(Math.hypot(q.x-m.x,q.y-m.y)>700)continue;sectJoin(q,sc);mem.push(q);sectNote('Глава секты «'+sc.name+'» взял в ученики новичка без звёзд',q);break}
  }
 }
 if(sc.formOn||sc.techOn)for(const q of mem)sectTeach(q,sc);
}
function teachForm(){
 const sc=playerSect();if(!sc||!sc.pl)return;
 if(!save.starPts.length)return toast('У тебя пока нет звёзд — образ передавать нечего.');
 sc.form={pts:save.starPts.map(p=>[+p.x.toFixed(3),+p.y.toFixed(3)])};sc.formOn=true;
 for(const q of sectMembers(sc))sectTeach(q,sc);
 chron('Глава передал секте «'+sc.name+'» свой образ культивации ('+sc.form.pts.length+' ★)');toast('☯ Образ передан: ученики с 40+ звёздами и новички культивируют по твоему узору.');renderSectMenu();
}
function teachTech(){
 const sc=playerSect();if(!sc||!sc.pl)return;
 const list=[...new Set(save.techniques.map(t=>t.type))].filter(t=>MOB_TECHS.includes(t));
 if(!list.length)return toast('У тебя нет техник, которые ученики могли бы перенять (щит, рывок, удары Ци, личный щит, оцепенение, лечение).');
 sc.tech=list;sc.techOn=true;for(const q of sectMembers(sc))sectTeach(q,sc);
 chron('Глава передал секте «'+sc.name+'» свои техники: '+list.map(techniqueName).join(', '));toast('☯ Техники переданы: '+list.map(techniqueName).join(', ')+'. Ученики бьют сильнее (версия школы).');renderSectMenu();
}
/* ---- приказы ---- */
function setSectOrder(o){
 const sc=playerSect();if(!sc||!sc.pl)return;
 sc.order=o;
 for(const m of sectMembers(sc)){m.hr=null;m.prey=null;
  if(o==='retreat'&&m.foeId!=null){const f=findEnt(m.foeId);if(f&&f.foeId===m.id)f.foeId=null;m.foeId=null;m.challenge=false}}
 toast('☯ Приказ: «'+ORDER_NAME[o]+'»');renderSectMenu();
}
function sectTribute(){
 const sc=playerSect();if(!sc||!sc.pl)return;let a=sc.t1||0,b=sc.t2||0,n=0;sc.t1=sc.t2=0;
 for(const m of sectMembers(sc)){const x=Math.floor(m.sh1||0),y=Math.floor(m.sh2||0);if(x>0||y>0){a+=x;b+=y;m.sh1=(m.sh1||0)-x;m.sh2=(m.sh2||0)-y;n++;burst(m.x,m.y,8,'#ffd85b',140,.6,2.4)}}
 save.rewards+=a;save.rewards2+=b;persist();
 if(a>0||b>0){chron('Ученики секты «'+sc.name+'» сдали ресурсы главе');toast('☯ Ресурсы сданы ('+n+' уч.): +'+fmt(a)+' души'+(b?', +'+fmt(b)+' 2 этапа':''))}else toast('У учеников пока нечего сдавать.');
 renderSectMenu();
}
function kickMember(e){
 const sc=playerSect(),s=arenaState;if(!sc||!sc.pl||!e||e.sect!==sc.id)return;
 sectLeave(e);e.noSectT=s.t+240;e.foeId=null;e.hostile=false;
 chron('Игрок исключил ученика (★'+(e.stars||0)+') из секты «'+sc.name+'»');toast('☯ Ученик исключён из секты.');
 if(typeof tradeId!=='undefined'&&tradeId===e.id)closeTrade();renderSectMenu();
}
/* шаг ученика по приказу главы-игрока; true — действие выполнено (обычные дела пропускаются) */
function sectOrderStep(e,dt){
 const sc=sectById(e.sect);if(!sc||!sc.pl||e.isBoss)return false;const od=sc.order;if(!od||od==='free')return false;
 const s=arenaState;e.cult=false;
 const go=(gx,gy,sp)=>{const ang=Math.atan2(gy-e.y,gx-e.x),nx=e.x+Math.cos(ang)*60,ny=e.y+Math.sin(ang)*60;if(forbidZone(e,nx,ny))return false;e.ang=ang;e.wanderAng=ang;moveEnemy(e,Math.cos(ang)*e.s*sp*dt,Math.sin(ang)*e.s*sp*dt);return true};
 if(od==='follow'){
  const a=(e.id*2.399)%TAU,rad=130+(e.id%3)*55,gx=s.px+Math.cos(a)*rad,gy=s.py+Math.sin(a)*rad,d=Math.hypot(gx-e.x,gy-e.y);
  if(d>45)go(gx,gy,d>700?1.15:d>250?.85:.5);
  return true;
 }
 if(od==='retreat'){
  const z=sectZone(e),gx=z?z.x:s.px,gy=z?z.y:s.py,d=Math.hypot(gx-e.x,gy-e.y),near=z?z.r*.5:220;
  if(d>near){go(gx,gy,.9);return true}
  if(z&&zoneStep(e,dt))return true;
  return true;
 }
 if(od==='hunt'){
  const lt=(e.stars||0)>0?nearestLoot(e,500):null;
  if(lt&&!forbidZone(e,lt.x,lt.y)){go(lt.x,lt.y,.7);return true}
  if(huntStep(e,dt,true))return true;
  e.hrT=(e.hrT||0)-dt;
  if(!e.hr||e.hrT<=0||Math.hypot(e.hr.x-e.x,e.hr.y-e.y)<70){
   for(let k=0;k<6;k++){const a=Math.random()*TAU,r=700+Math.random()*1100,x=Math.max(120,Math.min(s.world-120,s.px+Math.cos(a)*r)),y=Math.max(120,Math.min(s.world-120,s.py+Math.sin(a)*r));if(!forbidZone(e,x,y)){e.hr={x,y};break}}
   e.hrT=10+Math.random()*10;
  }
  if(e.hr)go(e.hr.x,e.hr.y,.6);
  return true;
 }
 return false;
}
/* ---- меню секты ---- */
(function(){
 const m=document.createElement('div');m.id='sectModal';m.className='modal';
 m.innerHTML='<div class="sheet"><h3 id="sectTitle">☯ Секта</h3><p id="sectInfo"></p><div id="sectBody"></div><div class="row"><button class="bigbtn" onclick="closeSectMenu()">Закрыть</button></div></div>';
 document.body.appendChild(m);
 const b=document.createElement('button');b.id='sectBtn';b.className='leave';b.style.cssText='position:absolute;right:62px;top:66px;z-index:60;display:none;width:auto;padding:0 10px';b.title='Меню секты';b.textContent='☯ Секта';b.onclick=openSectMenu;
 $('arena').appendChild(b);
 setInterval(()=>{if(m.classList.contains('show'))renderSectMenu(true)},1000);
})();
function openSectMenu(){if(!playerLeads())return toast('Меню доступно главе секты.');arenaMeditation.active&&interruptArenaMeditation();renderSectMenu();$('sectModal').classList.add('show')}
function closeSectMenu(){$('sectModal').classList.remove('show')}
function sectBtnTick(){const b=$('sectBtn');if(!b)return;const show=!!arenaState&&playerLeads()&&!cultOnline;if(b.__s!==show){b.style.display=show?'block':'none';b.__s=show}}
function drawSectForm(cv,sc,upto){
 const c=cv.getContext('2d'),W=cv.width,H=cv.height;c.clearRect(0,0,W,H);
 const X=x=>(x+.5)*W,Y=y=>(y+.55)*H*.95;
 c.fillStyle='rgba(120,150,200,.10)';for(const b of FORM_BOXES)c.fillRect(X(b[0]),Y(b[2]),(b[1]-b[0])*W,(b[3]-b[2])*H*.95);
 const pts=sectFormPts(sc);
 pts.forEach((p,i)=>{c.fillStyle=i<FORM_FROM?'rgba(190,200,220,.55)':'#ffd85b';c.beginPath();c.arc(X(p[0]),Y(p[1]),i<FORM_FROM?2:2.6,0,6.3);c.fill()});
}
let sectSig='';
function renderSectMenu(auto){
 const sc=playerSect();
 if(!sc||!sc.pl){closeSectMenu();return}
 const mem=sectMembers(sc).sort((a,b)=>entPow(b)-entPow(a)),cap=sectCapOf(sc,mem[0]||{stars:0}),od=sc.order||'free';
 const sig=[od,sc.formOn,sc.techOn,Math.floor(sc.t1||0),mem.map(q=>q.id+':'+(q.stars||0)+':'+(q.foeId!=null?1:0)+':'+(q.fm===sc.id?1:0)).join(',')].join('|');
 if(auto===true&&sig===sectSig)return;sectSig=sig;/* без лишних перерисовок, чтобы нажатия не терялись */
 $('sectTitle').textContent='Секта «'+sc.name+'»';
 $('sectInfo').textContent='Учеников: '+mem.length+' / '+cap+' · приказ: '+ORDER_NAME[od]+' · накоплено дани: '+fmt(sc.t1||0)+' души';
 const box=$('sectBody'),st=box.scrollTop;box.innerHTML='';
 const card=document.createElement('div');card.className='scrollcard';
 card.innerHTML='<div class="sc-head"><b>Приказы</b><span class="sc-tag">'+ORDER_NAME[od]+'</span></div><p>Следовать — идут за тобой и бьют того, с кем дерёшься ты. Отступаем — выходят из боя и уходят в зону секты. На охоту — расходятся и ищут почти равных врагов ради осколков.</p>';
 const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
 for(const [k,t] of [['follow','👣 Следовать'],['retreat','🏳 Отступаем'],['hunt','🗡 На охоту'],['free','↺ Свободно']]){
  const b=document.createElement('button');b.className='bigbtn';b.textContent=t;b.style.cssText='width:auto;flex:1 1 44%'+(od===k?';outline:2px solid #ffd85b':'');b.onclick=()=>setSectOrder(k);row.appendChild(b)}
 const bt=document.createElement('button');bt.className='bigbtn';bt.textContent='💰 Сдать ресурсы (все ученики)';bt.style.cssText='width:100%;flex:1 1 100%';bt.onclick=sectTribute;row.appendChild(bt);
 card.appendChild(row);box.appendChild(card);
 const n=(sc.form&&sc.form.pts&&sc.form.pts.length)||0,tl=sc.tech||[];
 const c2=document.createElement('div');c2.className='scrollcard';
 c2.innerHTML='<div class="sc-head"><b>Образ и техники главы</b><span class="sc-tag">'+(sc.formOn?'образ передан':'образ не передан')+'</span></div><p>Ученик с 40+ звёздами (или совсем без звёзд) строит звёзды по твоему узору и растёт на 30% быстрее. Переданные техники ученики применяют сильнее (+15%, «версия школы»). Серые точки — свободный путь (первые 40 ★), золотые — по образу.'+(n?' Сейчас в образе '+n+' ★.':'')+(sc.techOn&&tl.length?' Техники: '+tl.map(techniqueName).join(', ')+'.':'')+'</p>';
 const cv=document.createElement('canvas');cv.width=120;cv.height=200;cv.style.cssText='display:block;margin:4px auto;border:1px solid rgba(255,255,255,.12);border-radius:8px';c2.appendChild(cv);
 const r2=document.createElement('div');r2.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
 for(const [t,fn] of [[sc.formOn?'🔁 Обновить образ (мой узор)':'✨ Передать мой образ',teachForm],[sc.techOn?'🔁 Обновить техники':'📜 Передать мои техники',teachTech]]){const b=document.createElement('button');b.className='bigbtn';b.textContent=t;b.style.cssText='width:auto;flex:1 1 44%';b.onclick=fn;r2.appendChild(b)}
 c2.appendChild(r2);box.appendChild(c2);if(n)drawSectForm(cv,sc);else cv.style.display='none';
 const c3=document.createElement('div');c3.className='scrollcard';c3.innerHTML='<div class="sc-head"><b>Ученики</b><span class="sc-tag">'+mem.length+'</span></div>';
 for(const q of mem){
  const line=document.createElement('div');line.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0';
  const info=document.createElement('span');info.style.fontSize='13px';
  info.textContent='★'+(q.stars||0)+(q.core?' · ядро':q.columns?' · '+q.columns+' кол.':'')+(q.fm===sc.id&&formK(q)<1?' · по образу':'')+(q.tver===sc.id?' · школа':'')+(q.foeId!=null?' · в бою':'')+(q.sh1||q.sh2?' · осколки '+fmt(q.sh1||0)+'/'+fmt(q.sh2||0):'');
  const b=document.createElement('button');b.className='bigbtn';b.textContent='Исключить';b.style.cssText='width:auto;padding:4px 10px;font-size:12px';b.onclick=()=>kickMember(q);
  line.appendChild(info);line.appendChild(b);c3.appendChild(line)}
 if(!mem.length){const p=document.createElement('p');p.textContent='Учеников пока нет.';c3.appendChild(p)}
 box.appendChild(c3);box.scrollTop=st;
}
