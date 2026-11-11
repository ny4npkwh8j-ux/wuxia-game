'use strict';
/* ===== NPC: мирные торговцы. Не атакуют и не получают урона; обмен любых осколков (1–4 этапа), курс ×SHARD_RATE за этап, комиссия EXCH_FEE.
   Позже здесь же появятся артефакты и алхимия (поле goods). ===== */
const NPCS=[{id:'trader',name:'Меняла',x:5000,y:5320,r:26,pal:'e3',goods:['exchange']}];
const EXCH_RATE=SHARD_RATE,EXCH_FEE=.5,EXCH_STEPS=[1,10,100];
/* осколков 1 этапа нужно отдать за n осколков 2 этапа (с комиссией) и сколько получишь за n осколков 2 этапа обратно */
function exchCostShards1(n){return Math.ceil(n*EXCH_RATE/(1-EXCH_FEE))}
function exchBackShards1(n){return Math.floor(n*EXCH_RATE*(1-EXCH_FEE))}
function npcNear(){const s=arenaState;if(!s)return null;for(const n of NPCS)if(Math.hypot(s.px-n.x,s.py-n.y)<110)return n;return null}
function npcTick(){const b=$('npcBtn');if(!b)return;tradeTick();sectBtnTick();const n=npcNear()||tradeTarget(),show=!!n&&!$('npcModal').classList.contains('show')&&!$('tradeModal').classList.contains('show');if(b.__s!==show){b.style.display=show?'block':'none';b.__s=show}}
function drawNpcs(time){
 const s=arenaState;if(!s)return;
 for(const n of NPCS){const p=worldToScreen(n.x,n.y);if(p.x<-100||p.x>aw/devicePixelRatio+100||p.y<-100||p.y>ah/devicePixelRatio+100)continue;
  drawFighter(ax,{x:p.x,y:p.y,ang:Math.atan2(s.py-n.y,s.px-n.x),sc:1.1,pal:PAL[n.pal],wp:0,mv:0,t:time,seed:3.3,aura:'#9ff5e8',auraR:34,auraA:.35});
  outText(ax,n.name,p.x,p.y-42,'#9ff5e8',12);
  if(npcNear()===n)outText(ax,'E — обмен',p.x,p.y-56,'#fff',11)}
}
function openNpc(){const n=npcNear();if(!n){openTrade();return}arenaMeditation.active&&interruptArenaMeditation();renderNpc();$('npcModal').classList.add('show')}
function closeNpc(){$('npcModal').classList.remove('show')}
/* обмен любых осколков (1–4 этапа): курс по лесенке ×SHARD_RATE за этап, комиссия EXCH_FEE — обмен всегда невыгоден.
   n — количество СТАРШИХ осколков в сделке: вверх платишь ceil(n·R^d/(1−fee)) младших, вниз получаешь floor(n·R^d·(1−fee)). */
const EXCH={from:1,to:2};
function exchPrice(from,to,n){const d=Math.abs(to-from),u=Math.pow(EXCH_RATE,d);return to>from?Math.ceil(n*u/(1-EXCH_FEE)):Math.floor(n*u*(1-EXCH_FEE))}
function exchDo(from,to,n){
 const k=SH_KEY[from],have=Math.floor(save[k]||0);
 if(to>from){const c=exchPrice(from,to,n);if(have<c)return;save[k]=have-c;save[SH_KEY[to]]=(save[SH_KEY[to]]||0)+n}
 else{if(have<n)return;save[k]=have-n;save[SH_KEY[to]]=(save[SH_KEY[to]]||0)+exchPrice(from,to,n)}
 persist();renderNpc();updateUI&&updateUI();
}
function renderExchange(el){
 const rt=$('npcRate');if(rt)rt.textContent='Курс '+EXCH_RATE+' : 1 за этап · комиссия '+Math.round(EXCH_FEE*100)+'%';
 const row=()=>{const r=document.createElement('div');r.className='row';r.style.flexWrap='wrap';el.appendChild(r);return r};
 const pick=(label,key)=>{const r=row();const l=document.createElement('span');l.className='mhint';l.textContent=label+': ';r.appendChild(l);
  for(let t=1;t<=4;t++){const b=document.createElement('button');b.className='bigbtn'+(EXCH[key]===t?'':' secondary');b.style.minWidth='0';b.style.flex='1';b.textContent=(t===1?'душа':t+' эт.')+' · '+fmt(Math.floor(save[SH_KEY[t]]||0));
   b.onclick=()=>{EXCH[key]=t;if(EXCH.from===EXCH.to){const o=key==='from'?'to':'from';EXCH[o]=t%4+1}renderNpc()};r.appendChild(b)}};
 pick('Отдать','from');pick('Получить','to');
 const f=EXCH.from,t=EXCH.to;
 for(const n of EXCH_STEPS){
  const up=t>f,c=up?exchPrice(f,t,n):n,g=up?n:exchPrice(f,t,n),b=document.createElement('button');b.className='bigbtn secondary';
  b.disabled=Math.floor(save[SH_KEY[f]]||0)<c||g<1;b.textContent='Отдать '+fmt(c)+' ('+(f===1?'душа':f+' эт.')+') → получить '+fmt(g)+' ('+(t===1?'душа':t+' эт.')+')';
  b.onclick=()=>exchDo(f,t,n);row().appendChild(b)}
}
