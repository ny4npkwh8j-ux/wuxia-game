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
 if(typeof renderInvPills==='function')renderInvPills(el);
}
(function(){const m=document.createElement('div');m.id='invModal';m.className='modal';m.innerHTML='<div class="sheet"><h3>🎒 Инвентарь</h3><div id="invBody"></div><div class="row"><button class="bigbtn" onclick="closeInv()">Закрыть</button></div></div>';document.body.appendChild(m)})();

/* ===== снаряжение существ (мобы/боссы): e.gear={weapon,armor} ===== */
function gearScore(id){const it=GEAR[id];return it?(it.dmg||0)+(it.cut||0)*1000:0}
function entWeaponDmg(e){const w=e&&e.gear&&e.gear.weapon&&GEAR[e.gear.weapon];return w?w.dmg:0}
function entArmorCut(e){const a=e&&e.gear&&e.gear.armor&&GEAR[e.gear.armor];return a?a.cut:0}
function gearUseful(e,id){const it=GEAR[id];if(!it)return false;const cur=e.gear&&e.gear[it.slot];return !cur||gearScore(id)>gearScore(cur)}
function entEquip(e,id){const it=GEAR[id];if(!it)return;e.gear=e.gear||{weapon:null,armor:null};const old=e.gear[it.slot];e.gear[it.slot]=id;if(old&&arenaState)dropGear(e.x,e.y,old)}
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
 let best=null;for(const id in GEAR){const it=GEAR[id],have=it.tier===1?(e.sh1||0):(e.sh2||0);if(have<it.price||!gearUseful(e,id))continue;if(!best||gearScore(id)>gearScore(best))best=id}
 return best;
}
function mobShopRoll(){
 const s=arenaState;if(!s)return;
 for(const e of s.enemies){if(e.hp<=0||(e.stars||0)<=0||e.shopping||e.foeId!=null||Math.random()>.15)continue;if(mobBestBuy(e)){e.shopping=true;e.shopT=0}}
}
function mobShopStep(e,dt){
 const n=NPCS[0];if(!n){e.shopping=false;return false}
 e.shopT=(e.shopT||0)+dt;
 if(e.shopT>120){e.shopping=false;return false}
 const d=Math.hypot(n.x-e.x,n.y-e.y);
 if(d<90){const id=mobBestBuy(e);if(id){const it=GEAR[id];if(it.tier===1)e.sh1-=it.price;else e.sh2-=it.price;entEquip(e,id);floatText(e.x,e.y-34,it.icon,'#ffffff',16)}e.shopping=false;return false}
 e.ang=Math.atan2(n.y-e.y,n.x-e.x);e.wanderAng=e.ang;e.wanderT=.5;moveEnemy(e,Math.cos(e.ang)*e.s*.7*dt,Math.sin(e.ang)*e.s*.7*dt);return true;
}
