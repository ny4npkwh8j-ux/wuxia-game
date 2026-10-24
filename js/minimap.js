'use strict';
/* ===== схематичная карта: туман войны. save.mapSeen — строка из '0'/'1' (сетка MAP_N×MAP_N, клетка 200), новый ключ сохранения ===== */
const MAP_N=50,MAP_CELL=400,MAP_VIEW=650;
/* карта выросла вдвое по радиусу: клетка 400 вместо 200; старые открытые клетки переносятся в новую сетку (save.mapV=2) */
function mapSeenArr(){if(typeof save.mapSeen!=='string'||save.mapSeen.length!==MAP_N*MAP_N)save.mapSeen='0'.repeat(MAP_N*MAP_N);
 if(save.mapV!==2){const o=save.mapSeen,n=new Array(MAP_N*MAP_N).fill('0');for(let y=0;y<MAP_N;y++)for(let x=0;x<MAP_N;x++)if(o[y*MAP_N+x]==='1')n[(y>>1)*MAP_N+(x>>1)]='1';save.mapSeen=n.join('');save.mapV=2}
 return save.mapSeen}
let mapLast=-1,mapDirty=false,mapSaveT=0;
function mapTick(dt){
 const s=arenaState;if(!s)return;
 const cx=Math.floor(s.px/MAP_CELL),cy=Math.floor(s.py/MAP_CELL),key=cx*100+cy;
 if(key!==mapLast){mapLast=key;const a=mapSeenArr().split(''),R=Math.ceil(MAP_VIEW/MAP_CELL);let ch=false;
  for(let y=cy-R;y<=cy+R;y++)for(let x=cx-R;x<=cx+R;x++){if(x<0||y<0||x>=MAP_N||y>=MAP_N)continue;if(Math.hypot((x+.5)*MAP_CELL-s.px,(y+.5)*MAP_CELL-s.py)>MAP_VIEW)continue;const i=y*MAP_N+x;if(a[i]!=='1'){a[i]='1';ch=true}}
  if(ch){save.mapSeen=a.join('');mapDirty=true}}
 mapSaveT+=dt;if(mapDirty&&mapSaveT>10){mapSaveT=0;mapDirty=false;persist()}
 radarDraw();
}
function mapSeenAt(x,y){const cx=Math.floor(x/MAP_CELL),cy=Math.floor(y/MAP_CELL);if(cx<0||cy<0||cx>=MAP_N||cy>=MAP_N)return false;return mapSeenArr()[cy*MAP_N+cx]==='1'}
function openMap(){$('mapModal').classList.add('show');drawMiniMap()}
function closeMap(){$('mapModal').classList.remove('show')}
function drawMiniMap(){
 const s=arenaState,cv=$('mapCv'),chEl=$('mapChron');if(chEl){const a=(s&&s.chron||[]).slice(-12).reverse();chEl.innerHTML=a.length?a.map(x=>'<div>'+new Date(x.t).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})+' · '+x.m+'</div>').join(''):'<div style="opacity:.6">Пока тихо…</div>'}
 const W=Math.min(360,Math.floor(innerWidth-70)),k=W/WORLD;
 cv.width=cv.height=W;const g=cv.getContext('2d');
 g.fillStyle='#0a1020';g.fillRect(0,0,W,W);
 const seen=mapSeenArr(),c=MAP_CELL*k;
 g.fillStyle='#24472f';for(let y=0;y<MAP_N;y++)for(let x=0;x<MAP_N;x++)if(seen[y*MAP_N+x]==='1')g.fillRect(x*c,y*c,c+.6,c+.6);
 if(!s){return}
 for(const z of s.hazards||[])if(mapSeenAt(z.x,z.y)){g.fillStyle='rgba(220,70,70,.35)';g.beginPath();g.arc(z.x*k,z.y*k,z.r*k,0,7);g.fill()}
 for(const z of s.springs||[])if(mapSeenAt(z.x,z.y)){const h=zoneHolder(z),sc=h&&h.sect?sectById(h.sect):null;if(sc){g.globalAlpha=.45;g.fillStyle=sc.col}else g.fillStyle=z.bz?'rgba(255,200,80,.4)':'rgba(90,200,255,.4)';g.beginPath();g.arc(z.x*k,z.y*k,Math.max(3,z.r*k),0,7);g.fill();g.globalAlpha=1}
 for(const sc of sectList()){const m=SM.get(sc.id);if(m&&mapSeenAt(m.x,m.y)){g.fillStyle=sc.col;g.strokeStyle='#000';g.lineWidth=1;g.beginPath();g.arc(m.x*k,m.y*k,4,0,7);g.fill();g.stroke()}}
 for(const o of s.obstacles||[])if(mapSeenAt(o.x,o.y)){g.fillStyle=o.type==='tree'?'#2e7a45':'#6b7280';g.fillRect(o.x*k-1.5,o.y*k-1.5,3,3)}
 for(const h of BOSS_HOMES)if(mapSeenAt(h[0],h[1])){g.fillStyle='#ff5a5a';g.font='bold 13px sans-serif';g.textAlign='center';g.fillText('☠',h[0]*k,h[1]*k+4)}
 for(const n of NPCS){g.fillStyle='#9ff5e8';g.font='bold 13px sans-serif';g.textAlign='center';g.fillText('💱',n.x*k,n.y*k+4)}
 for(const l of s.loot||[])if(mapSeenAt(l.x,l.y)){g.fillStyle='#ffd85b';g.beginPath();g.arc(l.x*k,l.y*k,2.5,0,7);g.fill()}
 g.strokeStyle='#4a5878';g.strokeRect(.5,.5,W-1,W-1);
 g.save();g.translate(s.px*k,s.py*k);g.rotate(s.facing||0);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=1.5;g.beginPath();g.moveTo(8,0);g.lineTo(-5,5);g.lineTo(-3,0);g.lineTo(-5,-5);g.closePath();g.fill();g.stroke();g.restore();
}
(function(){const m=document.createElement('div');m.id='mapModal';m.className='modal';m.innerHTML='<div class="sheet" style="text-align:center"><h3>🗺 Карта</h3><canvas id="mapCv" style="border-radius:10px"></canvas><h4 style="margin:8px 0 2px">Летопись</h4><div id="mapChron" style="text-align:left;font-size:12px;max-height:120px;overflow:auto"></div><p style="font-size:12px;opacity:.8">☠ боссы · 💱 Меняла · красное — опасные зоны · золотое/синее — зоны Ци (цвет секты — зона занята сектой, ● глава секты) · показано только то, что ты уже видел</p><div class="row"><button class="bigbtn" onclick="closeMap()">Закрыть</button></div></div>';document.body.appendChild(m)})();

/* ===== радар: маленькая карта-круг рядом с кнопкой карты, всегда показывает окрестности (радиус RADAR_R); тап открывает полную карту ===== */
const RADAR_R=1300,RADAR_S=104;
(function(){const c=document.createElement('canvas');c.id='radarCv';const d=window.devicePixelRatio||1;c.width=c.height=Math.round(RADAR_S*d);c.style.cssText='position:absolute;inset:auto;left:auto;right:12px;top:112px;width:'+RADAR_S+'px;height:'+RADAR_S+'px;border-radius:50%;z-index:58;opacity:.94;box-shadow:0 0 0 2px rgba(255,255,255,.28),0 2px 8px rgba(0,0,0,.5);touch-action:manipulation';c.onclick=openMap;const a=document.getElementById('arena');if(a)a.appendChild(c)})();
let radarLast=0;
function radarDraw(){
 const s=arenaState,cv=document.getElementById('radarCv');if(!s||!cv)return;
 const now=performance.now();if(now-radarLast<110)return;radarLast=now;
 const d=window.devicePixelRatio||1,g=cv.getContext('2d'),h=RADAR_S/2,k=h/RADAR_R;
 g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,RADAR_S,RADAR_S);
 g.save();g.beginPath();g.arc(h,h,h,0,7);g.clip();
 g.fillStyle='rgba(10,20,16,.82)';g.fillRect(0,0,RADAR_S,RADAR_S);
 const X=x=>h+(x-s.px)*k,Y=y=>h+(y-s.py)*k;
 for(const z of s.hazards||[]){if(Math.hypot(z.x-s.px,z.y-s.py)>RADAR_R+z.r)continue;g.fillStyle='rgba(220,70,70,.28)';g.beginPath();g.arc(X(z.x),Y(z.y),z.r*k,0,7);g.fill()}
 for(const z of s.springs||[]){if(Math.hypot(z.x-s.px,z.y-s.py)>RADAR_R+z.r)continue;const hd=zoneHolder(z),sc=hd&&hd.sect?sectById(hd.sect):null;g.fillStyle=sc?sc.col:z.bz?'#ffc850':'#5ac8ff';g.globalAlpha=.28;g.beginPath();g.arc(X(z.x),Y(z.y),z.r*k,0,7);g.fill();g.globalAlpha=.55;g.strokeStyle=g.fillStyle;g.lineWidth=1;g.beginPath();g.arc(X(z.x),Y(z.y),z.r*RING_IN*k,0,7);g.stroke();g.globalAlpha=1}
 for(const l of s.loot||[]){if(Math.hypot(l.x-s.px,l.y-s.py)>RADAR_R)continue;g.fillStyle=l.k===3?'#7fe0ff':'#ffd85b';g.fillRect(X(l.x)-1,Y(l.y)-1,2,2)}
 for(const e of s.enemies){if(e.hp<=0||Math.hypot(e.x-s.px,e.y-s.py)>RADAR_R)continue;const sc=e.sect!=null?sectById(e.sect):null;g.fillStyle=isMate(e)?'#7dff9b':e.hostile?'#ff4a4a':sc?sc.col:'#ffb86b';g.beginPath();g.arc(X(e.x),Y(e.y),e.hostile?2.3:1.8,0,7);g.fill()}
 for(const b of aliveBosses(s)){if(Math.hypot(b.x-s.px,b.y-s.py)>RADAR_R)continue;g.fillStyle=b.hostile?'#ff2a2a':'#ff9a3a';g.beginPath();g.arc(X(b.x),Y(b.y),4,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=1;g.stroke()}
 for(const n of NPCS){if(Math.hypot(n.x-s.px,n.y-s.py)>RADAR_R)continue;g.fillStyle='#9ff5e8';g.fillRect(X(n.x)-2.5,Y(n.y)-2.5,5,5)}
 g.restore();
 g.save();g.translate(h,h);g.rotate(s.facing||0);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=1;g.beginPath();g.moveTo(6,0);g.lineTo(-4,4);g.lineTo(-2,0);g.lineTo(-4,-4);g.closePath();g.fill();g.stroke();g.restore();
}
