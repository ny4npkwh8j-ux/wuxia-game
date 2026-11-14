'use strict';
/* ===== Магический язык техник: мелкие подзоны тела и разбор цепочки звёзд во «фразу» =====
   Патч 1: только разбор и подсказка в редакторе, бой не меняется. Крупные зоны (starZone) выводятся из подзон, поэтому
   старые техники работают как раньше. */
const SUBZ={
 mind:{n:'темя',m:'Разум'},sense:{n:'лицо и шея',m:'Чувство'},
 shoulder:{n:'плечо',m:'Опора'},forearm:{n:'предплечье',m:'Ход'},palm:{n:'кисть',m:'Выпуск'},
 chest:{n:'грудь',m:'Дыхание'},root:{n:'живот',m:'Корень'},
 thigh:{n:'бедро',m:'Шаг'},shin:{n:'голень',m:'Устой'},foot:{n:'стопа',m:'Земля'}
};
/* подзона точки: {k:ключ, side:-1|0|1} (side: −1 левая, +1 правая — «Инь/Ян») */
function starSubZone(p){
 const z=starZone(p),y=p.y,side=p.x<0?-1:1;
 if(z==='head')return{k:y<-.43?'mind':'sense',side:0};
 if(z==='leftHand'||z==='rightHand')return{k:y<-.22?'shoulder':y<-.04?'forearm':'palm',side};
 if(z==='leftLeg'||z==='rightLeg')return{k:y<.25?'thigh':y<.43?'shin':'foot',side};
 return{k:y<-.14?'chest':'root',side:0};
}
const LANG_VERB={qiSingle:'Ударить',qiArea:'Ударить (область)',shield:'Заслонить',dodge:'Сместить (рывок)',stun:'Связать',qiShield:'Заслонить (личный)',heal:'Исцелить',blade:'Ударить (клинок)',pull:'Притянуть',repel:'Оттолкнуть',mirage:'Иллюзия',poison:'Отравить'};
const LANG_ANCHOR={self:'на себе',front:'перед собой',target:'на цели',ground:'на земле'};
const LANG_SHAPE={point:'точка',cone:'конус',beam:'луч',wall:'стена',ring:'кольцо',orbit:'вихрь',sphere:'сфера',chain:'цепь',slash:'взмах'};
/* разбор цепочки: якорь, форма, глагол, параметры 0…1 */
function techPhrase(nodes){
 const P=nodes.map(i=>save.starPts[i]).filter(Boolean),n=P.length;
 if(n<1)return null;
 const sub={},side={l:0,r:0};
 for(const p of P){const s=starSubZone(p);sub[s.k]=(sub[s.k]||0)+1;if(s.side<0)side.l++;else if(s.side>0)side.r++}
 const px=P.map(p=>({x:p.x*210,y:p.y*520}));
 let len=0,turn=0,sharp=0;
 for(let i=1;i<px.length;i++)len+=Math.hypot(px[i].x-px[i-1].x,px[i].y-px[i-1].y);
 for(let i=2;i<px.length;i++){const a1=Math.atan2(px[i-1].y-px[i-2].y,px[i-1].x-px[i-2].x),a2=Math.atan2(px[i].y-px[i-1].y,px[i].x-px[i-1].x);let d=a2-a1;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;turn+=d;sharp+=Math.abs(d)}
 const xs=px.map(p=>p.x),ys=px.map(p=>p.y),bw=Math.max(...xs)-Math.min(...xs),bh=Math.max(...ys)-Math.min(...ys),diag=Math.hypot(bw,bh);
 const a=px[0],b=px[px.length-1],dx=b.x-a.x,dy=b.y-a.y,ang=Math.atan2(dy,dx);
 /* перекрёстные меридианы внутри цепочки — «плотность» (твёрдость) */
 const set=new Set(nodes);let cross=0;for(const e of save.meridianEdges)if(set.has(e[0])&&set.has(e[1]))cross++;cross=Math.max(0,cross-(n-1));
 const cnt=k=>sub[k]||0,front=cnt('forearm')+cnt('palm'),ground=cnt('foot')+cnt('shin'),mind=cnt('mind')+cnt('sense'),selfz=cnt('chest')+cnt('root');
 const anchor=front>=Math.max(ground,mind)&&front>0?'front':ground>mind&&ground>0?'ground':mind>0?'target':'self';
 /* форма — по геометрии пути: прямизна (отклонение от хорды), замкнутость (площадь петли), охват вокруг центра (вихрь), излом (цепь) */
 const chord=Math.hypot(dx,dy)||1;let maxDev=0;for(const q of px)maxDev=Math.max(maxDev,Math.abs(dx*(a.y-q.y)-(a.x-q.x)*dy)/chord);
 let area=0;for(let i=0;i<px.length;i++){const q=px[i],r=px[(i+1)%px.length];area+=q.x*r.y-r.x*q.y}area=Math.abs(area)/2;
 const cx=xs.reduce((s,v)=>s+v,0)/n,cy=ys.reduce((s,v)=>s+v,0)/n;let sweep=0;
 for(let i=1;i<px.length;i++){let d=Math.atan2(px[i].y-cy,px[i].x-cx)-Math.atan2(px[i-1].y-cy,px[i-1].x-cx);while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;sweep+=d}
 const closed=n>=5&&area>150&&(chord<=18||(typeof hasRing==='function'&&hasRing(nodes))),straight=n>=3&&chord>=22&&maxDev<=11;
 let shape;
 if(straight)shape=Math.abs(dx)>Math.abs(dy)*1.2?'wall':'beam';
 else if(closed)shape='ring';
 else if(Math.abs(sweep)>1.6*Math.PI)shape='orbit';
 else if(n>=4&&sharp/Math.max(1,n-2)>.9)shape='chain';
 else if(diag<26+n*1.6)shape='sphere';
 else if(Math.abs(dy)<Math.abs(dx)*.5)shape='slash';
 else shape='cone';
 if(n<2)shape='point';
 const type=typeof getTechniqueType==='function'?getTechniqueType(nodes,true):'unknown';
 let verb=LANG_VERB[type]||null,known=!!verb;
 if(!verb)verb=shape==='wall'?'Заслонить':shape==='ring'?'Охватить':shape==='sphere'?'Заслонить (сфера)':shape==='orbit'?'Закрутить':'Выпустить';
 const clamp=v=>Math.max(0,Math.min(1,v)),dirName=Math.abs(dy)>=Math.abs(dx)?(dy<0?'вперёд':'назад'):(dx>0?'вправо':'влево');
 const params={
  power:n,
  hardness:clamp(.5*Math.min(1,cross/Math.max(1,n*.6))+.2*Math.min(1,sharp/Math.max(1,n-2)/Math.PI*2)+.3*cnt('chest')/n),
  duration:clamp((cnt('root')+ground*.7)/n*.9+Math.min(1,Math.abs(turn)/6.28)*.3),
  reach:clamp(diag/(selfz>=n?150:260)),
  width:clamp(Math.min(bw,bh)/Math.max(1,Math.max(bw,bh)||1)),
  dir:dirName
 };
 const notes=[];
 if(n<3)notes.push('слишком короткая фраза — слабая и «кривая»');
 if(!known&&shape==='point')notes.push('нет глагола — «пустой выброс»');
 if(side.l&&side.r)notes.push('обе стороны тела: Инь и Ян вместе');
 else if(side.l)notes.push('левая сторона — Инь (принять, защитить)');
 else if(side.r)notes.push('правая сторона — Ян (отдать, ударить)');
 return{n,anchor,shape,verb,known,type,sub,params,cross,notes,turn,len};
}
function techPhraseText(ph){
 if(!ph)return '';
 const pc=v=>Math.round(v*100)+'%',subs=Object.keys(ph.sub).map(k=>SUBZ[k].m+'×'+ph.sub[k]).join(' · ');
 return '<b>Фраза:</b> '+LANG_ANCHOR[ph.anchor]+' · '+LANG_SHAPE[ph.shape]+' · '+ph.verb+(ph.known?'':' <i>(пока без боевого действия)</i>')+
  '<br>твёрдость '+pc(ph.params.hardness)+' · время '+pc(ph.params.duration)+' · дальность '+pc(ph.params.reach)+' · ширина '+pc(ph.params.width)+' · направление: '+ph.params.dir+
  '<br><span style="color:#8794ad">'+subs+(ph.notes.length?' · '+ph.notes.join('; '):'')+'</span>';
}
function renderPhrase(){
 const el=$('techPhrase');if(!el)return;
 if(typeof techPath==='undefined'||!techPath||!techPath.length){el.innerHTML='<span style="color:#8794ad">Фраза появится, когда выберешь звёзды.</span>';return}
 el.innerHTML=techPhraseText(techPhrase(techPath));
}
