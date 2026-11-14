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
function spellParams(t){
 const ph=techPhrase(t.nodes);if(!ph)return null;const p=ph.params,tot=Math.max(1,p.hardness+p.duration);
 return{hard:p.hardness/tot,dur:p.duration/tot,reach:p.reach,base:TECH_BASE.qiSingle*myMult(t)};
}
function castTrap(t){
 const s=arenaState,P=spellParams(t);if(!P)return;
 (s.traps=s.traps||[]).push({x:s.px,y:s.py,arm:.8,t:8+14*P.dur,max:8+14*P.dur,r:60+80*P.reach,boom:110+110*P.reach,dmg:P.base*(1.2+2.5*P.hard),stun:.8+1.8*P.hard});
 if(s.traps.length>4)s.traps.shift();
 burst(s.px,s.py,10,'#ffb36b',150,.4,2.4);toast('Ловушка: урон '+fmt(P.base*(1.2+2.5*P.hard))+', оглушение '+(.8+1.8*P.hard).toFixed(1)+' с, ждёт '+(8+14*P.dur).toFixed(0)+' с');
}
function castZone(t){
 const s=arenaState,P=spellParams(t);if(!P)return;
 const life=3+8*P.dur,R=110+250*P.reach,dps=P.base*(.25+.9*P.hard);
 (s.zones=s.zones||[]).push({x:s.px,y:s.py,t:life,max:life,r:R,dps,acc:0});
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
   for(const e of spellFoes()){if(Math.hypot(e.x-tr.x,e.y-tr.y)>tr.boom)continue;if(damageEnemy(e,tr.dmg)){killReward(e);continue}e.stun=Math.max(e.stun||0,tr.stun)}
   persist();
  }
  s.traps=s.traps.filter(x=>!x.dead);
 }
 if(s.zones&&s.zones.length){
  for(const z of s.zones){
   z.t-=dt;z.acc+=dt;const tick=z.acc>=.5;if(tick)z.acc-=.5;
   for(const e of spellFoes()){if(Math.hypot(e.x-z.x,e.y-z.y)>z.r)continue;e.slowT=.4;if(tick&&damageEnemy(e,z.dps*.5))killReward(e)}
  }
  s.zones=s.zones.filter(z=>z.t>0);
 }
}
function drawSpells(time){
 const s=arenaState;if(!s)return;
 for(const z of s.zones||[]){const p=worldToScreen(z.x,z.y),f=Math.min(1,z.t/1);ax.save();ax.globalAlpha=.22*f;ax.fillStyle='#b070ff';ax.beginPath();ax.arc(p.x,p.y,z.r,0,7);ax.fill();ax.globalAlpha=.6*f;ax.strokeStyle='#d8b0ff';ax.lineWidth=2;ax.setLineDash([10,8]);ax.lineDashOffset=-time*20;ax.stroke();ax.restore()}
 for(const tr of s.traps||[]){const p=worldToScreen(tr.x,tr.y),a=tr.arm>0?.35:.55+.25*Math.sin(time*5);ax.save();ax.globalAlpha=a;ax.strokeStyle='#ffb36b';ax.lineWidth=2;ax.beginPath();ax.moveTo(p.x,p.y-12);ax.lineTo(p.x+12,p.y);ax.lineTo(p.x,p.y+12);ax.lineTo(p.x-12,p.y);ax.closePath();ax.stroke();ax.restore()}
}
