'use strict';
/* ===== Магический язык, патч 2: «Стена» — первый объект заклинания =====
   Собирается из прямой цепочки звёзд торса (ни рук, ни головы, ни ног). Параметры берутся из фразы (lang.js):
   дальность → длина, твёрдость → прочность, время → срок жизни. Твёрдость и время делят общий бюджет: чем твёрже стена, тем быстрее она исчезает.
   Стена ставится перед игроком поперёк направления прицела и стоит на месте. Враги не проходят сквозь неё, а удары Ци врагов по игроку
   гасятся ею (ей же и вычитается прочность). Сам игрок проходит свободно. */
Object.assign(TECH2,{wall:{icon:'🧱',short:'СТЕНА',cd:12,base:0}});
CD_KEY.wall='cdWall';
SCROLLS.wall={id:'wall',type:'wall',name:'Стена',from:'язык техник',minStars:4,geo:'прямая линия звёзд торса (без рук, головы и ног)',check:z=>z.hand===0&&z.leg===0&&z.head===0,
 effect:()=>'нажми: перед тобой встаёт стена поперёк прицела. Длина, прочность и время зависят от формы цепочки (дальность, плотность меридиан, звёзды Дыхания/Корня); твёрдость и время делят общий бюджет. Враги её не проходят, удары Ци по тебе она гасит.'};
function wallParams(t){
 const ph=techPhrase(t.nodes);if(!ph)return null;const p=ph.params,tot=Math.max(1,p.hardness+p.duration),hard=p.hardness/tot,dur=p.duration/tot;
 const sq=spellQuality(t.nodes);spellReveal(t,sq);const base=TECH_BASE.qiSingle*myMult(t)*sq.q*(sq.prop==='iron'?1.4:1);
 return{len:110+320*p.reach,hp:base*(4+10*hard),life:(4+9*dur+(ph.n>=6?2:0))*(sq.prop==='echo'?1.5:1),hard,dur};
}
function castWall(t){
 const s=arenaState,P=wallParams(t);if(!P)return;
 const a=s.shootAng||0,cx=s.px+Math.cos(a)*120,cy=s.py+Math.sin(a)*120,nx=-Math.sin(a),ny=Math.cos(a),h=P.len/2;
 (s.walls=s.walls||[]).push({x1:cx-nx*h,y1:cy-ny*h,x2:cx+nx*h,y2:cy+ny*h,t:P.life,max:P.life,hp:P.hp,hpMax:P.hp,hard:P.hard,fl:0});
 if(s.walls.length>6)s.walls.shift();
 s.qiEffects.push({type:'ring',x:cx,y:cy,life:0,duration:.45,radius:h*.8,col:'#9fd6ff'});burst(cx,cy,14,'#9fd6ff',200,.5,2.6);
 toast('Стена: длина '+Math.round(P.len)+', прочность '+fmt(P.hp)+', '+P.life.toFixed(1)+' с');
}
function wallTick(dt){
 const s=arenaState;if(!s||!s.walls||!s.walls.length)return;
 for(const w of s.walls){w.t-=dt;w.fl=Math.max(0,w.fl-dt*3)}
 s.walls=s.walls.filter(w=>{if(w.t>0&&w.hp>0)return true;burst((w.x1+w.x2)/2,(w.y1+w.y2)/2,16,'#9fd6ff',200,.5,2.4);return false});
}
function wallDist(w,x,y){const vx=w.x2-w.x1,vy=w.y2-w.y1,t=Math.max(0,Math.min(1,((x-w.x1)*vx+(y-w.y1)*vy)/(vx*vx+vy*vy)));return Math.hypot(x-w.x1-vx*t,y-w.y1-vy*t)}
/* движение существа «глубже в стену» запрещено; выход из неё свободен (как у щитов) */
function wallBlocksMove(x,y,r,ox,oy){
 const s=arenaState;if(!s||!s.walls)return false;
 for(const w of s.walls){const nd=wallDist(w,x,y);if(nd<r+8&&nd<wallDist(w,ox,oy)-1e-6)return true}
 return false;
}
function segCross(ax,ay,bx,by,cx,cy,dx,dy){
 const d=(bx-ax)*(dy-cy)-(by-ay)*(dx-cx);if(Math.abs(d)<1e-9)return false;
 const t=((cx-ax)*(dy-cy)-(cy-ay)*(dx-cx))/d,u=((cx-ax)*(by-ay)-(cy-ay)*(bx-ax))/d;return t>=0&&t<=1&&u>=0&&u<=1;
}
/* удар Ци из (ex,ey) по игроку: если между ними стена — она принимает урон. true = удар погашен */
function wallAbsorb(ex,ey,dmg){
 const s=arenaState;if(!s||!s.walls)return false;
 for(const w of s.walls)if(segCross(ex,ey,s.px,s.py,w.x1,w.y1,w.x2,w.y2)){w.hp-=dmg;w.fl=1;burst((w.x1+w.x2)/2,(w.y1+w.y2)/2,6,'#9fd6ff',160,.3,2.2);return true}
 return false;
}
function drawWalls(){
 const s=arenaState;if(!s||!s.walls)return;
 for(const w of s.walls){
  const a=worldToScreen(w.x1,w.y1),b=worldToScreen(w.x2,w.y2),f=Math.min(1,w.t/1.5),hp=Math.max(0,w.hp/w.hpMax);
  ax.save();ax.globalAlpha=(.35+.55*hp)*f;ax.lineCap='round';
  ax.strokeStyle='rgba(120,190,255,.35)';ax.lineWidth=18;ax.beginPath();ax.moveTo(a.x,a.y);ax.lineTo(b.x,b.y);ax.stroke();
  ax.strokeStyle=w.fl>0?'#ffffff':'#9fd6ff';ax.lineWidth=6+4*w.hard;ax.stroke();
  ax.restore();
 }
}
