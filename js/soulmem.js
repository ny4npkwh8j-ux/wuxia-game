'use strict';
/* ===== Память души: тело — носитель, душа — информация =====
   Душа помнит максимальную расстановку звёзд и меридианов (save.soulMem = {pts,edges}). Если основное тело погибло, душа продолжает играть;
   захваченное тело становится основным и получает столько звёзд, сколько их у самого тела (расставлены по образу памяти, меридианов нет).
   Одной кнопкой душа достраивает образ за ресурсы — столько, на сколько хватает; новые звёзды и меридианы дописываются в память. */
const STAR_STAT={qi:10,dan:1,str:.9,spd:.1,hp:4};/* те же прибавки, что при обычной постановке звезды */
function soulMemUpdate(){
 if(typeof hasSoul!=='function'||!hasSoul()||!Array.isArray(save.starPts))return;
 const m=save.soulMem,n=save.starPts.length,e=(save.meridianEdges||[]).length;
 if(!m||n>m.pts.length||(n===m.pts.length&&e>m.edges.length))save.soulMem={pts:save.starPts.map(p=>[+p.x.toFixed(4),+p.y.toFixed(4)]),edges:(save.meridianEdges||[]).map(a=>[a[0],a[1]])};
}
function soulStarStats(d){
 save.maxQi=Math.max(100,save.maxQi+STAR_STAT.qi*d);save.dantian=Math.max(0,save.dantian+STAR_STAT.dan*d);save.str=Math.max(1,save.str+STAR_STAT.str*d);save.spd=Math.max(1,save.spd+STAR_STAT.spd*d);save.health=Math.max(10,save.health+STAR_STAT.hp*d);
}
/* тело (n звёзд, без меридианов) становится основным: расстановка берётся из памяти души */
function soulBodyAdopt(n,e){
 soulMemUpdate();const mem=save.soulMem||{pts:[],edges:[]},pts=[];
 for(let i=0;i<n&&i<mem.pts.length;i++)pts.push({x:mem.pts[i][0],y:mem.pts[i][1]});
 if(pts.length<n&&typeof formPts==='function'){const extra=formPts((e&&e.pseed)||7,n);for(let i=pts.length;i<n&&i<extra.length;i++)pts.push({x:extra[i][0],y:extra[i][1]})}
 const k=pts.length;soulStarStats(k-(save.stars||0));
 save.starPts=pts;save.meridianEdges=[];save.stars=k;save.meridians=0;save.qi=Math.min(save.qi,save.maxQi);
}
/* достройка по памяти. dry=true — только расчёт (всё возвращается как было) */
function soulMemRun(dry){
 const m=save.soulMem;if(!m)return{stars:0,meridians:0,missStars:0,missEdges:0};
 const bk=dry?JSON.parse(JSON.stringify({starPts:save.starPts,meridianEdges:save.meridianEdges,stars:save.stars,meridians:save.meridians,qi:save.qi,rewards:save.rewards,maxQi:save.maxQi,dantian:save.dantian,str:save.str,spd:save.spd,health:save.health})):null;
 const near=(p,q)=>Math.hypot((p.x-q[0])*210,(p.y-q[1])*520)<2;
 let addS=0,addE=0,stop=false;
 const idx=new Array(m.pts.length).fill(-1);
 m.pts.forEach((q,i)=>{const j=save.starPts.findIndex(p=>near(p,q));if(j>=0)idx[i]=j});
 for(let i=0;i<m.pts.length&&!stop;i++){
  if(idx[i]>=0)continue;const p={x:m.pts[i][0],y:m.pts[i][1]},cost=starCostAt(p);
  if(!canAfford(cost)){stop=true;break}
  spendStarCost(cost);save.stars++;soulStarStats(1);save.starPts.push(p);idx[i]=save.starPts.length-1;addS++;
 }
 for(const [a,b] of m.edges){
  const x=idx[a],y=idx[b];if(x==null||y==null||x<0||y<0)continue;
  if(save.meridianEdges.some(e=>(e[0]===x&&e[1]===y)||(e[0]===y&&e[1]===x)))continue;
  const p=save.starPts[x],q=save.starPts[y];if(typeof segmentInsideBody==='function'&&!segmentInsideBody(p,q))continue;
  const cost=meridianCost();if(!canAfford(cost))break;
  spendStarCost(cost);save.meridianEdges.push([x,y]);save.meridians++;addE++;
 }
 const missS=idx.filter(v=>v<0).length,missE=m.edges.filter(([a,b])=>idx[a]<0||idx[b]<0||!save.meridianEdges.some(e=>(e[0]===idx[a]&&e[1]===idx[b])||(e[0]===idx[b]&&e[1]===idx[a]))).length;
 if(dry)Object.assign(save,bk);
 return{stars:addS,meridians:addE,missStars:missS,missEdges:missE};
}
function soulMemApply(){
 const r=soulMemRun(false);
 if(r.stars+r.meridians===0)return toast('Нечего восстанавливать или не хватает ресурсов (нужны Ци и осколки души).');
 soulMemUpdate();persist();if(typeof rebuildTechButtons==='function')rebuildTechButtons(true);
 toast('Память души: расставлено '+r.stars+' ★ и '+r.meridians+' меридианов'+((r.missStars||r.missEdges)?' (не хватило ресурсов на остальное)':'')+'.');renderSoul&&renderSoul();
}
function renderSoulMem(){
 const box=$('soulMemForm');if(!box)return;
 if(!hasSoul()||!save.soulMem){box.style.display='none';return}
 box.style.display='block';const m=save.soulMem,r=soulMemRun(true),lost=!!save.bodyLost;
 box.innerHTML='<p class="mline"><b>Память души</b> · образ: <b>'+m.pts.length+' ★</b> и <b>'+m.edges.length+'</b> меридианов</p><p class="mline sm">В теле сейчас: '+(save.stars||0)+' ★, '+(save.meridians||0)+' меридианов. Можно расставить сразу: '+r.stars+' ★ и '+r.meridians+' меридианов (за Ци и осколки души, сколько хватит).'+(lost?' <b>Основное тело потеряно</b> — захвати новое, оно станет основным.':'')+'</p><div class="row"><button class="bigbtn secondary" '+(r.stars+r.meridians>0?'':'disabled')+' onclick="soulMemApply()">Восстановить образ из памяти</button></div>';
}
/* основное тело погибло, а душа есть: она выходит и играет дальше (штрафа отката нет — потеряно тело). Вернуть true, если обработано */
function soulBodyDeath(s){
 if(!hasSoul()||s.soulOut||s.poss||save.bodyLost)return false;
 soulMemUpdate();
 s.body={x:s.px,y:s.py,hp:0,maxHp:s.maxHp,dead:true,hit:0,ang:s.facing||0};s.soulOut=true;save.bodyLost=true;s.possCh=null;{const tk=soulTakeQi();save.soulQi=tk.soul;save.soulLent=0;save.qi=0}
 try{playerKilledByBoss(s)}catch(e){}
 s.hp=s.maxHp;s.shield=0;s.invuln=1.5;
 burst(s.px,s.py,30,'#ff5a5a',300,.9,3);toast('Основное тело погибло! Душа продолжает путь. Захвати новое тело — оно станет основным.');chron('Игрок потерял тело, душа продолжает');
 if(typeof rebuildTechButtons==='function')rebuildTechButtons(true);persist();return true;
}
/* захват при потерянном основном теле: тело навсегда становится основным */
function possMakeMain(e){
 const s=arenaState;if(!s)return;
 const n=Math.max(0,Math.floor(e.stars||0));
 const fr=soulFrac();soulBodyAdopt(n,e);
 e.vessel=false;e.removed=true;e.hp=0;e.foeId=null;if(typeof sectLeave==='function'&&e.sect!=null)try{sectLeave(e)}catch(x){}
 s.poss=null;s.body=null;s.soulOut=false;save.bodyLost=false;save.qi=Math.min(save.maxQi,Math.round(save.maxQi*fr));save.soulLent=0;save.soulQi=null;
 s.maxHp=save.health;s.hp=s.maxHp;s.shield=0;s.invuln=1.5;s.px=e.x;s.py=e.y;
 persist();if(typeof rebuildTechButtons==='function')rebuildTechButtons(true);
 burst(s.px,s.py,36,'#ffd23a',320,1,3.4);toast('Тело стало основным: '+save.stars+' ★. Память души поможет достроить образ.');chron('Игрок обрёл новое основное тело ('+save.stars+' ★)');
}
/* возрождение после гибели души без тела: пустое тело (0 звёзд) в тихом месте */
function soulRespawnEmpty(){if(!save.bodyLost)return;soulBodyAdopt(0,null);save.bodyLost=false}
function techOk(t){return (t.nodes||[]).every(i=>i<save.starPts.length)}
