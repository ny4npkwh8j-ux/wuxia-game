'use strict';
/* ===== схематичная карта: туман войны. save.mapSeen — строка из '0'/'1' (сетка MAP_N×MAP_N, клетка 200), новый ключ сохранения ===== */
const MAP_N=50,MAP_CELL=200,MAP_VIEW=650;
function mapSeenArr(){if(typeof save.mapSeen!=='string'||save.mapSeen.length!==MAP_N*MAP_N)save.mapSeen='0'.repeat(MAP_N*MAP_N);return save.mapSeen}
let mapLast=-1,mapDirty=false,mapSaveT=0;
function mapTick(dt){
 const s=arenaState;if(!s)return;
 const cx=Math.floor(s.px/MAP_CELL),cy=Math.floor(s.py/MAP_CELL),key=cx*100+cy;
 if(key!==mapLast){mapLast=key;const a=mapSeenArr().split(''),R=Math.ceil(MAP_VIEW/MAP_CELL);let ch=false;
  for(let y=cy-R;y<=cy+R;y++)for(let x=cx-R;x<=cx+R;x++){if(x<0||y<0||x>=MAP_N||y>=MAP_N)continue;if(Math.hypot((x+.5)*MAP_CELL-s.px,(y+.5)*MAP_CELL-s.py)>MAP_VIEW)continue;const i=y*MAP_N+x;if(a[i]!=='1'){a[i]='1';ch=true}}
  if(ch){save.mapSeen=a.join('');mapDirty=true}}
 mapSaveT+=dt;if(mapDirty&&mapSaveT>10){mapSaveT=0;mapDirty=false;persist()}
}
function mapSeenAt(x,y){const cx=Math.floor(x/MAP_CELL),cy=Math.floor(y/MAP_CELL);if(cx<0||cy<0||cx>=MAP_N||cy>=MAP_N)return false;return mapSeenArr()[cy*MAP_N+cx]==='1'}
function openMap(){$('mapModal').classList.add('show');drawMiniMap()}
function closeMap(){$('mapModal').classList.remove('show')}
function drawMiniMap(){
 const s=arenaState,cv=$('mapCv'),W=Math.min(360,Math.floor(innerWidth-70)),k=W/10000;
 cv.width=cv.height=W;const g=cv.getContext('2d');
 g.fillStyle='#0a1020';g.fillRect(0,0,W,W);
 const seen=mapSeenArr(),c=MAP_CELL*k;
 g.fillStyle='#24472f';for(let y=0;y<MAP_N;y++)for(let x=0;x<MAP_N;x++)if(seen[y*MAP_N+x]==='1')g.fillRect(x*c,y*c,c+.6,c+.6);
 if(!s){return}
 for(const z of s.hazards||[])if(mapSeenAt(z.x,z.y)){g.fillStyle='rgba(220,70,70,.35)';g.beginPath();g.arc(z.x*k,z.y*k,z.r*k,0,7);g.fill()}
 for(const z of s.springs||[])if(mapSeenAt(z.x,z.y)){g.fillStyle=z.bz?'rgba(255,200,80,.4)':'rgba(90,200,255,.4)';g.beginPath();g.arc(z.x*k,z.y*k,Math.max(3,z.r*k),0,7);g.fill()}
 for(const o of s.obstacles||[])if(mapSeenAt(o.x,o.y)){g.fillStyle=o.type==='tree'?'#2e7a45':'#6b7280';g.fillRect(o.x*k-1.5,o.y*k-1.5,3,3)}
 for(const h of BOSS_HOMES)if(mapSeenAt(h[0],h[1])){g.fillStyle='#ff5a5a';g.font='bold 13px sans-serif';g.textAlign='center';g.fillText('☠',h[0]*k,h[1]*k+4)}
 for(const n of NPCS)if(mapSeenAt(n.x,n.y)){g.fillStyle='#9ff5e8';g.font='bold 13px sans-serif';g.textAlign='center';g.fillText('💱',n.x*k,n.y*k+4)}
 for(const l of s.loot||[])if(mapSeenAt(l.x,l.y)){g.fillStyle='#ffd85b';g.beginPath();g.arc(l.x*k,l.y*k,2.5,0,7);g.fill()}
 g.strokeStyle='#4a5878';g.strokeRect(.5,.5,W-1,W-1);
 g.save();g.translate(s.px*k,s.py*k);g.rotate(s.facing||0);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=1.5;g.beginPath();g.moveTo(8,0);g.lineTo(-5,5);g.lineTo(-3,0);g.lineTo(-5,-5);g.closePath();g.fill();g.stroke();g.restore();
}
(function(){const m=document.createElement('div');m.id='mapModal';m.className='modal';m.innerHTML='<div class="sheet" style="text-align:center"><h3>🗺 Карта</h3><canvas id="mapCv" style="border-radius:10px"></canvas><p style="font-size:12px;opacity:.8">☠ боссы · 💱 Меняла · красное — опасные зоны · золотое/синее — зоны Ци · показано только то, что ты уже видел</p><div class="row"><button class="bigbtn" onclick="closeMap()">Закрыть</button></div></div>';document.body.appendChild(m)})();
