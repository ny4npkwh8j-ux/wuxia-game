'use strict';
/* ===== NPC: мирные торговцы. Не атакуют и не получают урона; сейчас — обмен осколков 1 ↔ 2 этапа (100 : 1, комиссия 20%).
   Позже здесь же появятся артефакты и алхимия (поле goods). ===== */
const NPCS=[{id:'trader',name:'Меняла',x:5000,y:5320,r:26,pal:'e3',goods:['exchange']}];
const EXCH_RATE=100,EXCH_FEE=.2,EXCH_STEPS=[1,10,100];
/* осколков 1 этапа нужно отдать за n осколков 2 этапа (с комиссией) и сколько получишь за n осколков 2 этапа обратно */
function exchCostShards1(n){return Math.ceil(n*EXCH_RATE/(1-EXCH_FEE))}
function exchBackShards1(n){return Math.floor(n*EXCH_RATE*(1-EXCH_FEE))}
function npcNear(){const s=arenaState;if(!s)return null;for(const n of NPCS)if(Math.hypot(s.px-n.x,s.py-n.y)<110)return n;return null}
function npcTick(){const b=$('npcBtn');if(!b)return;const n=npcNear(),show=!!n&&!$('npcModal').classList.contains('show');if(b.__s!==show){b.style.display=show?'block':'none';b.__s=show}}
function drawNpcs(time){
 const s=arenaState;if(!s)return;
 for(const n of NPCS){const p=worldToScreen(n.x,n.y);if(p.x<-100||p.x>aw/devicePixelRatio+100||p.y<-100||p.y>ah/devicePixelRatio+100)continue;
  drawFighter(ax,{x:p.x,y:p.y,ang:Math.atan2(s.py-n.y,s.px-n.x),sc:1.1,pal:PAL[n.pal],wp:0,mv:0,t:time,seed:3.3,aura:'#9ff5e8',auraR:34,auraA:.35});
  outText(ax,n.name,p.x,p.y-42,'#9ff5e8',12);
  if(npcNear()===n)outText(ax,'E — обмен',p.x,p.y-56,'#fff',11)}
}
function openNpc(){const n=npcNear();if(!n)return;arenaMeditation.active&&interruptArenaMeditation();renderNpc();$('npcModal').classList.add('show')}
function closeNpc(){$('npcModal').classList.remove('show')}
function renderNpc(){
 $('npcBal').textContent='Осколки души: '+fmt(save.rewards)+' · Осколки 2 этапа: '+fmt(save.rewards2);
 const el=$('npcList');el.innerHTML='';
 for(const n of EXCH_STEPS){const c=exchCostShards1(n),b=document.createElement('button');b.className='bigbtn secondary';b.disabled=save.rewards<c;b.textContent='Отдать '+fmt(c)+' души → получить '+n+' 2 этапа';b.onclick=()=>{if(save.rewards<c)return;save.rewards-=c;save.rewards2+=n;persist();renderNpc()};el.appendChild(document.createElement('div')).className='row';el.lastChild.appendChild(b)}
 for(const n of EXCH_STEPS){const g=exchBackShards1(n),b=document.createElement('button');b.className='bigbtn secondary';b.disabled=save.rewards2<n;b.textContent='Отдать '+n+' 2 этапа → получить '+fmt(g)+' души';b.onclick=()=>{if(save.rewards2<n)return;save.rewards2-=n;save.rewards+=g;persist();renderNpc()};el.appendChild(document.createElement('div')).className='row';el.lastChild.appendChild(b)}
}
