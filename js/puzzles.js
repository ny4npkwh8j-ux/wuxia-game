'use strict';
/* ===== головоломки переходов: сборка колонны и прессовка осколков в ядро =====
   Результат мини-игры заменяет бросок шанса: точность решает и успех, и качество.
   Сложность растёт со слабым качеством прошлого этапа и падает с вложениями в шанс. */
function puzDiff(chance,prev){return Math.max(.1,Math.min(1,.5*(1-Math.max(0,Math.min(1,prev)))+.6*(1-Math.max(0,Math.min(100,chance))/100)))}
let PZ=null;
function puzEnsure(){
 if($('puzModal'))return;
 const m=document.createElement('div');m.id='puzModal';m.className='modal';
 m.innerHTML='<div class="sheet" style="text-align:center"><h3 id="puzTitle"></h3><p class="mline sm" id="puzHelp"></p><canvas id="puzCv" width="320" height="420" style="width:100%;max-width:340px;border-radius:12px;background:#0b1222;touch-action:none"></canvas><p class="mline sm" id="puzInfo"></p></div>';
 document.body.appendChild(m);
}
function puzRun(o){
 puzEnsure();
 return new Promise(res=>{
  const m=$('puzModal'),cv=$('puzCv'),c=cv.getContext('2d'),W=cv.width,H=cv.height;
  PZ=Object.assign({t:0,over:false,last:performance.now(),res,W,H},o.init);
  $('puzTitle').textContent=o.title;$('puzHelp').textContent=o.help;$('puzInfo').textContent='Сложность: '+Math.round(o.dif*100)+'%';
  m.classList.add('show');
  cv.onpointerdown=e=>{e.preventDefault();if(!PZ||PZ.over)return;const r=cv.getBoundingClientRect();o.tap((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height)};
  const loop=now=>{if(!PZ)return;const dt=Math.min(.05,(now-PZ.last)/1000);PZ.last=now;if(!PZ.over){PZ.t+=dt;o.tick(dt)}o.draw(c,W,H);if(PZ.over){PZ.endT=(PZ.endT||0)+dt;if(PZ.endT>1.1){const r=PZ.res,a=PZ.acc;PZ=null;m.classList.remove('show');r({acc:a});return}}requestAnimationFrame(loop)};
  requestAnimationFrame(loop);
 });
}
/* ---- сборка колонны: 7 блоков, ставь каждый ровно по центру; сдвиги — дефекты ---- */
function puzzleColumn(chance,prev){
 const d=puzDiff(chance,prev),N=7,w=.3;
 return puzRun({dif:d,title:'Сборка колонны',help:'Нажимай, когда блок над центром. Каждый сдвиг — дефект: чем их меньше, тем лучше колонна.',
  init:{ph:Math.random()*6,n:0,defects:[],offs:[]},
  tap:()=>{const P=PZ,x=.5+.38*Math.sin(P.ph),off=x-.5,perfect=.03*(1.5-d),df=Math.abs(off)<perfect?0:Math.min(1,Math.abs(off)/.3);P.offs.push(off);P.defects.push(df);P.n++;
   if(P.n>=N){P.over=true;P.acc=1-P.defects.reduce((a,b)=>a+b,0)/N}},
  tick:dt=>{PZ.ph+=dt*(2.1+3.4*d)},
  draw:(c,W,H)=>{const P=PZ;c.fillStyle='#0b1222';c.fillRect(0,0,W,H);
   const bw=W*w,bh=34,base=H-30;
   c.strokeStyle='#2c3956';c.setLineDash([4,4]);c.beginPath();c.moveTo(W/2,20);c.lineTo(W/2,H-20);c.stroke();c.setLineDash([]);
   P.offs.forEach((o,i)=>{const df=P.defects[i],x=W/2+o*W-bw/2,y=base-(i+1)*bh;c.fillStyle=df===0?'#7fe08a':df<.4?'#e0d36a':'#e07a5a';c.fillRect(x,y,bw,bh-3);c.strokeStyle='#0b1222';c.strokeRect(x,y,bw,bh-3)});
   if(!P.over){const x=W/2+(.38*Math.sin(P.ph))*W-bw/2,y=base-(P.n+1)*bh-18;c.fillStyle='#ffd23a';c.fillRect(x,y,bw,bh-3)}
   c.fillStyle='#9fb3d9';c.font='13px sans-serif';c.fillText('Блок '+Math.min(N,P.n+(P.over?0:1))+' / '+N,12,18);
   if(P.over){c.fillStyle='#fff';c.font='bold 18px sans-serif';c.textAlign='center';c.fillText('Дефектов: '+P.defects.filter(v=>v>0).length+' · точность '+Math.round(P.acc*100)+'%',W/2,40);c.textAlign='start'}}
 });
}
/* ---- прессовка ядра: лови осколки колонн, пока они не вылетели из дань-тяня ---- */
function puzzleCore(n,chance,prev){
 const d=puzDiff(chance,prev),cnt=Math.max(3,Math.min(10,n));
 const sh=[];for(let i=0;i<cnt;i++)sh.push({t0:i*(1.0-.45*d),a:Math.random()*Math.PI*2,r:0,v:.2+.26*d+Math.random()*.05,st:0});
 return puzRun({dif:d,title:'Прессовка ядра',help:'Осколки колонн разлетаются. Касайся каждого, пока он не покинул дань-тянь: каждый пойманный спрессуется в ядро.',
  init:{sh,caught:0,lost:0,cnt},
  tap:(x,y)=>{const P=PZ,W=P.W,H=P.H;let b=null,bd=46;for(const q of P.sh){if(q.st!==1)continue;const px=W/2+Math.cos(q.a)*q.r*W*.46,py=H/2+Math.sin(q.a)*q.r*H*.36,dd=Math.hypot(px-x,py-y);if(dd<bd){bd=dd;b=q}}if(b){b.st=2;P.caught++;if(P.caught+P.lost>=P.cnt){P.over=true;P.acc=P.caught/P.cnt}}},
  tick:dt=>{const P=PZ;for(const q of P.sh){if(q.st===0&&P.t>=q.t0)q.st=1;if(q.st===1){q.r+=q.v*dt;if(q.r>=1){q.st=3;P.lost++}}}
   if(P.caught+P.lost>=P.cnt&&!P.over){P.over=true;P.acc=P.caught/P.cnt}},
  draw:(c,W,H)=>{const P=PZ;c.fillStyle='#0b1222';c.fillRect(0,0,W,H);
   c.strokeStyle='#2c3956';c.beginPath();c.ellipse(W/2,H/2,W*.46,H*.36,0,0,Math.PI*2);c.stroke();
   const g=c.createRadialGradient(W/2,H/2,2,W/2,H/2,50);g.addColorStop(0,'#fff6c0');g.addColorStop(1,'rgba(255,200,60,0)');c.globalAlpha=.4+.6*(P.caught/P.cnt);c.fillStyle=g;c.beginPath();c.arc(W/2,H/2,50,0,Math.PI*2);c.fill();c.globalAlpha=1;
   for(const q of P.sh){if(q.st!==1)continue;const px=W/2+Math.cos(q.a)*q.r*W*.46,py=H/2+Math.sin(q.a)*q.r*H*.36;c.fillStyle='#a05cff';c.beginPath();c.moveTo(px,py-13);c.lineTo(px+9,py);c.lineTo(px,py+13);c.lineTo(px-9,py);c.closePath();c.fill()}
   c.fillStyle='#9fb3d9';c.font='13px sans-serif';c.fillText('Поймано '+P.caught+' · упущено '+P.lost+' · всего '+P.cnt,12,18);
   if(P.over){c.fillStyle='#fff';c.font='bold 18px sans-serif';c.textAlign='center';c.fillText('Спрессовано '+Math.round(P.acc*100)+'%',W/2,H-20);c.textAlign='start'}}
 });
}
