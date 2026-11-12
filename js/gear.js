'use strict';
/* ===== снаряжение и инвентарь =====
   save.gear = {own:[id], weapon:id|null, armor:id|null, pills:{id:кол-во}}  (новый ключ, остальное сохранение не тронуто)
   Оружие: +урон к удару кулаком (суммируется с уроном руки) и +радиус удара. Броня: срезает долю урона, получаемого от ближних ударов. */
const GEAR={
 sword1:{slot:'weapon',name:'Простой меч',icon:'🗡️',dmg:50,rng:10,tier:1,price:300,desc:'Базовый клинок: +50 урона к удару и немного больше радиуса.'},
 spear1:{slot:'weapon',name:'Простое копьё',icon:'🔱',dmg:35,rng:28,tier:1,price:300,desc:'Длиннее меча, но бьёт слабее: +35 урона и заметно больше радиуса.'},
 armor1:{slot:'armor',name:'Стёганый халат',icon:'🥋',cut:.2,tier:1,price:300,desc:'Срезает 20% урона, который наносят руки (ближние удары).'},
 sword2:{slot:'weapon',name:'Закалённый меч',icon:'⚔️',dmg:200,rng:14,tier:2,price:25,desc:'Закалённая сталь: +200 урона к удару.'},
 spear2:{slot:'weapon',name:'Закалённое копьё',icon:'🔱',dmg:140,rng:40,tier:2,price:25,desc:'+140 урона и большой радиус.'},
 armor2:{slot:'armor',name:'Пластинчатая броня',icon:'🛡️',cut:.4,tier:2,price:25,desc:'Срезает 40% урона от ближних ударов.'}
};
function gearSave(){const g=save.gear=save.gear||{};g.own=g.own||[];g.weapon??=null;g.armor??=null;g.pills=g.pills||{};return g}
function gearOwned(id){return gearSave().own.includes(id)}
function gearGive(id,force){const g=gearSave();if(!GEAR[id]||(!force&&g.own.includes(id)))return false;g.own.push(id);persist();return true}
/* убрать один экземпляр (продажа / выпадение при смерти); если больше нет — снять с персонажа */
function gearTake(id){const g=gearSave(),i=g.own.indexOf(id);if(i<0)return false;g.own.splice(i,1);if(!g.own.includes(id)){if(g.weapon===id)g.weapon=null;if(g.armor===id)g.armor=null}persist();return true}
function gearEquip(id){const g=gearSave(),it=GEAR[id];if(!it||!g.own.includes(id))return;g[it.slot]=id;persist()}
function gearUnequip(slot){gearSave()[slot]=null;persist()}
function gearWeapon(){const g=gearSave();return g.weapon&&GEAR[g.weapon]&&g.own.includes(g.weapon)?GEAR[g.weapon]:null}
function gearArmor(){const g=gearSave();return g.armor&&GEAR[g.armor]&&g.own.includes(g.armor)?GEAR[g.armor]:null}
function weaponDmg(){const w=gearWeapon();return w?w.dmg:0}
function weaponRange(){const w=gearWeapon();return w?w.rng:0}
function armorCut(){const a=gearArmor();return a?a.cut:0}
function openInv(){renderInv();$('invModal').classList.add('show')}
function closeInv(){$('invModal').classList.remove('show')}
function renderInv(){
 const g=gearSave(),el=$('invBody');el.innerHTML='';
 const w=gearWeapon(),a=gearArmor(),str=playerStr();
 const info=document.createElement('p');
 info.innerHTML='<b>Удар кулаком:</b> '+fmt(str)+(w?' + '+w.dmg+' (оружие) = <b>'+fmt(str+w.dmg)+'</b>':'')+' · <b>Радиус:</b> '+(48+(w?w.rng:0))+'<br><b>Срез ближнего урона:</b> '+Math.round(armorCut()*100)+'%';
 el.appendChild(info);
 const sect=(title,slot)=>{
  const h=document.createElement('h4');h.textContent=title;el.appendChild(h);
  const ids=[...new Set(g.own.filter(id=>GEAR[id]&&GEAR[id].slot===slot))];
  if(!ids.length){const p=document.createElement('p');p.className='sc-empty';p.textContent='Пусто';el.appendChild(p);return}
  for(const id of ids){
   const it=GEAR[id],on=g[slot]===id,d=document.createElement('div');d.className='scrollcard';
   d.innerHTML='<div class="sc-head"><b>'+it.icon+' '+it.name+'</b><span class="sc-tag">'+(on?'надето':'ур. '+it.tier)+(g.own.filter(x=>x===id).length>1?' · ×'+g.own.filter(x=>x===id).length:'')+'</span></div><p>'+it.desc+'</p>';
   const b=document.createElement('button');b.className='bigbtn'+(on?' secondary':'');b.textContent=on?'Снять':'Надеть';b.onclick=()=>{on?gearUnequip(slot):gearEquip(id);renderInv()};d.appendChild(b);el.appendChild(d);
  }
 };
 sect('Оружие (одно за раз)','weapon');sect('Броня','armor');
 const h=document.createElement('h4');h.textContent='Артефакты';el.appendChild(h);
 const p=document.createElement('p');p.className='sc-empty';p.textContent='Артефактов с Ци пока нет — их придумаем позже.';el.appendChild(p);
 if(typeof renderInvScr==='function')renderInvScr(el);
 if(typeof renderInvPills==='function')renderInvPills(el);
}
(function(){const m=document.createElement('div');m.id='invModal';m.className='modal';m.innerHTML='<div class="sheet"><h3>🎒 Инвентарь</h3><div id="invBody"></div><div class="row"><button class="bigbtn" onclick="closeInv()">Закрыть</button></div></div>';document.body.appendChild(m)})();

/* ===== снаряжение существ (мобы/боссы): e.gear={weapon,armor} ===== */
function gearScore(id){const it=GEAR[id];return it?(it.dmg||0)+(it.cut||0)*1000:0}
function entWeaponDmg(e){const w=e&&e.gear&&e.gear.weapon&&GEAR[e.gear.weapon];return w?w.dmg:0}
function entArmorCut(e){const a=e&&e.gear&&e.gear.armor&&GEAR[e.gear.armor];return a?a.cut:0}
function gearUseful(e,id){const it=GEAR[id];if(!it)return false;const cur=e.gear&&e.gear[it.slot];return !cur||gearScore(id)>gearScore(cur)}
function entEquip(e,id){const it=GEAR[id];if(!it)return;e.gear=e.gear||{weapon:null,armor:null};const old=e.gear[it.slot];e.gear[it.slot]=id;if(old&&arenaState&&!entGearHandoff(e,old))dropGear(e.x,e.y,old)}
/* в секте сменённая вещь не валяется на земле, а переходит ближайшему соученику, которому она полезнее его нынешней (цепочка: у того тоже освобождается вещь, но она слабее) */
function entGearHandoff(e,id){
 const s=arenaState;if(!s||e.sect==null)return false;let best=null,bd=1300;
 for(const q of s.enemies){if(q===e||q.sect!==e.sect||q.hp<=0||q.removed||q.animal||q.vessel||!gearUseful(q,id))continue;const d=Math.hypot(q.x-e.x,q.y-e.y);if(d<bd){bd=d;best=q}}
 if(!best)return false;entEquip(best,id);floatText(best.x,best.y-40,'🎁 от соученика','#ffd85b',12);return true}
function dropGear(x,y,id){const s=arenaState;if(!s||!GEAR[id])return;s.loot=s.loot||[];if(s.loot.length>=300)s.loot.shift();s.loot.push({x:x+rnd(-18,18),y:y+rnd(-18,18),k:3,item:id,v:1})}
/* при смерти существа с шансом 10% выпадает одна из его вещей */
function gearDeathDrop(v){
 if(!v.gear||Math.random()>=.1)return;const have=['weapon','armor'].filter(sl=>v.gear[sl]);if(!have.length)return;
 const sl=have[Math.floor(Math.random()*have.length)];dropGear(v.x,v.y,v.gear[sl]);v.gear[sl]=null;
}
/* то же для игрока: при гибели 10% потерять одну вещь (лежит на месте гибели, можно подобрать) */
function playerGearDrop(s){
 const g=gearSave();if(!g.own.length||Math.random()>=.1)return null;
 const id=g.own[Math.floor(Math.random()*g.own.length)];gearTake(id);dropGear(s.px,s.py,id);return id;
}
/* мобы ходят к Меняле и покупают снаряжение за накопленные осколки (цены те же, что у игрока) */
function mobBestBuy(e){
 let best=null;for(const id in GEAR){const it=GEAR[id],have=entShBal(e,it.tier===1?1:2);if(have<it.price||!gearUseful(e,id))continue;if(!best||gearScore(id)>gearScore(best))best=id}
 return best;
}
/* алхимия мобов: излишки осколков (сверх нужного на рост) идут на пилюли здоровья и Ци; в бою их пьют, когда худо */
function mobReserve(e,k){const S=e.stars||0;return k===1?(S<100?10+5*S:0):((e.columns||0)<MAX_PILLARS?COL_SH:0)}
function mobPillTotal(e){return Object.values(e.pills||{}).reduce((a,b)=>a+b,0)}
function mobPillPlan(e){
 if(typeof PILLS==='undefined'||mobPillTotal(e)>=4)return null;
 for(const id of ['hp2','qi2','hp1','qi1']){const p=PILLS[id],have=entShBal(e,p.k);if(have-mobReserve(e,p.k)>=p.n&&((e.pills&&e.pills[id])||0)<2)return id}
 return null;
}
function mobBuyPills(e){let id,n=0;while(n++<4&&(id=mobPillPlan(e))){const p=PILLS[id];entShPay(e,p.k,p.n);e.pills=e.pills||{};e.pills[id]=(e.pills[id]||0)+1;floatText(e.x,e.y-48,p.icon,'#ffffff',14)}}
function mobPillUse(e){
 if(!e.pills||e.hp<=0||!(e.foeId!=null||e.hostile)||(e.pillCd||0)>(arenaState?arenaState.t:0))return;
 const hurt=e.hp<e.maxHp*.4,dry=e.maxQi>0&&e.qi<e.maxQi*.2;if(!hurt&&!dry)return;
 const ids=hurt?['hp2','hp1']:['qi2','qi1'];
 for(const id of ids)if((e.pills[id]||0)>0){e.pills[id]--;const p=PILLS[id];if(hurt)e.hp=Math.min(e.maxHp,e.hp+p.v);else e.qi=Math.min(e.maxQi,e.qi+p.v);e.pillCd=(arenaState?arenaState.t:0)+4;floatText(e.x,e.y-40,p.icon,'#ffffff',14);return}
}
function mobShopRoll(){
 const s=arenaState;if(!s)return;
 for(const e of s.enemies){if(e.hp<=0||(e.stars||0)<=0||e.shopping||e.foeId!=null||Math.random()>.15)continue;if(mobBestBuy(e)||mobPillPlan(e)){e.shopping=true;e.shopT=0}}
}
function mobShopStep(e,dt){
 const n=NPCS[0];if(!n){e.shopping=false;return false}
 e.shopT=(e.shopT||0)+dt;
 if(e.shopT>120){e.shopping=false;return false}
 const d=Math.hypot(n.x-e.x,n.y-e.y);
 if(d<90){const id=mobBestBuy(e);if(id){const it=GEAR[id];entShPay(e,it.tier===1?1:2,it.price);entEquip(e,id);floatText(e.x,e.y-34,it.icon,'#ffffff',16)}mobBuyPills(e);e.shopping=false;return false}
 e.ang=Math.atan2(n.y-e.y,n.x-e.x);e.wanderAng=e.ang;e.wanderT=.5;moveEnemy(e,Math.cos(e.ang)*e.s*.7*dt,Math.sin(e.ang)*e.s*.7*dt);return true;
}
