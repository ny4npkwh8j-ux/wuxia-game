'use strict';
/* ===== Трансформация души (этап 5): отдельное испытание =====
   Условие — душа IV (последняя ступень). Сначала вкладывается цена (Ци и/или осколки 4 этапа), затем два мини-испытания:
   1) «Удержание формы» — держать метку души в движущейся зоне; 2) «Защита ядра» — сбивать нападающие тени, пока они не пробили ядро.
   Сложность мини-игр задаёт шанс по качеству ядра (TRANS_CHANCE): чем он ниже, тем уже зона, быстрее тени и меньше прочность ядра.
   Неудача: возвращается половина вложенного, 2 мин отдыха. Успех: save.soulTrans=1 — вне тела душа использует все техники, бьёт в полную силу и переживает гибель тела. */
const TRANS_QI=7700000,TRANS_SH=COL_SH*26,TRANS_CHANCE=[0,0,0,25,55,80];
function transQi(){return Math.round(TRANS_QI*foundK(coreRank()))}
function transSh(){return Math.round(TRANS_SH*foundK(coreRank()))}
function transChance(){const r=Math.max(1,Math.min(5,coreRank()||1)),b=TRANS_CHANCE[r]||0;return b?Math.max(5,Math.min(95,b+pathChanceBonus(r))):0}
function transDiff(){return 1-transChance()/100}/* 0 — легко, 1 — предельно */
function transUnlocked(){return hasSoul()&&soulStage()>=SOUL_MAX&&!save.soulTrans&&transChance()>0}
function transQiFraction(){return Math.min(1,(save.transDeposit||0)/transQi())}
function transShardsLeft(){return Math.max(0,Math.ceil(transSh()*(1-transQiFraction())-1e-9))}
function renderTrans(done){
 const box=$('transForm');if(!box)return;
 if(!hasSoul()||soulStage()<SOUL_MAX){box.style.display='none';return}
 box.style.display='block';
 if(save.soulTrans){box.innerHTML='<p class="mline"><b>ТРАНСФОРМАЦИЯ ✦</b> — душа самостоятельна: вне тела она владеет всеми техниками, бьёт в полную силу и переживает гибель тела.</p>';return}
 if(transChance()<=0){box.innerHTML='<p class="mline sm">Трансформация недоступна: качество ядра слишком низкое.</p>';return}
 const left=transShardsLeft(),can=transUnlocked(),cool=soulCoolLeft();
 box.innerHTML='<p class="mline"><b>Трансформация души</b> · сложность испытаний: <b>'+Math.round(transDiff()*100)+'%</b> (шанс по ядру '+transChance()+'%)</p><div class="pbar"><i id="transBarFill" style="width:'+(transQiFraction()*100)+'%"></i></div><p class="mline sm">Ци '+fmt(save.transDeposit||0)+' / '+fmt(transQi())+' · осколки 4 этапа: '+fmt(Math.floor(save.rewards4||0))+'</p><div class="row"><button class="bigbtn" id="transDepositBtn">Влить Ци · '+soulHoldRate().toFixed(1)+'/с</button></div><div class="row"><button class="bigbtn" id="transQiBtn" onclick="transStart(\'qi\')">Начать испытание</button><button class="bigbtn secondary" id="transShBtn" onclick="transStart(\'sh\')">Осколки · '+fmt(left)+'</button></div>';
 $('transDepositBtn').disabled=!can||(save.transDeposit||0)>=transQi();$('transQiBtn').disabled=!can||(save.transDeposit||0)<transQi()||cool>0;$('transShBtn').disabled=!can||left<=0||shBalance(4)<left||cool>0;
 if(typeof bindHold==='function')bindHold('transDepositBtn','trans');
}
async function transStart(mode){
 if(!transUnlocked())return;
 if(soulCoolLeft()>0)return toast('Душа восстанавливается: ещё '+soulCoolLeft()+' с.');
 const left=transShardsLeft();
 if(mode==='qi'&&(save.transDeposit||0)<transQi())return;
 if(mode==='sh'&&(left<=0||shBalance(4)<left))return toast('Нужно '+fmt(left)+' осколков 4 этапа.');
 if(!await confirmDialog('Начать трансформацию? Цена уплачивается сразу, при неудаче вернётся половина. Два испытания: удержание формы и защита ядра.','Начать'))return;
 let refund;
 if(mode==='qi'){save.transDeposit-=transQi();refund=()=>{save.transDeposit=(save.transDeposit||0)+Math.floor(transQi()/2)}}
 else{shPay(4,left);const dep=save.transDeposit||0;save.transDeposit=0;refund=()=>{save.rewards4=(save.rewards4||0)+Math.floor(left/2)}}
 persist();closeSoul();
 transRun(transDiff(),ok=>{
  if(ok){save.soulTrans=1;persist();updateUI();playStageAnimation({kind:'dens',d0:5,success:true,title:'ТРАНСФОРМАЦИЯ ДУШИ',text:'Душа обрела самостоятельность: вне тела она владеет всеми техниками, бьёт в полную силу и переживает гибель тела.'})}
  else{refund();save.soulCool=Date.now()+120000;persist();updateUI();playStageAnimation({kind:'core',success:false,title:'Испытание не пройдено',text:'Половина вложенного потеряна. Душа восстанавливается 2 минуты.',onClose:()=>{}})}
 });
}
/* ---- мини-игры ---- */
let TR=null;
function transRun(dif,done){
 const m=$('transModal');m.classList.add('show');const cv=$('transCv'),c=cv.getContext('2d'),W=cv.width,H=cv.height;
 TR={dif,done,stage:1,t:0,hold:false,last:performance.now(),over:false,msg:'',
  /* 1: удержание формы */ y:.2,vy:0,zc:.5,zt:0,prog:0,
  /* 2: защита ядра */ hp:dif>.6?3:5,sp:[],spT:0,kills:0};
 const down=e=>{TR&&(TR.hold=true);if(TR&&TR.stage===2){const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;transTap(x,y,W,H)}e.preventDefault()},up=()=>{TR&&(TR.hold=false)};
 cv.onpointerdown=down;cv.onpointerup=up;cv.onpointerleave=up;cv.onpointercancel=up;
 $('transTitle').textContent='Испытание 1/2 · Удержание формы';$('transHelp').textContent='Зажимай, чтобы поднять метку души; отпусти — опускается. Держи её в светлой зоне, пока шкала не заполнится.';
 const loop=now=>{if(!TR||TR.over)return;const dt=Math.min(.05,(now-TR.last)/1000);TR.last=now;transTick(dt);transDraw(c,W,H);requestAnimationFrame(loop)};requestAnimationFrame(loop);
}
function transEnd(ok){
 if(!TR||TR.over)return;TR.over=true;const d=TR.done;TR=null;$('transModal').classList.remove('show');d(ok);
}
function transTick(dt){
 const T=TR,d=T.dif;T.t+=dt;
 if(T.stage===1){
  const zh=.30-.14*d;/* высота зоны */
  T.zt+=dt*(.7+.9*d);T.zc=.5+.28*Math.sin(T.zt)+.14*Math.sin(T.zt*2.3+1);
  T.vy+=(T.hold?1.9:-1.5)*dt;T.vy*=.985;T.y=Math.max(0,Math.min(1,T.y+T.vy*dt));if(T.y<=0||T.y>=1)T.vy=0;
  const inz=Math.abs(T.y-T.zc)<zh/2;T.prog=Math.max(0,Math.min(1,T.prog+(inz?.13:-(.07+.1*d))*dt));T.zh=zh;T.inz=inz;
  if(T.prog>=1){T.stage=2;T.t=0;$('transTitle').textContent='Испытание 2/2 · Защита ядра';$('transHelp').textContent='Касайся нападающих теней, пока они не достигли ядра. Не дай пробить его '+T.hp+' раз.'}
  else if(T.t>35)transEnd(false);
 }else{
  T.spT-=dt;if(T.spT<=0){T.spT=1.15-.5*d+Math.random()*.4;const a=Math.random()*Math.PI*2;T.sp.push({a,r:1,v:.16+.14*d+Math.random()*.04})}
  for(let i=T.sp.length-1;i>=0;i--){const q=T.sp[i];q.r-=q.v*dt;if(q.r<=.08){T.sp.splice(i,1);T.hp--;T.hitT=.3}}
  T.hitT=Math.max(0,(T.hitT||0)-dt);
  if(T.hp<=0)transEnd(false);else if(T.t>=24)transEnd(true);
 }
}
function transTap(x,y,W,H){
 const T=TR;let best=-1,bd=44;
 T.sp.forEach((q,i)=>{const px=W/2+Math.cos(q.a)*q.r*W*.46,py=H/2+Math.sin(q.a)*q.r*H*.46,d=Math.hypot(px-x,py-y);if(d<bd){bd=d;best=i}});
 if(best>=0){T.sp.splice(best,1);T.kills++}
}
function transDraw(c,W,H){
 const T=TR;if(!T)return;c.fillStyle='#0b1222';c.fillRect(0,0,W,H);
 if(T.stage===1){
  const bx=W/2-26,bw=52,top=30,bh=H-60;c.strokeStyle='#2c3956';c.lineWidth=2;c.strokeRect(bx,top,bw,bh);
  const zy=top+(1-(T.zc+T.zh/2))*bh,zh=T.zh*bh;c.fillStyle=T.inz?'#7fe08a99':'#7fe0ff55';c.fillRect(bx,zy,bw,zh);
  const my=top+(1-T.y)*bh;c.fillStyle='#ffd23a';c.beginPath();c.arc(W/2,my,13,0,Math.PI*2);c.fill();c.fillStyle='#fffbe0';c.beginPath();c.arc(W/2-3,my-3,5,0,Math.PI*2);c.fill();
  c.fillStyle='#1b2b49';c.fillRect(20,H-22,W-40,10);c.fillStyle='#ffd23a';c.fillRect(20,H-22,(W-40)*T.prog,10);
  c.fillStyle='#9fb3d9';c.font='12px sans-serif';c.fillText(Math.max(0,Math.ceil(35-T.t))+' с',W-44,18);
 }else{
  c.strokeStyle='#2c3956';c.beginPath();c.arc(W/2,H/2,W*.46,0,Math.PI*2);c.stroke();
  c.fillStyle=T.hitT>0?'#ff6a6a':'#7fe0ff';c.beginPath();c.arc(W/2,H/2,20,0,Math.PI*2);c.fill();
  for(const q of T.sp){const px=W/2+Math.cos(q.a)*q.r*W*.46,py=H/2+Math.sin(q.a)*q.r*H*.46;c.fillStyle='#a05cff';c.beginPath();c.arc(px,py,11,0,Math.PI*2);c.fill()}
  c.fillStyle='#9fb3d9';c.font='12px sans-serif';c.fillText('Прочность ядра: '+Math.max(0,T.hp)+' · '+Math.max(0,Math.ceil(24-T.t))+' с',12,18);
 }
}
