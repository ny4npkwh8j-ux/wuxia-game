'use strict';
/* ===== Магический язык, патч 3: «Ловушка» и «Зона» — объекты заклинаний на земле =====
   Собираются из цепочки звёзд только торса (без рук, головы, ног), если она не кольцо, не треугольник и не прямая:
   ломаная с резкими поворотами — Ловушка; компактный клубок или спираль — Зона.
   Параметры берутся из фразы (lang.js); твёрдость и время делят общий бюджет, как у Стены. */
Object.assign(TECH2,{trap:{icon:'🪤',short:'ЛОВУШКА',cd:8,base:0},zone:{icon:'🔮',short:'ЗОНА',cd:16,base:0}});
CD_KEY.trap='cdTrap';CD_KEY.zone='cdZone';
SCROLLS.trap={id:'trap',type:'trap',name:'Ловушка',from:'язык техник',minStars:5,geo:'только торс: ломаная цепочка с резкими поворотами (зигзаг)',check:z=>z.hand===0&&z.leg===0&&z.head===0,
 effect:()=>'нажми: на земле остаётся скрытая ловушка (до 4). Когда враг подходит, она взрывается уроном и оглушением. Твёрдость — урон и оглушение, время — срок ожидания; бюджет общий.'};
SCROLLS.zone={id:'zone',type:'zone',name:'Зона',from:'язык техник',minStars:6,geo:'только торс: компактный клубок или спираль звёзд',check:z=>z.hand===0&&z.leg===0&&z.head===0,
 effect:()=>'нажми: на земле возникает область: враги внутри замедлены вдвое и получают урон каждую секунду. Твёрдость — урон, время — срок существования; бюджет общий.'};
/* Зерно: хэш координат звёзд цепочки. Даёт каждой собранной технике свой бонус качества (+0…15%, штрафов нет) и редко — скрытое свойство,
   которое открывается при первом применении и записывается в кодекс (save.codex, необязательное поле). */
const SPELL_PROPS={vamp:'Вампиризм',echo:'Эхо',iron:'Закалка'};
function spellSeed(nodes){let h=2166136261;for(const i of nodes){const p=save.starPts[i];if(!p)continue;h=Math.imul(h^Math.round(p.x*1000),16777619);h=Math.imul(h^Math.round(p.y*1000),16777619)}return (h>>>0)/4294967296}
function spellQuality(nodes){const u=spellSeed(nodes);return{q:1+.15*((u*7.3)%1),prop:(()=>{const v=(u*13.7)%1;return v<.12?['vamp','echo','iron'][Math.floor(v/.04)]:null})(),seed:u}}
function spellReveal(t,sq){
 if(!sq.prop||t.found)return;t.found=sq.prop;const nm=SPELL_PROPS[sq.prop];
 if(!/ ✦/.test(t.name||''))t.name=(t.name||techniqueName(t.type))+' ✦'+nm;
 save.codex=save.codex||[];if(!save.codex.some(c=>c.seed===sq.seed))save.codex.push({seed:sq.seed,type:t.type,prop:sq.prop});
 persist();toast('Открыто скрытое свойство: '+nm+'!');
}
function spellVamp(prop,dealt){if(prop!=='vamp'||!(dealt>0))return;const s=arenaState;if(!s||s.soulOut)return;s.hp=Math.min(s.maxHp,s.hp+dealt*.15)}
function spellParams(t){
 const ph=techPhrase(t.nodes);if(!ph)return null;const p=ph.params,tot=Math.max(1,p.hardness+p.duration);
 const sq=spellQuality(t.nodes);spellReveal(t,sq);
 return{hard:p.hardness/tot,dur:p.duration/tot,reach:p.reach,base:TECH_BASE.qiSingle*myMult(t)*sq.q*(sq.prop==='iron'?1.3:1),prop:sq.prop,n:ph.n};
}
function castTrap(t){
 const s=arenaState,P=spellParams(t);if(!P)return;
 /* повтор: длинная ломаная ставит ряд ловушек вперёд (1 на каждые 3 звезды сверх двух, до 3) */
 const rep=Math.max(1,Math.min(3,Math.floor((P.n-2)/3))),a=s.shootAng||0;
 for(let k=0;k<rep;k++)(s.traps=s.traps||[]).push({x:s.px+Math.cos(a)*90*k,y:s.py+Math.sin(a)*90*k,arm:.8,t:(8+14*P.dur)*(P.prop==='echo'?1.5:1),max:8+14*P.dur,r:60+80*P.reach,boom:110+110*P.reach,dmg:P.base*(1.2+2.5*P.hard),stun:.8+1.8*P.hard,prop:P.prop,twice:P.prop==='echo'});
 while(s.traps.length>6)s.traps.shift();
 burst(s.px,s.py,10,'#ffb36b',150,.4,2.4);toast('Ловушка ×'+rep+': урон '+fmt(P.base*(1.2+2.5*P.hard))+', оглушение '+(.8+1.8*P.hard).toFixed(1)+' с, ждёт '+(8+14*P.dur).toFixed(0)+' с');
}
function castZone(t){
 const s=arenaState,P=spellParams(t);if(!P)return;
 const life=(3+8*P.dur)*(P.prop==='echo'?1.5:1),R=110+250*P.reach,dps=P.base*(.25+.9*P.hard);
 (s.zones=s.zones||[]).push({x:s.px,y:s.py,t:life,max:life,r:R,dps,acc:0,prop:P.prop});
 if(s.zones.length>3)s.zones.shift();
 s.qiEffects.push({type:'ring',x:s.px,y:s.py,life:0,duration:.5,radius:R,col:'#c58cff'});
 toast('Зона: радиус '+Math.round(R)+', урон '+fmt(dps)+'/с, '+life.toFixed(1)+' с');
}
function spellFoes(){const s=arenaState;return s.enemies.concat(aliveBosses(s)).filter(e=>e.hp>0&&!e.vessel&&!e.removed&&!isMate(e))}
function spellTick(dt){
 const s=arenaState;if(!s)return;
 if(s.traps&&s.traps.length){
  for(const tr of s.traps){
   tr.t-=dt;if(tr.arm>0){tr.arm-=dt;continue}
   if(tr.t<=0){tr.dead=true;continue}
   if(!spellFoes().some(e=>Math.hypot(e.x-tr.x,e.y-tr.y)<tr.r))continue;
   tr.dead=true;s.qiEffects.push({type:'area',x:tr.x,y:tr.y,life:0,duration:.5,radius:tr.boom});burst(tr.x,tr.y,22,'#ffb36b',260,.6,3);shake(6);
   for(const e of spellFoes()){if(Math.hypot(e.x-tr.x,e.y-tr.y)>tr.boom)continue;spellVamp(tr.prop,tr.dmg);if(damageEnemy(e,tr.dmg)){killReward(e);continue}e.stun=Math.max(e.stun||0,tr.stun)}
   if(tr.twice)(s.echoes=s.echoes||[]).push({x:tr.x,y:tr.y,t:.6,boom:tr.boom,dmg:tr.dmg*.6,prop:tr.prop});
   persist();
  }
  s.traps=s.traps.filter(x=>!x.dead);
 }
 if(s.echoes&&s.echoes.length){
  for(const ec of s.echoes){ec.t-=dt;if(ec.t>0)continue;ec.dead=true;s.qiEffects.push({type:'area',x:ec.x,y:ec.y,life:0,duration:.4,radius:ec.boom});
   for(const e of spellFoes()){if(Math.hypot(e.x-ec.x,e.y-ec.y)>ec.boom)continue;spellVamp(ec.prop,ec.dmg);if(damageEnemy(e,ec.dmg))killReward(e)}}
  s.echoes=s.echoes.filter(x=>!x.dead);
 }
 if(s.zones&&s.zones.length){
  for(const z of s.zones){
   z.t-=dt;z.acc+=dt;const tick=z.acc>=.5;if(tick)z.acc-=.5;
   for(const e of spellFoes()){if(Math.hypot(e.x-z.x,e.y-z.y)>z.r)continue;e.slowT=.4;if(tick){spellVamp(z.prop,z.dps*.5);if(damageEnemy(e,z.dps*.5))killReward(e)}}
  }
  s.zones=s.zones.filter(z=>z.t>0);
 }
}
function drawSpells(time){
 const s=arenaState;if(!s)return;
 for(const z of s.zones||[]){const p=worldToScreen(z.x,z.y),f=Math.min(1,z.t/1);ax.save();ax.globalAlpha=.22*f;ax.fillStyle='#b070ff';ax.beginPath();ax.arc(p.x,p.y,z.r,0,7);ax.fill();ax.globalAlpha=.6*f;ax.strokeStyle='#d8b0ff';ax.lineWidth=2;ax.setLineDash([10,8]);ax.lineDashOffset=-time*20;ax.stroke();ax.restore()}
 for(const tr of s.traps||[]){const p=worldToScreen(tr.x,tr.y),a=tr.arm>0?.35:.55+.25*Math.sin(time*5);ax.save();ax.globalAlpha=a;ax.strokeStyle='#ffb36b';ax.lineWidth=2;ax.beginPath();ax.moveTo(p.x,p.y-12);ax.lineTo(p.x+12,p.y);ax.lineTo(p.x,p.y+12);ax.lineTo(p.x-12,p.y);ax.closePath();ax.stroke();ax.restore()}
}
