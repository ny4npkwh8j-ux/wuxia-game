'use strict';
const SCROLLS={
 stun:{id:'stun',type:'stun',name:'Оцепенение',from:'первого босса',minStars:20,geo:'не меньше 3 звёзд в голове и 3 в ногах, руки не задействованы',check:z=>z.head>=3&&z.leg>=3&&z.hand===0,
  effect:()=>'зажми кнопку на арене на '+castTime(5).toFixed(1)+' с (каждый меридиан ускоряет на 0,1 с). Враги в радиусе 500 получают 10 урона и замирают. Длительность = (4 с + 0,1 с за каждую звезду в технике) × сила стана / (сила стана + сила цели), обе считаются по формуле силы. Цена: 40 Ци + 0,3 за каждую звезду.'},
 blade:{id:'blade',type:'blade',name:'Ци-клинок',from:'третьего босса',minStars:8,geo:'звёзды и в руках, и в ногах, без головы (рука + шаг = клинок)',check:z=>z.hand>=2&&z.leg>=2&&z.head===0,
  effect:()=>'нажми: на 8 с обычный удар бьёт на 130 вперёд широким конусом и сильнее. Перезарядка 14 с.'},
 pull:{id:'pull',type:'pull',name:'Притяжение',from:'четвёртого босса',minStars:8,geo:'только торс, цепочка замкнута в кольцо (последняя звезда соединена меридианом с одной из прежних, не меньше 4 звёзд в кольце)',check:z=>z.hand===0&&z.leg===0&&z.head===0,
  effect:()=>'нажми: 3 с тянет к тебе врагов и сферы, сундуки, точки силы в радиусе 800. Перезарядка 15 с.'},
 repel:{id:'repel',type:'repel',name:'Отталкивание',from:'пятого босса',minStars:25,geo:'звёзды в голове, руках и ногах одновременно («всё тело»), не меньше 2 в каждой зоне',check:z=>z.head>=2&&z.hand>=2&&z.leg>=2,
  effect:()=>'нажми: отбрасывает всех в радиусе 450, небольшой урон, мобы на миг оглушены. Перезарядка 15 с.'},
 mirage:{id:'mirage',type:'mirage',name:'Мираж',from:'шестого босса',minStars:10,geo:'только ноги (и торс), цепочка замкнута в кольцо — «след» вокруг тебя, не меньше 3 звёзд в ногах',check:z=>z.leg>=3&&z.hand===0&&z.head===0,
  effect:()=>'нажми: двойник на 5 с — враги теряют тебя из виду и идут к нему. Перезарядка 20 с.'},
 poison:{id:'poison',type:'poison',name:'Отравление',from:'шестого босса',minStars:6,geo:'одна рука, звёзды руки по прямой линии («игла», не меньше 4 звёзд); без головы и ног',check:z=>z.hand>=4&&z.leg===0&&z.head===0&&(z.leftHand===0||z.rightHand===0),
  effect:()=>'нажми: ближайшая цель в радиусе 450 6 с теряет здоровье и половину Ци, её техники срабатывают реже. Перезарядка 8 с.'},
 qiShield:{id:'qiShield',type:'qiShield',name:'Личный щит',from:'второго босса (Практик)',minStars:20,geo:'не меньше 3 звёзд в голове и по 2 в каждой руке, ноги не задействованы',check:z=>z.head>=3&&z.leftHand>=2&&z.rightHand>=2&&z.leg===0,
  effect:()=>'переключатель на арене, жёлтое свечение по силуэту. Пока включён, после обычного щита урон поглощается за счёт запаса Ци: 1 урона за 0,5 Ци. Когда Ци кончается, щит гаснет.'}
};
const BOSS_SCROLL={1:'stun',2:'qiShield',3:'blade',4:'pull',5:'repel',6:['mirage','poison']};
/* чертежи больше не нужны: любую технику можно собрать самому, а чертёж (выпадение с босса) лишь собирает её автоматически */
function hasScroll(id){return true}
function grantScroll(id){save.scrolls=save.scrolls||[];if(save.scrolls.includes(id))return false;save.scrolls.push(id);persist();return true}
function techniqueZones(nodes){return new Set(nodes.map(i=>starZone(save.starPts[i])))}
function pointInTriangle(p,a,b,c){
 const s=(a.y-c.y)*(p.x-c.x)+(c.x-a.x)*(p.y-c.y),t=(b.y-a.y)*(p.x-a.x)+(a.x-b.x)*(p.y-a.y),u=(c.y-b.y)*(p.x-b.x)+(b.x-c.x)*(p.y-b.x===undefined?0:p.y-b.y);
 return true;
}
function hasEnclosingTriangle(nodes){
 const D={x:0,y:DANTIAN_Y},pts=nodes.map(i=>save.starPts[i]).filter(Boolean);
 const sign=(p1,p2,p3)=>(p1.x-p3.x)*(p2.y-p3.y)-(p2.x-p3.x)*(p1.y-p3.y);
 for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)for(let k=j+1;k<pts.length;k++){
  const a=pts[i],b=pts[j],c=pts[k];
  const d1=sign(D,a,b),d2=sign(D,b,c),d3=sign(D,c,a);
  const hasNeg=(d1<0)||(d2<0)||(d3<0),hasPos=(d1>0)||(d2>0)||(d3>0);
  if(!(hasNeg&&hasPos))return true;
 }
 return false;
}
/* ---- фигуры из звёзд: используются для различения техник с одинаковым набором зон ---- */
/* кольцо: последняя звезда цепочки соединена меридианом с одной из прежних (замкнутый контур из ≥4 звёзд) */
function hasRing(nodes){const k=nodes.length-1;for(let j=0;j<=k-3;j++)if(techConnected(nodes[k],nodes[j]))return true;return false}
/* прямая: звёзды рук лежат почти на одной линии (отклонение ≤7 пикселей) */
function isStraight(nodes){
 const pts=nodes.map(i=>save.starPts[i]).filter(p=>p&&starZone(p).includes('Hand')).map(p=>({x:p.x*210,y:p.y*520}));
 if(pts.length<4)return false;const a=pts[0],b=pts[pts.length-1],L=Math.hypot(b.x-a.x,b.y-a.y);if(L<20)return false;
 for(const p of pts){const dev=Math.abs((b.x-a.x)*(a.y-p.y)-(a.x-p.x)*(b.y-a.y))/L;if(dev>7)return false}
 return true;
}
/* Тип техники = набор зон + (если нужно) фигура:
   голова+руки+ноги — Отталкивание · руки+ноги — Ци-клинок · голова+ноги — Оцепенение · голова+руки — Личный щит · голова — Щит
   ноги — Рывок, а с кольцом — Мираж · одна рука — Удар Ци, по прямой («игла») — Отравление · обе руки — Удар по площади
   только торс — кольцо: Притяжение, треугольник вокруг Дань-тяня: Лечение */
function getTechniqueType(nodes){
 const z=techniqueZones(nodes),left=z.has('leftHand'),right=z.has('rightHand'),hand=left||right,leg=z.has('leftLeg')||z.has('rightLeg'),head=z.has('head');
 if(head&&hand&&leg)return 'repel';
 if(hand&&leg)return 'blade';
 if(head&&leg)return 'stun';
 if(head&&hand)return 'qiShield';
 if(head)return 'shield';
 if(leg)return hasRing(nodes)?'mirage':'dodge';
 if(hand)return (left&&right)?'qiArea':(isStraight(nodes)?'poison':'qiSingle');
 if(hasRing(nodes))return 'pull';
 if(hasEnclosingTriangle(nodes))return 'heal';
 return 'unknown';
}
function techniqueName(type){if(SCROLLS[type]&&['blade','pull','repel','mirage','poison'].includes(type))return SCROLLS[type].name;return type==='heal'?'Лечение':type==='qiShield'?'Личный щит':type==='stun'?'Оцепенение':type==='dodge'?'Рывок':type==='shield'?'Щит':type==='qiSingle'?'Удар Ци · Одиночный':type==='qiArea'?'Удар Ци · По площади':'Неразгаданная техника'}
function techniqueDescription(type,n){
 const t={type,nodes:{length:n}};
 if(type==='stun')return 'Зажми '+castTime(5).toFixed(1)+' с · радиус 500 · урон 10 · перезарядка '+AREA_CD.stun+' с · оглушение до '+stunMaxDur(n).toFixed(1)+' с (сила '+fmt(myMult(t))+' против силы цели) · Ци '+techCost(t)+' · минимум 20 ★.';
 if(type==='qiShield')return 'Личный щит (жёлтое свечение): после щита урон уходит в запас Ци, 1 урона за 0,5 Ци · минимум 20 ★.';
 if(type==='dodge')return 'Рывок на '+Math.round(dashDist(n))+' · перезарядка '+dashCdOf(n).toFixed(1)+' с · Ци '+techCost(t)+' (5% от макс., не больше 3% после 400) · звёзды на обеих ногах, минимум 3 ★.';
 if(type==='shield')return 'Щит: прочность '+fmt(techShieldMax(t))+' · Ци '+techCost(t)+' · минимум 5 ★.';
 if(type==='heal')return 'Держи, пока не отпустишь: 3 Ци = 1 HP (остаток не сгорает), скорость вложения '+healRate(t).toFixed(1)+' Ци/с. Нужен треугольник из звёзд торса вокруг Дань-тяня, минимум 3 ★.';
 if(type==='qiSingle')return 'Держи для набора силы (0,4-1,5x, до 1,2 с) · конус 300 · урон '+fmt(techDamage(t))+' на полной силе: как пуля — первая цель получает весь удар, каждая цель на пути поглощает часть силы (слабых пробивает насквозь, сильная останавливает) · минимум 5 ★ · Ци '+techCost(t)+' на полной силе.';
 if(type==='qiArea')return 'Держи для набора силы (0,4-1,5x, до 1,2 с) · радиус 600 · урон '+fmt(techDamage(t))+' на полной силе: волна идёт от тебя наружу — ближняя цель получает весь удар, каждая цель поглощает часть силы (слабых пробивает, сильная останавливает) · перезарядка '+AREA_CD.qiArea+' с · минимум 15 ★ · Ци '+techCost(t)+' на полной силе.';
 if(TECH2[type]){const P=TECH2[type],t2={type,nodes:{length:n}};return SCROLLS[type].effect()+' · Ци '+techCost(t2)+' · минимум '+MIN_STARS[type]+' ★.'}
 return 'Нужна подходящая геометрия звёзд.';
}
/* какие зоны тела допустимы в маршруте техники (торс разрешён всегда как соединительная зона) */
const TECH_ZONES={shield:{head:1},dodge:{leg:1},qiSingle:{hand:1},qiArea:{hand:1},stun:{head:1,leg:1},qiShield:{head:1,hand:1},heal:{},blade:{hand:1,leg:1},repel:{head:1,hand:1,leg:1},pull:{},mirage:{leg:1},poison:{hand:1}};
/* самый длинный допустимый маршрут по звёздам и меридианам игрока для типа техники (поиск в глубину с ограничением шагов) */
function findBestChain(type,cap=PATH_CAP){
 const zs=TECH_ZONES[type];if(!zs)return null;
 const N=save.starPts.length;if(N<(MIN_STARS[type]||1))return null;
 const adj=Array.from({length:N},()=>[]);
 for(const e of save.meridianEdges){if(e[0]!==e[1]){adj[e[0]].push(e[1]);adj[e[1]].push(e[0])}}
 const single=type==='qiSingle'||type==='poison',sides=single?['leftHand','rightHand']:[null];
 const lim=Math.min(cap,N);let best=null,validations=0;
 for(const side of sides)for(const useBody of (Object.keys(zs).length?[false,true]:[true])){
  const allowed=i=>{const z=starZone(save.starPts[i]);if(z==='body')return useBody;if(z==='head')return !!zs.head;if(z.includes('Hand'))return !!zs.hand&&(!side||z===side);if(z.includes('Leg'))return !!zs.leg;return false};
  const pri=i=>starZone(save.starPts[i])==='body'?1:0;for(const l of adj)l.sort((a,b)=>pri(a)-pri(b));
  validations=0;let steps=0,stepsStart=0;const path=[],used=new Uint8Array(N),minN=MIN_STARS[type]||1;
  const dfs=i=>{
   path.push(i);used[i]=1;
   if(path.length>(best?best.length:0)&&path.length>=minN&&validations<(Object.keys(zs).length?12000:40000)){validations++;const v=validateTechnique(path,true);if(!v.err&&v.type===type)best=path.slice()}
   if(path.length<lim&&steps++<150000&&stepsStart++<12000&&!(best&&best.length>=lim)){for(const j of adj[i]){if(used[j]||!allowed(j))continue;dfs(j);if(best&&best.length>=lim)break}}
   path.pop();used[i]=0;
  };
  const starts=[];for(let i=0;i<N;i++)if(allowed(i)&&adj[i].length)starts.push(i);const dd=i=>Math.hypot(save.starPts[i].x,save.starPts[i].y-DANTIAN_Y);
  starts.sort(Object.keys(zs).length?((a,b)=>pri(a)-pri(b)||adj[b].length-adj[a].length):((a,b)=>dd(a)-dd(b)));
  for(const s0 of starts){if(steps>=150000||(best&&best.length>=lim))break;stepsStart=0;dfs(s0)}
 }
 return best;
}
/* автосборка техники при выпадении: игра сама подбирает наилучший (самый длинный) маршрут из звёзд игрока. Если типа ещё нет — создаётся,
   если есть — заменяется только более длинным маршрутом. Если маршрута нет совсем — выдаётся чертёж-подсказка. */
function autoFormTechnique(type){
 const path=findBestChain(type);
 if(!path){addBlueprint({type,n:PATH_CAP,tier:'high',src:'boss'});return{mode:'bp'}}
 const tech={type,name:techniqueName(type),nodes:path};if(type==='stun')tech.cast=5;
 const ex=save.techniques.findIndex(t=>t.type===type);
 if(ex<0){save.techniques.push(tech);persist();return{mode:'new',n:path.length}}
 if(save.techniques[ex].nodes.length>=path.length){persist();return{mode:'kept',n:save.techniques[ex].nodes.length}}
 save.techniques[ex]=tech;persist();return{mode:'upgraded',n:path.length};
}
function validateTechnique(nodes,dantian){
 if(!dantian)return{err:'Техника должна начинаться с Дан-тяня.'};
 const type=getTechniqueType(nodes);
 if(type==='unknown')return{err:'Не получается техника. Зоны: голова — Щит; ноги — Рывок (кольцо — Мираж); рука — Удар Ци (прямая линия — Отравление); обе руки — Волна; голова+ноги — Оцепенение; голова+руки — Личный щит; руки+ноги — Ци-клинок; всё тело — Отталкивание; торс: треугольник — Лечение, кольцо — Притяжение.'};
 const need=MIN_STARS[type];if(nodes.length<need)return{err:techniqueName(type)+': минимум '+need+' звёзд.'};
 const zc=zoneCounts(nodes);
 if(type==='dodge'&&(zc.leftLeg<1||zc.rightLeg<1))return{err:'Рывок: нужна хотя бы одна звезда на каждой ноге (сейчас '+zc.leftLeg+' и '+zc.rightLeg+').'};
 const sc=SCROLLS[type];
 if(sc){if(!sc.check(zc))return{err:sc.name+': '+sc.geo+'.'}}
 return{type};
}
function finishTechnique(){
 const v=validateTechnique(techPath,techDantian);if(v.err)return toast(v.err);
 const type=v.type,tech={type,name:techniqueName(type),nodes:techPath.slice()};if(type==='stun')tech.cast=5;
 if(editingTech>=0)save.techniques[editingTech]=tech;else save.techniques.push(tech);
 if(bpGuide&&bpGuide.type===type&&bpGuide.tier==='high'&&techPath.length>=bpGuide.n){consumeBlueprint(bpGuide.id);bpGuide=null}
 persist();renderTechList();editingTech=editingTech>=0?editingTech:save.techniques.length-1;drawTech();toast('Техника сохранена: '+tech.name);
}
/* ===== recoloured star sprites for the technique menu (fully lit in the colour of the zone) ===== */
const ZCOL={hand:[255,61,122],leg:[56,240,107],head:[255,226,58],body:[214,226,245],dantian:[181,107,255]};
const ZHEX={hand:'#ff3d7a',leg:'#38f06b',head:'#ffe23a',body:'#d6e2f5',dantian:'#b56bff'};
const zoneSprites={};
function zoneSprite(k){
 if(zoneSprites[k])return zoneSprites[k];const o=SPR.star;if(!o||!o.ok)return null;
 const c=document.createElement('canvas');c.width=c.height=192;const g=c.getContext('2d');g.drawImage(o.img,0,0,192,192);
 const d=g.getImageData(0,0,192,192),px=d.data,col=ZCOL[k];
 for(let i=0;i<px.length;i+=4){const lum=Math.max(px[i],px[i+1],px[i+2])/255,hot=Math.pow(lum,3)*.5,m=.6+.4*lum;px[i]=Math.min(255,col[0]*m+255*hot);px[i+1]=Math.min(255,col[1]*m+255*hot);px[i+2]=Math.min(255,col[2]*m+255*hot)}
 g.putImageData(d,0,0);return zoneSprites[k]=c;
}
function zoneStar(c,x,y,r,k,rot){
 const sp=zoneSprite(k);
 c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.7;const gs=glowSprite?glowSprite(ZHEX[k]):null;if(gs)c.drawImage(gs,x-r*1.9,y-r*1.9,r*3.8,r*3.8);c.restore();
 if(!sp){c.fillStyle=ZHEX[k];c.beginPath();c.arc(x,y,r*.75,0,7);c.fill();return false}
 c.save();c.translate(x,y);c.rotate(rot||0);c.drawImage(sp,-r,-r,r*2,r*2);c.restore();return true;
}
/* ===== scrolls list (generic) ===== */
/* ===== technique buttons (vertical strip, right side, above the attack button) ===== */
const TECH_ICON={qiSingle:'⚡',qiArea:'💥',shield:'🛡️',dodge:'➤',stun:'🌀',qiShield:'✨',heal:'✚',blade:'🗡️',pull:'🧲',repel:'💨',mirage:'👤',poison:'☠️'};
const TECH_SHORT={qiSingle:'УДАР',qiArea:'ВОЛНА',shield:'ЩИТ',dodge:'РЫВОК',stun:'СТАН',qiShield:'ЛИЧНЫЙ',heal:'ЛЕЧЕНИЕ',blade:'КЛИНОК',pull:'ПРИТЯЖ.',repel:'ОТТАЛК.',mirage:'МИРАЖ',poison:'ЯД'};
let techSig='',techPage=0;
/* веер вокруг кнопки АТАКА: три дуги (радиус, число слотов, размах в градусах от «вверх» до «влево») */
const TECH_RINGS=[[100,3,90],[168,5,90],[236,3,60]];
function techSlots(){const out=[];for(const [r,n,span] of TECH_RINGS)for(let i=0;i<n;i++){const a=(n>1?span-span*i/(n-1):0)*Math.PI/180;out.push({x:32-r*Math.sin(a),y:32-r*Math.cos(a)})}return out}
function techVisible(){return techSlots().length}
function rebuildTechButtons(force){
 const list=arenaTechs(),slots=techSlots(),over=list.length>slots.length,vis=over?slots.length-1:slots.length;techPage=Math.max(0,Math.min(techPage,Math.max(0,list.length-vis)));
 const sig=list.map(t=>t.type).join('|')+'#'+techPage+(arenaState&&arenaState.poss?'P':'');if(!force&&sig===techSig)return;techSig=sig;
 const col=$('techCol');col.innerHTML='';
 const mk=(cls,html)=>{const b=document.createElement('button');b.className=cls;b.innerHTML=html;return b};
 const put=(b,s,w,h)=>{b.style.left=(s.x-w/2)+'px';b.style.top=(s.y-h/2)+'px'};
 let n=0;
 for(let k=techPage;k<Math.min(list.length,techPage+vis);k++){
  const t=list[k],b=mk('skill tbtn'+(t.type==='qiSingle'?' attack':'')+(t.type==='stun'?' stun':'')+(t.type==='qiShield'?' qis':''),TECH_ICON[t.type]+'<small></small>'+(t.type==='qiSingle'?'<span class="aimdot"></span>':'')+'<i class="cdov"></i><em class="hk">'+(k<9?k+1:k===9?'0':'')+'</em>');
  b.dataset.i=k;put(b,slots[n++],58,58);bindTechButton(b,k,t.type);col.appendChild(b);
 }
 if(over){const pg=mk('skill pager','⟳ '+(techPage>0?Math.ceil(techPage/vis)+1:1)+'/'+Math.ceil(list.length/vis));put(pg,slots[slots.length-1],46,30);pg.onclick=()=>{techPage=techPage+vis>=list.length?0:Math.min(techPage+vis,list.length-vis);rebuildTechButtons()};pg.addEventListener('pointerdown',e=>e.stopPropagation());col.appendChild(pg)}
}
function bindTechButton(b,k,type){
 const T=()=>arenaTechs()[k],stop=e=>{e.preventDefault();e.stopPropagation()};
 if(type==='qiSingle'){b.addEventListener('pointerdown',()=>beginQiCharge('qiSingle'));wireAimButton(b,b.querySelector('.aimdot'),()=>endQiCharge('qiSingle',T()));b.addEventListener('pointercancel',()=>cancelQiCharge('qiSingle'));return}
 if(type==='qiArea'){b.addEventListener('pointerdown',e=>{stop(e);b.setPointerCapture?.(e.pointerId);beginQiCharge('qiArea')});b.addEventListener('pointerup',e=>{stop(e);endQiCharge('qiArea',T())});b.addEventListener('pointercancel',()=>cancelQiCharge('qiArea'));b.addEventListener('lostpointercapture',()=>cancelQiCharge('qiArea'));return}
 if(type==='stun'){b.addEventListener('pointerdown',e=>{stop(e);b.setPointerCapture?.(e.pointerId);beginChannel(T())});b.addEventListener('pointerup',e=>{stop(e);endChannel()});b.addEventListener('pointercancel',endChannel);b.addEventListener('lostpointercapture',endChannel);return}
 if(type==='heal'){b.addEventListener('pointerdown',e=>{stop(e);b.setPointerCapture?.(e.pointerId);beginHeal(T())});b.addEventListener('pointerup',e=>{stop(e);endHeal()});b.addEventListener('pointercancel',endHeal);b.addEventListener('lostpointercapture',endHeal);return}
 b.addEventListener('pointerdown',e=>{stop(e);const t=T();if(type==='shield')activateShield(t);else if(type==='dodge')startDash(t);else if(type==='qiShield')toggleQiShield();else if(TECH2[type])activateTech2(t)});
}
/* ===== technique blueprints (drops) ===== */
let bpGuide=null;
const BP_TIER={low:'плохое качество',mid:'среднее качество',high:'высокое качество'};
const ZNAME={head:'в голове',leftHand:'в левой руке',rightHand:'в правой руке',leftLeg:'в левой ноге',rightLeg:'в правой ноге',body:'в торсе'};
function bpQuota(type,n){
 const q={head:0,leftHand:0,rightHand:0,leftLeg:0,rightLeg:0,body:0};
 if(type==='shield')q.head=Math.max(3,Math.ceil(n*.7));
 else if(type==='dodge')q.leftLeg=q.rightLeg=Math.max(1,Math.floor(n*.4));
 else if(type==='qiSingle')q.rightHand=Math.max(3,Math.ceil(n*.7));
 else if(type==='qiArea')q.leftHand=q.rightHand=Math.max(2,Math.ceil(n*.35));
 else if(type==='stun'){q.head=Math.max(3,Math.ceil(n*.3));q.leftLeg=q.rightLeg=Math.max(2,Math.ceil(n*.25))}
 else if(type==='qiShield'){q.head=Math.max(3,Math.ceil(n*.3));q.leftHand=q.rightHand=Math.max(2,Math.ceil(n*.25))}
 else if(type==='blade'){q.rightHand=Math.max(2,Math.ceil(n*.3));q.rightLeg=Math.max(2,Math.ceil(n*.3))}
 else if(type==='repel'){q.head=q.rightHand=q.rightLeg=Math.max(2,Math.ceil(n*.2))}
 else if(type==='mirage'){q.leftLeg=q.rightLeg=Math.max(2,Math.ceil(n*.3))}
 else if(type==='poison'){q.rightHand=Math.max(4,Math.ceil(n*.7))}
 const used=q.head+q.leftHand+q.rightHand+q.leftLeg+q.rightLeg;q.body=Math.max(0,n-used);return q;
}
function bpText(bp){
 const q=bpQuota(bp.type,bp.n),parts=[];for(const k in q)if(q[k]>0)parts.push(q[k]+' '+ZNAME[k]);
 return techniqueName(bp.type)+' на '+bp.n+' ★: около '+parts.join(', ')+'. Звёзды соединяются меридианами, начало у Дань-тяня.';
}
function bpSlots(bp){
 const q=bpQuota(bp.type,bp.n),out=[];
 for(const z in q)for(let i=0;i<q[z];i++){const sl=SLOTS[z][i%SLOTS[z].length];out.push({x:sl[0]+(i>=SLOTS[z].length?.02:0),y:sl[1],k:zoneKey(starZone({x:sl[0],y:sl[1]}))})}
 return out;
}
function drawBpPicture(cv,bp){
 const g=cv.getContext('2d'),w=cv.width,h=cv.height;g.clearRect(0,0,w,h);g.fillStyle='#0b1224';g.fillRect(0,0,w,h);
 if(bodyImage.complete&&bodyImage.naturalWidth)g.drawImage(bodyImage,0,0,w,h);
 const dx=w/2,dy=(DANTIAN_Y+.5)*h;zoneStar(g,dx,dy,9,'dantian',0);
 bpSlots(bp).forEach((s,i)=>zoneStar(g,(s.x+.5)*w,(s.y+.5)*h,7,s.k,i*.9));
}
function drawBpGuide(c,w,h){
 if(!bpGuide)return;const k=techK(h);
 c.save();c.globalAlpha=.9;
 bpSlots(bpGuide).forEach((s,i)=>{const q=techPoint(s,w,h);c.strokeStyle='#ffffff';c.lineWidth=1.4;c.setLineDash([3,3]);c.beginPath();c.arc(q.x,q.y,9*Math.sqrt(techZoom),0,7);c.stroke()});
 c.restore();c.setLineDash([]);
}
function addBlueprint(bp){
 bp.id='bp'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
 save.blueprints.push(bp);if(save.blueprints.length>40){const i=save.blueprints.findIndex(b=>b.tier==='low');save.blueprints.splice(i>=0?i:0,1)}
 if(SCROLLS[bp.type])grantScroll(bp.type);persist();return bp;
}
function consumeBlueprint(id){const i=save.blueprints.findIndex(b=>b.id===id);if(i>=0)save.blueprints.splice(i,1);persist()}
async function deleteBlueprint(id){if(!await confirmDialog('Удалить эту схему?','Удалить'))return;consumeBlueprint(id);renderScrolls()}
/* ---- auto-install: find a chain of stars connected by meridians that satisfies the technique rules ---- */
function findChain(n,allowed,ok){
 const N=save.starPts.length,adj=Array.from({length:N},()=>[]);
 for(const e of save.meridianEdges){const a=e[0],b=e[1];if(a!==b&&allowed(a)&&allowed(b)){adj[a].push(b);adj[b].push(a)}}
 const pri=i=>starZone(save.starPts[i])==='body'?1:0;for(const l of adj)l.sort((a,b)=>pri(a)-pri(b));
 let steps=0;const cap=300000,path=[],used=new Uint8Array(N);
 const dfs=i=>{
  path.push(i);used[i]=1;
  if(path.length===n){if(ok(path))return true}
  else if(steps++<cap){for(const j of adj[i]){if(used[j])continue;if(dfs(j))return true;if(steps>=cap)break}}
  path.pop();used[i]=0;return false;
 };
 const starts=[];for(let i=0;i<N;i++)if(allowed(i)&&adj[i].length)starts.push(i);starts.sort((a,b)=>adj[b].length-adj[a].length);
 for(const s0 of starts){if(steps>=cap)break;if(dfs(s0))return path.slice()}
 return null;
}
function bpAutoInstall(id){
 const bp=save.blueprints.find(b=>b.id===id);if(!bp)return;
 if(bp.n>save.stars)return toast('Не хватает звёзд: нужно '+bp.n+', сейчас '+save.stars+'.');
 const T=bp.type,sides=T==='qiSingle'?['leftHand','rightHand']:[null];let path=null;
 for(const side of sides){
  const allowed=i=>{const z=starZone(save.starPts[i]);if(z==='body')return true;if(T==='shield')return z==='head';if(T==='dodge')return z.includes('Leg');if(T==='qiSingle')return z===side;if(T==='qiArea')return z.includes('Hand');if(T==='stun')return z==='head'||z.includes('Leg');if(T==='qiShield')return z==='head'||z.includes('Hand');return false};
  path=findChain(bp.n,allowed,p=>{const v=validateTechnique(p,true);return !v.err&&v.type===T});if(path)break;
 }
 if(!path)return toast('Не удалось подобрать цепочку из '+bp.n+' звёзд с меридианами. Добавьте звёзды и меридианы нужных зон или соберите технику сами.');
 const tech={type:T,name:techniqueName(T),nodes:path};if(T==='stun')tech.cast=5;
 save.techniques.push(tech);consumeBlueprint(id);persist();renderScrolls();toast('Техника установлена: '+tech.name+' · '+bp.n+' ★');
}
function bpManual(id){
 const bp=save.blueprints.find(b=>b.id===id);if(!bp)return;
 bpGuide=bp;closeScrolls();openTechnique();bpGuide=bp;drawTech();
}
function renderBlueprints(el){
 const h=document.createElement('h4');h.textContent='Чертежи';h.style.margin='12px 0 6px';el.appendChild(h);
 if(!save.blueprints.length){const p=document.createElement('p');p.style.cssText='font-size:12px;color:#8794ad';p.textContent='Пусто';el.appendChild(p);return}
 for(const bp of save.blueprints){
  const d=document.createElement('div');d.className='scrollcard';
  d.innerHTML='<div class="sc-head"><b>'+(bp.tier==='high'?'📜 ':'📄 ')+techniqueName(bp.type)+' · '+bp.n+' ★</b><span class="sc-tag">'+BP_TIER[bp.tier]+'</span></div><p>'+bpText(bp)+'</p>';
  if(bp.tier!=='low'){const cv=document.createElement('canvas');cv.width=130;cv.height=323;cv.style.cssText='display:block;margin:6px auto;border-radius:10px;border:1px solid #435071';d.appendChild(cv);drawBpPicture(cv,bp)}
  const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:6px';
  const mk=(t,f)=>{const b=document.createElement('button');b.className='bigbtn';b.style.flex='1';b.textContent=t;b.onclick=f;row.appendChild(b)};
  if(bp.tier==='high'){mk('Установить автоматически',()=>bpAutoInstall(bp.id));mk('Собрать самому',()=>bpManual(bp.id))}
  else mk('Удалить схему',()=>deleteBlueprint(bp.id));
  d.appendChild(row);el.appendChild(d);
 }
}
/* ===== technique canvas: zoom and pan ===== */
let techZoom=1,techPanX=0,techPanY=0;
function techBaseK(h){return Math.max(.42,Math.min(.72,(h-24)/540))}
function techK(h){return techBaseK(h)*techZoom}
function techOX(w){return w/2+techPanX}
function techCY(h){const k=techBaseK(h);return h/2-Math.min(20,Math.max(0,(h-520*k)/2-6))+techPanY}
function techZoomBy(f,cx,cy){
 const r=tc.getBoundingClientRect(),w=r.width,h=r.height,old=techZoom;techZoom=Math.max(.6,Math.min(4,techZoom*f));
 const px=(cx===undefined?w/2:cx-r.left),py=(cy===undefined?h/2:cy-r.top),k=techZoom/old;
 techPanX+=(px-techOX(w))*(1-k);techPanY+=(py-techCY(h))*(1-k);
 // (techOX/techCY already include the old pan while computing the shift)
 drawTech();
}
function techZoomReset(){techZoom=1;techPanX=0;techPanY=0;drawTech()}
const tcPtr=new Map();let tcPinch=0,tcMoved=false;
function techTap(e){
 const r=tc.getBoundingClientRect(),w=r.width,h=r.height,dp=dantianPoint(w,h);
 if(Math.hypot(e.clientX-r.left-dp.x,e.clientY-r.top-dp.y)<24){techDantian=true;drawTech();return}
 let best=-1,bd=22;save.starPts.forEach((p,i)=>{const q=techPoint(p,w,h),d=Math.hypot(e.clientX-r.left-q.x,e.clientY-r.top-q.y);if(d<bd){bd=d;best=i}});
 if(best<0)return;
 if(techPath.includes(best)){const idx=techPath.indexOf(best);techPath=techPath.slice(0,idx);drawTech();return}
 if(!techDantian)return toast('Сначала нажми Дань-тянь.');
 if(techPath.length&&!techConnected(techPath[techPath.length-1],best))return toast('Следующая звезда должна быть соединена меридианом.');
 techPath.push(best);drawTech();
}
function initTechZoom(){
tc.style.touchAction='none';
tc.addEventListener('pointerdown',e=>{try{tc.setPointerCapture(e.pointerId)}catch(_){}tcPtr.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});if(tcPtr.size===1)tcMoved=false;if(tcPtr.size===2){const v=[...tcPtr.values()];tcPinch=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);tcMoved=true}});
tc.addEventListener('pointermove',e=>{
 const p=tcPtr.get(e.pointerId);if(!p)return;
 if(tcPtr.size>=2){p.x=e.clientX;p.y=e.clientY;const v=[...tcPtr.values()],d=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);if(tcPinch>0)techZoomBy(d/tcPinch,(v[0].x+v[1].x)/2,(v[0].y+v[1].y)/2);tcPinch=d;tcMoved=true;return}
 if(!tcMoved&&Math.hypot(e.clientX-p.sx,e.clientY-p.sy)<9)return;
 tcMoved=true;techPanX+=e.clientX-p.x;techPanY+=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;drawTech();
});
const tcEnd=e=>{const had=tcPtr.has(e.pointerId),n=tcPtr.size;tcPtr.delete(e.pointerId);if(!had)return;if(e.type==='pointerup'&&n===1&&!tcMoved)techTap(e);if(tcPtr.size===0){tcMoved=false;tcPinch=0}};
tc.addEventListener('pointerup',tcEnd);tc.addEventListener('pointercancel',tcEnd);
tc.addEventListener('wheel',e=>{e.preventDefault();techZoomBy(e.deltaY<0?1.15:.87,e.clientX,e.clientY)},{passive:false});
}
function techPoint(p,w,h){const k=techK(h);return{x:techOX(w)+p.x*210*k,y:techCY(h)+p.y*520*k}}
let techPath=[];let editingTech=-1;let techDantian=false;const tc=$('techCanvas'),tctx=tc.getContext('2d');initTechZoom();
function openTechnique(){techZoom=1;techPanX=0;techPanY=0;$('techModal').classList.add('show');techPath=[];editingTech=-1;techDantian=false;resizeTech();renderTechList();drawTech()}
function closeTechnique(){bpGuide=null;if($('techModal').classList.contains('show'))$('techModal').classList.remove('show');techPath=[];editingTech=-1;techDantian=false}
function clearTechniquePath(){techPath=[];editingTech=-1;techDantian=false;renderTechList();drawTech()}
function resizeTech(){const r=tc.parentElement.getBoundingClientRect();tc.width=Math.max(1,Math.floor(r.width*devicePixelRatio));tc.height=Math.max(1,Math.floor(r.height*devicePixelRatio));drawTech()}
function techConnected(a,b){return save.meridianEdges.some(e=>(e[0]===a&&e[1]===b)||(e[0]===b&&e[1]===a))}
function renderTechList(){const el=$('techList');el.innerHTML='';if(!save.techniques.length){el.innerHTML='<span style="color:#8794ad;font-size:11px">Сохранённых техник пока нет.</span>';return}save.techniques.forEach((t,i)=>{const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;margin-bottom:5px';const b=document.createElement('button');b.textContent=(i===editingTech?'✓ ':'')+t.name;b.className=i===editingTech?'active':'';b.style.flex='1';b.onclick=()=>loadTechnique(i);const d=document.createElement('button');d.textContent='×';d.title='Удалить технику';d.style.cssText='width:42px;color:#ff9b9b';d.onclick=e=>{e.stopPropagation();deleteTechnique(i)};row.append(b,d);el.appendChild(row)})}
function deleteTechnique(i){if(!save.techniques[i])return;const name=save.techniques[i].name;save.techniques.splice(i,1);if(editingTech===i){editingTech=-1;techPath=[];techDantian=false}else if(editingTech>i){editingTech--}persist();renderTechList();drawTech();toast('Техника удалена: '+name)}
function loadTechnique(i){const t=save.techniques[i];if(!t)return;editingTech=i;techDantian=true;techPath=t.nodes.slice();renderTechList();drawTech()}
function drawTech(){const w=tc.width/devicePixelRatio,h=tc.height/devicePixelRatio;tctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);tctx.clearRect(0,0,w,h);tctx.save();tctx.globalAlpha=.55;if(bodyImage.complete&&bodyImage.naturalWidth)tctx.drawImage(bodyImage,techOX(w)-105*techK(h),techCY(h)-260*techK(h),210*techK(h),520*techK(h));tctx.restore();tctx.strokeStyle='#f0b92e77';tctx.lineWidth=1.2;for(const [a,b] of save.meridianEdges){const p=techPoint(save.starPts[a],w,h),q=techPoint(save.starPts[b],w,h);tctx.beginPath();tctx.moveTo(p.x,p.y);tctx.lineTo(q.x,q.y);tctx.stroke()}const dp=dantianPoint(w,h);zoneStar(tctx,dp.x,dp.y,techDantian?16:13,'dantian',0);if(techDantian){tctx.strokeStyle='#fff';tctx.lineWidth=2.4;tctx.beginPath();tctx.arc(dp.x,dp.y,13,0,7);tctx.stroke()}tctx.fillStyle='#1a0a00';tctx.font='bold 10px sans-serif';tctx.textAlign='center';tctx.fillText('丹',dp.x,dp.y+3.5);save.techniques.forEach((t,ti)=>{const col=ti===editingTech?'#fff1a0':'#c58cff';if(t.nodes.length){tctx.strokeStyle=col+'66';tctx.lineWidth=2;tctx.beginPath();const a=techPoint(save.starPts[t.nodes[0]],w,h);tctx.moveTo(dp.x,dp.y);tctx.lineTo(a.x,a.y);for(let j=1;j<t.nodes.length;j++){const q=techPoint(save.starPts[t.nodes[j]],w,h);tctx.lineTo(q.x,q.y)}tctx.stroke()}});save.starPts.forEach((p,i)=>{const q=techPoint(p,w,h),sel=techPath.includes(i),zk=zoneKey(starZone(p)),r=(sel?15:11)*Math.sqrt(techZoom);zoneStar(tctx,q.x,q.y,r,zk,i*.9);if(sel){tctx.strokeStyle='#fff';tctx.lineWidth=2.2;tctx.beginPath();tctx.arc(q.x,q.y,r*.8,0,7);tctx.stroke()}tctx.fillStyle='#1a0a00';tctx.font='bold 8px sans-serif';tctx.textAlign='center';tctx.fillText(i+1,q.x,q.y+3)});drawBpGuide(tctx,w,h);if(techDantian&&techPath.length){tctx.strokeStyle='#fff1a0';tctx.lineWidth=4;tctx.beginPath();const first=techPoint(save.starPts[techPath[0]],w,h);tctx.moveTo(dp.x,dp.y);tctx.lineTo(first.x,first.y);for(let i=1;i<techPath.length;i++){const q=techPoint(save.starPts[techPath[i]],w,h);tctx.lineTo(q.x,q.y)}tctx.stroke()}const n=techPath.length,type=techDantian?getTechniqueType(techPath):'unknown';$('techPath').textContent='Путь: '+(techDantian?'Дан-тянь → ':'')+n+' звёзд';const sc=SCROLLS[type],need=MIN_STARS[type]||3,zc=zoneCounts(techPath);let info=n<need?'Нужно минимум '+need+' звёзд. Ещё '+(need-n)+'.':techniqueName(type)+' · '+techniqueDescription(type,n);if(techDantian&&sc)info+=' · '+sc.geo+(hasScroll(type)?'':' · 🔒 нужен свиток');if(techDantian&&type==='dodge')info+=' · ноги: '+zc.leftLeg+' и '+zc.rightLeg+' (нужно ≥1 на каждой)';if(bpGuide)info+=' · Чертёж: '+techniqueName(bpGuide.type)+' на '+bpGuide.n+' ★';$('techInfo').textContent=info}
