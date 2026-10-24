'use strict';
/* ===== демонические звери: временные векторные силуэты (позже заменяются готовыми спрайтами) =====
   Звери занимают место прежних боссов; сила, здоровье и техники — те же, меняется только вид и название.
   Порядок по силе (индекс босса 1…): паук, каменный страж, кровокрыл, лиса, владыка пустоты, печать ада; печати бездны и тьмы — для расширения числа боссов. */
const BEASTS={
 spider:{name:'ПАУК КОШМАРОВ',col:'#8e1a36',dk:'#3a0814',aur:'#ff3a5a'},
 golem:{name:'КАМЕННЫЙ СТРАЖ',col:'#8a6a4a',dk:'#40301f',aur:'#ffa040'},
 bird:{name:'КРОВОКРЫЛ',col:'#701226',dk:'#240810',aur:'#ff4040'},
 fox:{name:'ЛИСА ДЕСЯТИ ХВОСТОВ',col:'#efeaff',dk:'#9a86d8',aur:'#b48aff'},
 void:{name:'ВЛАДЫКА ПУСТОТЫ',col:'#2a1630',dk:'#100810',aur:'#ff3a6a'},
 hell:{name:'ПЕЧАТЬ АДА',col:'#8a1810',dk:'#2a0806',aur:'#ff6a20'},
 abyss:{name:'ПЕЧАТЬ БЕЗДНЫ',col:'#2a2418',dk:'#0e0c08',aur:'#ffc83a'},
 dark:{name:'ПЕЧАТЬ ТЬМЫ',col:'#5a4430',dk:'#201810',aur:'#ffb030'}};
const BEAST_ORDER=['spider','golem','bird','fox','void','hell','abyss','dark'];
function beastKind(i){return BEAST_ORDER[(Math.max(1,i||1)-1)%BEAST_ORDER.length]}
function beastOf(e){return BEASTS[e.beast||beastKind(e.index)]}
function bEll(c,x,y,rx,ry,rot,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,rot||0,0,TAU);c.fill()}
function bLeg(c,x0,y0,x1,y1,w,col){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke()}
/* рисует зверя в локальных координатах, морда смотрит по +x; размер ~ радиус 44 */
function drawBeastShape(c,k,time,wp,mv,flash,wind){
 const B=BEASTS[k],F=flash?'#fff':null,C=F||B.col,D=F||B.dk,A=F||B.aur,sw=Math.sin(wp||0)*mv;
 if(k==='spider'){
  for(let i=0;i<4;i++)for(const sd of[-1,1]){const a=.5+i*.45,ph=Math.sin((wp||0)+i*1.3*sd)*.18*mv;bLeg(c,0,0,Math.cos(a+ph)*sd*0+(i-1.5)*14,sd*(34+ph*20),4,D)}
  bEll(c,-10,0,22,17,0,C);bEll(c,16,0,13,11,0,D);bEll(c,-10,0,9,7,0,A);bEll(c,22,-4,3,3,0,'#fff');bEll(c,22,4,3,3,0,'#fff');
 }else if(k==='golem'){
  bEll(c,0,0,28,26,0,D);for(let i=0;i<7;i++){const a=i*TAU/7;bEll(c,Math.cos(a)*20,Math.sin(a)*18,11,9,a,C)}
  bEll(c,18,0,10,9,0,C);bEll(c,0,0,10,10,0,A);bEll(c,22,-3,2.5,2.5,0,'#ffe0a0');bEll(c,22,3,2.5,2.5,0,'#ffe0a0');
  for(const sd of[-1,1])bEll(c,2+sw*6*sd,sd*30,10,8,0,D);
 }else if(k==='bird'){
  const fl=Math.sin(time*(wind?14:7))*.5;
  for(const sd of[-1,1]){c.save();c.scale(1,sd);c.rotate(fl*.6);c.fillStyle=C;c.beginPath();c.moveTo(4,4);c.quadraticCurveTo(-6,44,-36,52);c.quadraticCurveTo(-22,26,-24,6);c.closePath();c.fill();c.fillStyle=D;c.beginPath();c.moveTo(0,6);c.quadraticCurveTo(-8,30,-24,38);c.lineTo(-14,10);c.fill();c.restore()}
  bEll(c,0,0,20,10,0,D);bEll(c,18,0,8,7,0,C);c.fillStyle='#ffd24a';c.beginPath();c.moveTo(25,-2);c.lineTo(35,0);c.lineTo(25,3);c.fill();bEll(c,20,-3,2,2,0,'#fff');bEll(c,-22,0,10,4,0,C);
 }else if(k==='fox'){
  for(let i=0;i<9;i++){const a=(i-4)*.2+Math.sin(time*2+i)*.06;c.save();c.rotate(Math.PI+a);c.fillStyle=i%2?C:'#d8ccff';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(26,-9,44,0);c.quadraticCurveTo(26,9,0,0);c.fill();bEll(c,40,0,5,3,0,A);c.restore()}
  bEll(c,0,0,22,12,0,C);bEll(c,20,0,10,8,0,C);c.fillStyle=C;for(const sd of[-1,1]){c.beginPath();c.moveTo(20,sd*5);c.lineTo(14,sd*17);c.lineTo(26,sd*8);c.fill()}
  bEll(c,26,-3,2,2,0,A);bEll(c,26,3,2,2,0,A);bEll(c,0,0,5,5,0,A);
 }else if(k==='void'){
  c.fillStyle=C;c.beginPath();c.moveTo(18,0);c.quadraticCurveTo(-4,-30,-40,-18);c.quadraticCurveTo(-26,0,-40,18);c.quadraticCurveTo(-4,30,18,0);c.fill();
  bEll(c,2,0,10,10,0,D);bEll(c,8,0,7,7,0,F||'#f0d8e4');c.strokeStyle=F||'#e8e0ff';c.lineWidth=3;c.beginPath();c.moveTo(4,0);c.quadraticCurveTo(-24,-10+Math.sin(time*3)*5,-48,-4);c.moveTo(4,0);c.quadraticCurveTo(-24,10-Math.sin(time*3)*5,-48,6);c.stroke();
  bEll(c,0,0,26,26,0,'rgba(255,58,106,.12)');bEll(c,12,-2,2,2,0,A);bEll(c,12,2,2,2,0,A);
 }else if(k==='hell'){
  for(let i=0;i<5;i++){const a=Math.sin(time*9+i*2)*.4;c.save();c.translate(-30,0);c.rotate(Math.PI+(i-2)*.3+a*.3);c.fillStyle=i%2?'#ff9a30':'#ff4a1a';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(14,-7,30,0);c.quadraticCurveTo(14,7,0,0);c.fill();c.restore()}
  for(let i=0;i<4;i++){const sd=i%2?1:-1,px=(i<2?16:-14)+Math.sin((wp||0)+(i%3)*2)*8*mv;bLeg(c,px,0,px+5,sd*26,7,D)}
  bEll(c,-4,0,32,16,0,C);bEll(c,28,0,15,12,0,C);c.fillStyle=D;for(const sd of[-1,1]){c.beginPath();c.moveTo(30,sd*7);c.lineTo(24,sd*20);c.lineTo(36,sd*10);c.fill()}
  bEll(c,38,-4,2.5,2.5,0,'#ffe060');bEll(c,38,4,2.5,2.5,0,'#ffe060');for(let i=0;i<6;i++)bEll(c,-26+i*10,Math.sin(i*2)*5,3,2,0,'#ff8a30');
 }else if(k==='abyss'){
  const n=14;for(let i=n;i>=0;i--){const x=-48+i*7,y=Math.sin(time*2.2+i*.55)*10*(1-i/(n*1.6)),r=(6+Math.sin(i/n*Math.PI)*8);bEll(c,x,y,r,r*.9,0,i%2?C:D);if(i%3===0)bEll(c,x,y,3,3,0,A)}
  const hy=Math.sin(time*2.2+n*.55)*6;bEll(c,56,hy,13,9,0,C);c.fillStyle=D;for(const sd of[-1,1]){c.beginPath();c.moveTo(52,hy+sd*5);c.lineTo(40,hy+sd*18);c.lineTo(60,hy+sd*7);c.fill()}
  bEll(c,60,hy-3,2.5,2.5,0,A);bEll(c,60,hy+3,2.5,2.5,0,A);
 }else{ /* dark: бык-великан */
  for(let i=0;i<4;i++){const sd=i%2?1:-1,px=(i<2?18:-18)+Math.sin((wp||0)+(i%3)*2)*6*mv;bLeg(c,px,0,px,sd*30,11,D)}
  bEll(c,-2,0,36,26,0,C);bEll(c,30,0,17,14,0,D);c.strokeStyle=F||'#e8d8a8';c.lineWidth=6;c.lineCap='round';for(const sd of[-1,1]){c.beginPath();c.moveTo(32,sd*10);c.quadraticCurveTo(46,sd*26,60,sd*18);c.stroke()}
  bEll(c,-4,0,13,11,0,A);bEll(c,40,-4,2.5,2.5,0,'#ffe060');bEll(c,40,4,2.5,2.5,0,'#ffe060');
 }
}
