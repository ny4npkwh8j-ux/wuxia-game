'use strict';
/* ===== лавка Менялы: обмен, техники, снаряжение, пилюли. Платим осколками: уровень 1 — осколки души, уровень 2 — осколки 2 этапа ===== */
let npcTab='exch';
const SHOP_TECH=[{id:'qiShield',d:400,a:10},{id:'stun',d:500,a:12},{id:'blade',d:600,a:15},{id:'pull',d:700,a:18},{id:'poison',d:800,a:20},{id:'mirage',d:900,a:22},{id:'repel',d:1200,a:30}];
const PILLS={
 hp1:{name:'Пилюля здоровья',icon:'❤️',kind:'hp',v:100,k:1,n:100,desc:'Мгновенно восстанавливает 100 здоровья.'},
 hp2:{name:'Большая пилюля здоровья',icon:'❤️‍🔥',kind:'hp',v:1000,k:2,n:10,desc:'Мгновенно восстанавливает 1000 здоровья.'},
 qi1:{name:'Пилюля Ци',icon:'💧',kind:'qi',v:100,k:1,n:100,desc:'Мгновенно восполняет 100 Ци.'},
 qi2:{name:'Большая пилюля Ци',icon:'🔷',kind:'qi',v:1000,k:2,n:10,desc:'Мгновенно восполняет 1000 Ци.'},
 rhp:{name:'Пилюля регенерации здоровья',icon:'🌿',kind:'rhp',v:300,sec:30,k:1,n:150,desc:'300 здоровья равномерно за 30 с.'},
 rqi:{name:'Пилюля регенерации Ци',icon:'🌀',kind:'rqi',v:300,sec:30,k:1,n:150,desc:'300 Ци равномерно за 30 с.'},
 pow:{name:'Пилюля силы',icon:'💪',kind:'pow',sec:60,k:1,n:300,desc:'+30% к силе (урон ударов и техник) на 60 с.'},
 grd:{name:'Пилюля стойкости',icon:'🧱',kind:'grd',sec:60,k:1,n:300,desc:'−25% получаемого урона на 60 с.'}
};
function shopPay(k,n){const key=k===1?'rewards':'rewards2';if(save[key]<n)return false;save[key]-=n;return true}
function costText(k,n){return fmt(n)+(k===1?' души':' 2 этапа')}
function canPay(k,n){return (k===1?save.rewards:save.rewards2)>=n}
function renderNpc(){
 $('npcBal').textContent='Осколки души: '+fmt(save.rewards)+' · Осколки 2 этапа: '+fmt(save.rewards2)+(save.rewards3>0?' · 3 этапа: '+fmt(save.rewards3):'');
 const el=$('npcList');el.innerHTML='';
 const tabs=document.createElement('div');tabs.className='row';tabs.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
 for(const [id,t] of [['exch','Обмен'],['tech','Техники'],['gear','Снаряжение'],['pill','Пилюли']]){const b=document.createElement('button');b.className='bigbtn'+(npcTab===id?'':' secondary');b.style.cssText='flex:1;min-width:80px;padding:9px 6px';b.textContent=t;b.onclick=()=>{npcTab=id;renderNpc()};tabs.appendChild(b)}
 el.appendChild(tabs);
 const box=document.createElement('div');el.appendChild(box);
 if(npcTab==='exch')renderExchange(box);else if(npcTab==='tech')renderShopTech(box);else if(npcTab==='gear')renderShopGear(box);else renderShopPills(box);
}
function shopCard(box,title,tag,desc,btns){
 const d=document.createElement('div');d.className='scrollcard';d.innerHTML='<div class="sc-head"><b>'+title+'</b><span class="sc-tag">'+tag+'</span></div>'+(desc?'<p>'+desc+'</p>':'');
 for(const [txt,ok,fn] of btns){const b=document.createElement('button');b.className='bigbtn';b.textContent=txt;b.disabled=!ok;b.onclick=fn;d.appendChild(b)}
 box.appendChild(d);
}
function renderShopTech(box){
 const p=document.createElement('p');p.textContent='За осколки души — описание техники (как её собрать). За осколки 2 этапа — готовая техника: игра сама подберёт лучший маршрут из твоих звёзд.';box.appendChild(p);
 for(const it of SHOP_TECH){
  const sc=SCROLLS[it.id];if(!sc)continue;const own=(save.scrolls||[]).includes(it.id),made=save.techniques.some(t=>t.type===sc.type);
  const btns=[];
  btns.push([own?'Описание куплено':'Купить описание · '+costText(1,it.d),!own&&canPay(1,it.d),()=>{if(!shopPay(1,it.d))return;grantScroll(it.id);toast('Свиток «'+sc.name+'» получен — смотри «Свитки».');persist();renderNpc()}]);
  btns.push([(made?'Улучшить маршрут · ':'Готовая техника · ')+costText(2,it.a),canPay(2,it.a),()=>{
   if(!findBestChain(it.id))return toast('Из твоих звёзд и меридиан пока нельзя собрать «'+sc.name+'». Добавь звёзд или меридианов.');
   if(!shopPay(2,it.a))return;grantScroll(it.id);const r=autoFormTechnique(it.id);
   toast(r.mode==='new'?'Техника «'+sc.name+'» установлена ('+r.n+' звёзд).':r.mode==='upgraded'?'Маршрут улучшен до '+r.n+' звёзд.':'Маршрут уже лучший ('+r.n+' звёзд) — осколки потрачены зря.');
   rebuildTechButtons(true);persist();renderNpc()}]);
  shopCard(box,'📜 '+(own||made?sc.name:'Техника «'+sc.name+'»'),made?'создана':own?'описание есть':'не изучена','',btns);
 }
}
function renderShopGear(box){
 for(const id in GEAR){const it=GEAR[id],k=it.tier===1?1:2,has=gearOwned(id);
  shopCard(box,it.icon+' '+it.name,'ур. '+it.tier,it.desc,[[has?'Куплено':'Купить · '+costText(k,it.price),!has&&canPay(k,it.price),()=>{if(!shopPay(k,it.price))return;gearGive(id);toast(it.name+' — в инвентаре (🎒 в меню культивации).');persist();renderNpc()}]])}
 renderSellGear(box);
}
function renderSellGear(box){
 const g=gearSave(),ids=[...new Set(g.own)].filter(id=>GEAR[id]);
 const h=document.createElement('h4');h.textContent='Продать (вполовину дешевле покупки)';box.appendChild(h);
 if(!ids.length){const p=document.createElement('p');p.className='sc-empty';p.textContent='Нечего продавать.';box.appendChild(p);return}
 for(const id of ids){const it=GEAR[id],k=it.tier===1?1:2,price=Math.floor(it.price/2),cnt=g.own.filter(x=>x===id).length,on=g.weapon===id||g.armor===id;
  shopCard(box,it.icon+' '+it.name,(on?'надето · ':'')+'×'+cnt,'',[['Продать · +'+costText(k,price),true,()=>{if(!gearTake(id))return;save[k===1?'rewards':'rewards2']+=price;toast('Продано: '+it.name);persist();renderNpc()}]])}
}
function pillCount(id){return (gearSave().pills[id]||0)}
/* Пилюля божественности (режим разработчика): цена 1 осколок души, раз в 3 часа реального времени; даёт по 1 000 000 осколков 1, 2 и 3 этапа, которые исчезают через 3 часа */
const DIVINE_MS=3*3600*1000,DIVINE_AMT=1000000;
function divineLeft(){return Math.max(0,(save.divineAt||0)+DIVINE_MS-Date.now())}
function divineTick(){
 if(save.divineAt&&Date.now()>=save.divineAt+DIVINE_MS&&save.divineGrant){
  save.rewards=Math.max(0,(save.rewards||0)-save.divineGrant[0]);save.rewards2=Math.max(0,(save.rewards2||0)-save.divineGrant[1]);save.rewards3=Math.max(0,(save.rewards3||0)-save.divineGrant[2]);
  save.divineGrant=null;persist();toast('Божественные осколки рассеялись.');if($('npcModal')&&$('npcModal').classList.contains('show'))renderNpc()}
}
setInterval(divineTick,5000);setTimeout(divineTick,500);
function divineUse(){
 if(divineLeft()>0)return toast('Пилюля будет доступна через '+Math.ceil(divineLeft()/60000)+' мин.');
 if(save.rewards<1)return toast('Нужен 1 осколок души.');
 divineTick();save.rewards-=1;save.rewards+=DIVINE_AMT;save.rewards2+=DIVINE_AMT;save.rewards3=(save.rewards3||0)+DIVINE_AMT;
 save.divineAt=Date.now();save.divineGrant=[DIVINE_AMT,DIVINE_AMT,DIVINE_AMT];persist();toast('Пилюля божественности принята: по '+fmt(DIVINE_AMT)+' осколков на 3 часа.');renderNpc();
}
function renderShopPills(box){
 {const l=divineLeft();shopCard(box,'🌟 Пилюля божественности',l>0?'через '+Math.ceil(l/60000)+' мин':'готова','Даёт 1 000 000 осколков души, 2 и 3 этапа. Исчезают через 3 часа. Раз в 3 часа.',[['Принять · 1 осколок души',l<=0&&save.rewards>=1,divineUse]])}
 for(const id in PILLS){const p=PILLS[id];
  shopCard(box,p.icon+' '+p.name,'есть: '+pillCount(id),p.desc,[['Купить · '+costText(p.k,p.n),canPay(p.k,p.n),()=>{if(!shopPay(p.k,p.n))return;gearSave().pills[id]=pillCount(id)+1;persist();renderNpc()}]])}
}
/* ---- применение пилюль (в арене) ---- */
function usePill(id){
 const s=arenaState,p=PILLS[id];if(!s||!p||pillCount(id)<1)return;
 if(p.kind==='hp'&&s.hp>=s.maxHp)return toast('Здоровье и так полное.');
 if(p.kind==='qi'&&save.qi>=save.maxQi)return toast('Ци и так полная.');
 gearSave().pills[id]=pillCount(id)-1;
 if(p.kind==='hp'){const g=Math.min(p.v,s.maxHp-s.hp);s.hp+=g;floatText(s.px,s.py-40,'+'+fmt(g),'#8dffb8',15)}
 else if(p.kind==='qi'){const g=Math.min(p.v,save.maxQi-save.qi);save.qi+=g;floatText(s.px,s.py-40,'+'+fmt(g)+' Ци','#63e9ff',14)}
 else if(p.kind==='rhp')s.regenHp={rate:p.v/p.sec,t:p.sec};
 else if(p.kind==='rqi')s.regenQi={rate:p.v/p.sec,t:p.sec};
 else if(p.kind==='pow')s.buffPow=p.sec;
 else if(p.kind==='grd')s.buffGuard=p.sec;
 burst(s.px,s.py,10,'#ffd85b',120,.5,2.4);persist();renderPillPop();
}
function pillPower(){const s=arenaState;return s&&s.buffPow>0?1.3:1}
function pillTick(dt){
 const s=arenaState;if(!s)return;
 if(s.regenHp&&s.regenHp.t>0){const d=Math.min(dt,s.regenHp.t);s.hp=Math.min(s.maxHp,s.hp+s.regenHp.rate*d);s.regenHp.t-=dt;if(s.regenHp.t<=0)s.regenHp=null}
 if(s.regenQi&&s.regenQi.t>0){const d=Math.min(dt,s.regenQi.t);save.qi=Math.min(save.maxQi,save.qi+s.regenQi.rate*d);s.regenQi.t-=dt;if(s.regenQi.t<=0)s.regenQi=null}
 if(s.buffPow>0)s.buffPow-=dt;if(s.buffGuard>0)s.buffGuard-=dt;
 const total=Object.values(gearSave().pills).reduce((a,b)=>a+b,0),btn=$('pillBtn');
 if(btn){const show=total>0;if(btn.__s!==show){btn.style.display=show?'flex':'none';btn.__s=show;if(!show)$('pillPop').style.display='none'}const t=String(total)+((s.buffPow>0||s.buffGuard>0||s.regenHp||s.regenQi)?'✦':'');if(btn.__t!==t){btn.__t=t;$('pillBtnTxt').textContent=t}}
}
function togglePillPop(){const el=$('pillPop');if(el.style.display==='block'){el.style.display='none';return}renderPillPop();el.style.display='block'}
function renderPillPop(){
 const el=$('pillPop'),g=gearSave();el.innerHTML='';
 const ids=Object.keys(PILLS).filter(id=>pillCount(id)>0);
 if(!ids.length){el.style.display='none';return}
 for(const id of ids){const p=PILLS[id],b=document.createElement('button');b.className='bigbtn secondary';b.style.cssText='margin:3px 0;padding:8px 6px;font-size:12px;width:100%';b.textContent=p.icon+' '+p.name+' ×'+pillCount(id);b.onclick=()=>usePill(id);el.appendChild(b)}
}
/* пилюли в инвентаре (меню культивации) — только список; применяются в бою */
function renderInvPills(el){
 const h=document.createElement('h4');h.textContent='Пилюли';el.appendChild(h);
 const ids=Object.keys(PILLS).filter(id=>pillCount(id)>0),p=document.createElement('p');p.className='sc-empty';
 p.textContent=ids.length?ids.map(id=>PILLS[id].name+' ×'+pillCount(id)).join(' · ')+'. Применяются в бою кнопкой 💊.':'Пока нет. Пилюли продаёт Меняла.';el.appendChild(p);
}
