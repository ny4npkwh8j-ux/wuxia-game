'use strict';
/* ===== Писания: готовые «идеальные» узоры звёзд и меридиан. Отдельный предмет (не свиток техники), остаётся в инвентаре,
   можно продать/передать. Развитие с Писанием ставит звёзды и меридианы по узору со скидкой на их цену. ===== */
const SCR_D=12;/* шаг решётки в пикселях */
const SCRIPTURES=[
 {r:1,name:'Свиток Первых Шагов',n:50,disc:.20,dens:0,   tier:1,price:150,  info:'Узор «Странник»: рывок и Удар Ци.'},
 {r:2,name:'Писание Горного Ветра',n:100,disc:.28,dens:.12,tier:1,price:2500, info:'Скелет тела: щит, рывок, удары Ци.'},
 {r:3,name:'Писание Лунного Круга',n:150,disc:.35,dens:.3, tier:2,price:600,  info:'Кольца и треугольники: Мираж, Притяжение, Лечение.'},
 {r:4,name:'Писание Девяти Небес',n:220,disc:.43,dens:.6, tier:3,price:900,  info:'Плотная сеть меридиан: почти любая техника.'},
 {r:5,name:'Писание Небесного Дракона',n:300,disc:.50,dens:1,tier:3,price:9000,info:'Совершенный образ: любая техника на 100 звёзд, звезда вдвое дешевле.'}
];
const SCR_DROP=[.03,.012,.004,.0012,.0003];/* шанс с моба по рангу: чем выше ранг, тем реже */
const SCR_CHEST=[.15,.05,.015,.004,.001];/* шанс в сундуке */
function scrInfo(r){return SCRIPTURES[r-1]}
/* Узор строится ростом от Дань-тяня по гексагональной решётке: каждая новая звезда соседствует с уже поставленной, поэтому любой префикс
   (малое Писание — начало большого) связный, а меридианы идут только между соседними звёздами. Сначала растёт «скелет», затем перекладины, затем утолщение. */
let _scrB=null;const _scrPat={};
function scrBuild(){
 if(_scrB)return _scrB;
 const rdy=typeof bodyMaskReady!=='undefined'&&bodyMaskReady,D=SCR_D,dx=D/210,dy=D*.866/520,P=[];
 for(let r=0,y=-.5;y<=.5;r++,y=-.5+r*dy)for(let x=-.45+(r%2)*dx/2;x<=.45;x+=dx)if(inFormBody(x,y)&&(!rdy||bodyPointInside(x,y)))P.push([Math.round(x*1e4)/1e4,Math.round(y*1e4)/1e4]);
 const N=P.length,PX=P.map(p=>[p[0]*210,p[1]*520]),adj=Array.from({length:N},()=>[]);
 for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)if(Math.hypot(PX[i][0]-PX[j][0],PX[i][1]-PX[j][1])<=D*1.25&&(!rdy||segmentInsideBody({x:P[i][0],y:P[i][1]},{x:P[j][0],y:P[j][1]}))){adj[i].push(j);adj[j].push(i)}
 const segD=(p,segs)=>Math.min(...segs.map(s=>{const ax=s[0]*210,ay=s[1]*520,bx=s[2]*210,by=s[3]*520,vx=bx-ax,vy=by-ay,t=Math.max(0,Math.min(1,((p[0]-ax)*vx+(p[1]-ay)*vy)/(vx*vx+vy*vy)));return Math.hypot(p[0]-ax-vx*t,p[1]-ay-vy*t)}));
 const skel=[[0,-.46,0,.1],[-.09,.1,.09,.1],[-.09,.1,-.09,.48],[.09,.1,.09,.48],[-.18,-.26,.18,-.26],[-.18,-.26,-.42,.13],[.18,-.26,.42,.13]],
       bars=[[-.42,-.12,.42,-.12],[-.18,.07,.18,.07]];
 let st=0,sd=1e9;for(let i=0;i<N;i++){const d=Math.hypot(P[i][0],(P[i][1]-DANTIAN_Y)*2.5);if(d<sd){sd=d;st=i}}
 const hop=new Array(N).fill(1e9);hop[st]=0;{const q=[st];for(let h=0;h<q.length;h++)for(const j of adj[q[h]])if(hop[j]===1e9){hop[j]=hop[q[h]]+1;q.push(j)}}
 const d1=PX.map(p=>segD(p,skel)),d2=PX.map(p=>segD(p,bars));
 const pri=i=>d1[i]<=D*.45?hop[i]:d2[i]<=D*.45?1000+hop[i]:2000+d1[i]*4+hop[i];
 const sel=new Array(N).fill(false),order=[st],par=[-1];sel[st]=true;
 while(order.length<N){let b=-1,bp=1e18,bpar=-1;
  for(let k=0;k<order.length;k++)for(const j of adj[order[k]]){if(sel[j])continue;const v=pri(j)+k*1e-4;if(v<bp){bp=v;b=j;bpar=k}}
  if(b<0)break;sel[b]=true;order.push(b);par.push(bpar)}
 const R={pts:order.map(i=>P[i]),par,D};
 if(rdy)_scrB=R;else{for(const k in _scrPat)delete _scrPat[k];return R}
 return R;
}
function scrLattice(){return scrBuild().pts}

function scrHash(i,j){return (((i*73856093)^(j*19349663))>>>0)%1000/1000}
function scrPattern(r){
 if(_scrPat[r])return _scrPat[r];
 const B=scrBuild(),inf=scrInfo(r),n=Math.min(inf.n,B.pts.length),pts=B.pts.slice(0,n),edges=[],has=new Set();
 for(let i=1;i<n;i++){edges.push([B.par[i],i]);has.add(B.par[i]+'_'+i)}
 if(inf.dens>0)for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){if(has.has(i+'_'+j))continue;if(Math.hypot((pts[i][0]-pts[j][0])*210,(pts[i][1]-pts[j][1])*520)>B.D*1.25)continue;if(scrHash(i,j)<inf.dens)edges.push([i,j])}
 edges.sort((a,b)=>Math.max(a[0],a[1])-Math.max(b[0],b[1]));
 const R={pts,edges,il:true};if(_scrB)_scrPat[r]=R;return R;
}
/* ---- инвентарь Писаний: save.scriptures — список рангов (повторы = несколько экземпляров) ---- */
function scrList(){return save.scriptures=Array.isArray(save.scriptures)?save.scriptures:[]}
function scrCount(r){return scrList().filter(x=>x===r).length}
function scrGive(r){if(!scrInfo(r))return false;scrList().push(r);persist();return true}
function scrTake(r){const i=scrList().indexOf(r);if(i<0)return false;scrList().splice(i,1);persist();return true}
function scrOwnedRanks(){return [...new Set(scrList())].sort((a,b)=>b-a)}
/* ---- развитие по узору: звёзды и меридианы ставятся со скидкой, сколько хватает Ци и осколков ---- */
function scrDry(r){const inf=scrInfo(r);return soulMemRun(true,scrPattern(r),inf.disc,8)}
function scrApply(r){
 const inf=scrInfo(r);if(!inf||!scrCount(r))return;
 if(starsLocked())return toast('Звёзды закрыты: колонны уже начаты.');
 const res=soulMemRun(false,scrPattern(r),inf.disc,8);
 if(res.stars+res.meridians===0)return toast(res.missStars+res.missEdges===0?'Узор уже полностью расставлен.':'Не хватает Ци и осколков на следующую звезду.');
 try{soulMemUpdate()}catch(e){}persist();if(typeof rebuildTechButtons==='function')rebuildTechButtons(true);
 toast('Писание: расставлено '+res.stars+' ★ и '+res.meridians+' меридиан'+((res.missStars||res.missEdges)?' (дальше не хватило ресурсов)':' — узор завершён')+'.');
 if(typeof updateUI==='function')updateUI();renderScr();
}
function scrMissing(r){const p=scrDry(r);return{stars:p.missStars,edges:p.missEdges,addS:p.stars,addE:p.meridians}}
let scrSel=0;
function openScr(){renderScr();$('scrModal').classList.add('show')}
function closeScr(){$('scrModal').classList.remove('show')}
function renderScr(){
 const el=$('scrBody');if(!el)return;el.innerHTML='';
 const own=scrOwnedRanks();
 if(!own.length){el.innerHTML='<p class="sc-empty">Писаний нет. Они лежат в сундуках, выпадают с существ и продаются у Менялы.</p>';return}
 if(!own.includes(scrSel))scrSel=own[0];
 const tabs=document.createElement('div');tabs.className='row';tabs.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
 for(const r of own){const b=document.createElement('button');b.className='bigbtn'+(r===scrSel?'':' secondary');b.style.cssText='flex:1;min-width:70px;padding:8px 4px;font-size:12px';b.textContent='Ранг '+r+(scrCount(r)>1?' ×'+scrCount(r):'');b.onclick=()=>{scrSel=r;renderScr()};tabs.appendChild(b)}
 el.appendChild(tabs);
 const inf=scrInfo(scrSel),m=scrMissing(scrSel),pat=scrPattern(scrSel),locked=starsLocked();
 const d=document.createElement('div');d.className='scrollcard';
 d.innerHTML='<div class="sc-head"><b>📖 '+inf.name+'</b><span class="sc-tag">ранг '+inf.r+'</span></div><p>'+inf.info+'</p><p class="mline sm">Узор: <b>'+pat.pts.length+' ★</b> и <b>'+pat.edges.length+'</b> меридиан · цена звёзд и меридиан <b>−'+Math.round(inf.disc*100)+'%</b></p><p class="mline sm">В теле не хватает: '+m.stars+' ★ и '+m.edges+' меридиан. Сейчас хватит ресурсов на: <b>'+m.addS+' ★</b> и <b>'+m.addE+'</b> меридиан.</p>'+(locked?'<p class="mline sm">Звёзды закрыты — уже начаты колонны.</p>':'');
 const row=document.createElement('div');row.className='row';const b=document.createElement('button');b.className='bigbtn';b.textContent='Развиваться по Писанию';b.disabled=locked||(m.addS+m.addE===0);b.onclick=()=>scrApply(scrSel);row.appendChild(b);d.appendChild(row);el.appendChild(d);
}
function scrBtnUpdate(){const b=$('scrBtn');if(b)b.style.display=scrList().length?'flex':'none'}
(function(){
 const m=document.createElement('div');m.id='scrModal';m.className='modal';
 m.innerHTML='<div class="sheet"><h3>📖 Развитие с Писанием</h3><div id="scrBody"></div><div class="row"><button class="bigbtn secondary" onclick="closeScr()">Закрыть</button></div></div>';
 document.body.appendChild(m);
 const dock=document.querySelector('.dock');
 if(dock){const b=document.createElement('button');b.className='dockbtn';b.id='scrBtn';b.style.display='none';b.onclick=openScr;b.innerHTML='<b>📖</b><small>Писание</small>';const st=$('starBtn');dock.insertBefore(b,st?st.nextSibling:null)}
})();
/* ---- инвентарь: Писания отдельно от свитков техник ---- */
function renderInvScr(el){
 const h=document.createElement('h4');h.textContent='Писания';el.appendChild(h);
 const own=scrOwnedRanks();
 if(!own.length){const p=document.createElement('p');p.className='sc-empty';p.textContent='Пусто';el.appendChild(p);return}
 for(const r of own){const inf=scrInfo(r),d=document.createElement('div');d.className='scrollcard';
  d.innerHTML='<div class="sc-head"><b>📖 '+inf.name+'</b><span class="sc-tag">ранг '+r+(scrCount(r)>1?' · ×'+scrCount(r):'')+'</span></div><p>'+inf.n+' ★, скидка −'+Math.round(inf.disc*100)+'%. '+inf.info+'</p>';
  el.appendChild(d)}
}
/* ---- Меняла: покупка и продажа ---- */
function renderShopScr(box){
 const p=document.createElement('p');p.textContent='Писания — готовые узоры звёзд и меридиан. Чем выше ранг, тем он реже и дороже. Низшие можно найти в сундуках и на существах.';box.appendChild(p);
 for(const inf of SCRIPTURES){const price=inf.price,k=inf.tier,cnt=scrCount(inf.r);
  const d=document.createElement('div');d.className='scrollcard';d.innerHTML='<div class="sc-head"><b>📖 '+inf.name+'</b><span class="sc-tag">ранг '+inf.r+(cnt?' · есть ×'+cnt:'')+'</span></div><p>'+inf.n+' ★, −'+Math.round(inf.disc*100)+'% к цене. '+inf.info+'</p>';
  const r1=document.createElement('div');r1.className='row';
  const buy=document.createElement('button');buy.className='bigbtn';buy.textContent='Купить · '+costText(k,price);buy.disabled=!canPay(k,price);buy.onclick=()=>{if(!shopPay(k,price))return;scrGive(inf.r);toast('Куплено: '+inf.name);persist();scrBtnUpdate();renderNpc()};r1.appendChild(buy);d.appendChild(r1);
  if(cnt){const r2=document.createElement('div');r2.className='row';const sell=document.createElement('button');sell.className='bigbtn secondary';const sp=Math.floor(price/2);sell.textContent='Продать · +'+costText(k,sp);sell.onclick=()=>{if(!scrTake(inf.r))return;save[k===1?'rewards':k===2?'rewards2':k===3?'rewards3':'rewards4']+=sp;toast('Продано: '+inf.name);persist();scrBtnUpdate();renderNpc()};r2.appendChild(sell);d.appendChild(r2)}
  box.appendChild(d)}
}
/* ---- находки: сундуки, существа, боссы ---- */
function scrRoll(rates,mult){for(let r=SCRIPTURES.length;r>=1;r--){if(Math.random()<rates[r-1]*(mult||1))return r}return 0}
function scrFound(r,src){if(!r)return;scrGive(r);const inf=scrInfo(r);toast('📖 '+src+': «'+inf.name+'» (ранг '+r+')');scrBtnUpdate()}
function scrFromChest(){scrFound(scrRoll(SCR_CHEST),'Из сундука')}
function scrFromMob(e){
 if(e.animal)return;
 if(e.scr>0&&Math.random()<.5){scrFound(e.scr,'Выпало с существа');e.scr=0;return}
 const k=e.isBoss?(e.tier===2?12:6):Math.min(3,.5+(e.stars||0)/60+(e.columns||0)/2);
 scrFound(scrRoll(SCR_DROP,k),'Выпало с существа');
}
/* ---- мобы тоже развиваются по Писаниям: скидка на звёзды и меридианы, пока они не выросли до размера узора ---- */
function scrMobRank(e){if(e.scr==null)e.scr=scrRoll(SCR_DROP,2.5);return e.scr}
function scrMobDisc(e){const r=scrMobRank(e);if(!r)return 0;const inf=scrInfo(r);return (e.stars||0)<inf.n?inf.disc:0}
