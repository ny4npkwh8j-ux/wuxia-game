'use strict';
function initFx(st){Object.assign(st,{parts:[],floats:[],slashes:[],ghosts:[],corpses:[],shake:0,hurt:0,hitFlash:0,shieldFlash:0,aimT:0,castAnim:0,punchDur:.32,qiCast:0,facing:Math.PI/2,wp:0,mv:0,channel:null,punchSide:0,t:0,ghostAcc:0,stun:0,stunImm:0,punchCd:0,cdArea:0,cdStun:0,qiShieldOn:false,qiShieldFlash:0,shieldMax:20,dashCdMax:.8});if(st.boss)st.boss.wind=null}
function tickList(arr,k,mk,dt){let j=0;for(let i=0;i<arr.length;i++){const o=arr[i];o[k]+=dt;if(o[k]>=o[mk])continue;arr[j++]=o}arr.length=j}
function updateFx(dt){
 const s=arenaState;let j=0;
 for(let i=0;i<s.parts.length;i++){const p=s.parts[i];p.t+=dt;if(p.t>=p.max)continue;const d=Math.max(0,1-(p.drag||0)*dt);p.vx*=d;p.vy*=d;p.x+=p.vx*dt;p.y+=p.vy*dt;s.parts[j++]=p}s.parts.length=j;
 j=0;for(let i=0;i<s.floats.length;i++){const f=s.floats[i];f.t+=dt;if(f.t>=f.max)continue;f.y+=f.vy*dt;f.vy*=Math.max(0,1-3.2*dt);s.floats[j++]=f}s.floats.length=j;
 tickList(s.qiEffects,'life','duration',dt);tickList(s.slashes,'t','max',dt);tickList(s.ghosts,'t','max',dt);tickList(s.corpses,'t','max',dt);
}
function emitFx(dt,still){
 const s=arenaState;
 if(arenaMeditation.active&&still&&Math.random()<48*dt)addPart({k:'mote',x:0,y:0,vx:0,vy:0,a:rnd(0,TAU),r0:rnd(50,120),spin:rnd(1,2.6),t:0,max:rnd(.6,1.1),col:'#8fe9ff',size:1});
 if(s.channel&&Math.random()<80*dt)addPart({k:'mote',x:0,y:0,vx:0,vy:0,a:rnd(0,TAU),r0:rnd(60,130),spin:rnd(-3,3),t:0,max:rnd(.4,.8),col:'#c58cff',size:1});
 if(s.mv>.5&&s.dashTime<=0&&Math.random()<7*dt)addPart({k:'dust',x:s.px+rnd(-6,6),y:s.py+9,vx:rnd(-8,8),vy:rnd(-8,8),t:0,max:.5,size:3,drag:2});
 if(s.dashTime>0)for(let i=0;i<2;i++)addPart({k:'dust',x:s.px+rnd(-8,8),y:s.py+rnd(-4,10),vx:-s.lastMoveX*rnd(30,90),vy:-s.lastMoveY*rnd(30,90),t:0,max:.45,size:4,drag:3});
 const b=s.boss;if(b&&b.hp>0&&Math.hypot(b.x-s.px,b.y-s.py)<700&&Math.random()<26*dt)addPart({k:'ember',x:b.x+rnd(-30,30),y:b.y+rnd(-5,30),vx:rnd(-10,10),vy:rnd(-60,-30),t:0,max:rnd(.8,1.4),size:rnd(4,8),col:b.tier===2?'#ff8a3a':'#ffd85b',drag:.2});
}
/* ================= ARENA ART & FX (v0.5) ================= */
const TAU=Math.PI*2;
function rnd(a,b){return a+Math.random()*(b-a)}
function hash2(x,y){let h=(Math.imul(Math.floor(x)|0,374761393)+Math.imul(Math.floor(y)|0,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
function angDiff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function lerpAng(a,b,k){return a+angDiff(b,a)*Math.min(1,k)}
function ease(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
const glowCache={};
function glowSprite(col){if(glowCache[col])return glowCache[col];const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,col+'ff');r.addColorStop(.25,col+'a0');r.addColorStop(.6,col+'30');r.addColorStop(1,col+'00');g.fillStyle=r;g.fillRect(0,0,64,64);return glowCache[col]=c}
function glow(c,x,y,r,col,a){c.globalAlpha=a;c.drawImage(glowSprite(col),x-r,y-r,r*2,r*2);c.globalAlpha=1}
function makeVig(rgb,inner,edge){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),r=g.createRadialGradient(128,128,128*inner,128,128,136);r.addColorStop(0,'rgba('+rgb+',0)');r.addColorStop(1,'rgba('+rgb+','+edge+')');g.fillStyle=r;g.fillRect(0,0,256,256);return c}
const vigDark=makeVig('3,9,6',.5,.62),vigRed=makeVig('210,20,35',.3,.9);
function star4(c,x,y,r){c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,rr=i%2?r*.38:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath()}
function outText(c,txt,x,y,fill,size){c.font='900 '+size+'px sans-serif';c.textAlign='center';c.lineJoin='round';c.lineWidth=3.2;c.strokeStyle='rgba(6,10,20,.85)';c.strokeText(txt,x,y);c.fillStyle=fill;c.fillText(txt,x,y)}
function sector(c,len,cone){c.beginPath();c.moveTo(0,0);c.arc(0,0,len,-cone,cone);c.closePath()}
/* ---- FX API (works on arenaState) ---- */
function addPart(p){const s=arenaState;if(!s)return;if(s.parts.length>380)s.parts.splice(0,60);s.parts.push(p)}
function burst(x,y,n,col,spd,life,size,drag){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=spd*(.35+Math.random()*.65);addPart({k:'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:0,max:life*(.6+Math.random()*.6),size:size*(.6+Math.random()*.7),col,drag:drag||3})}}
function floatText(x,y,text,col,size){const s=arenaState;if(!s)return;if(s.floats.length>45)s.floats.shift();s.floats.push({x:x+rnd(-9,9),y,text:String(text),col,size:size||14,t:0,max:1,vy:-52})}
function shake(a){const s=arenaState;if(s)s.shake=Math.max(s.shake||0,a)}
function spawnDeath(e){const s=arenaState;if(!s)return;const st=e.stars||0;s.corpses.push({x:e.x,y:e.y,ang:e.ang||0,boss:!!e.isBoss,tier:e.isBoss?(e.tier===2?'master':'elite'):enemyTier(st),t:0,max:e.isBoss?1.2:.6});const n=e.isBoss?36:12;burst(e.x,e.y,n,e.isBoss?'#ffd85b':'#ffb07a',e.isBoss?300:190,.7,3);for(let i=0;i<(e.isBoss?14:5);i++)addPart({k:'soul',x:e.x+rnd(-14,14),y:e.y+rnd(-10,10),vx:rnd(-14,14),vy:rnd(-70,-30),t:0,max:rnd(.8,1.4),size:rnd(7,13),col:e.isBoss?'#ffe27a':'#c9d8ff',drag:.4})}
/* ---- palettes ---- */
const PAL={
 player:{robe:'#3f78d6',robe2:'#1f3d84',trim:'#ffd85b',skin:'#e8c7aa',hair:'#141726',acc:'#ff5f5f'},
 e0:{robe:'#b23b48',robe2:'#611a26',trim:'#e9c98a',skin:'#dfb494',hair:'#1c1516',acc:'#ffb04a'},
 e1:{robe:'#c9642d',robe2:'#75300f',trim:'#ffdca0',skin:'#dfb494',hair:'#1c1516',acc:'#ffe07a'},
 e2:{robe:'#7d42b3',robe2:'#3f1f68',trim:'#e1c2ff',skin:'#dfb494',hair:'#141018',acc:'#ff8ae6'},
 e3:{robe:'#2c8f8a',robe2:'#12504b',trim:'#9ff5e8',skin:'#dfb494',hair:'#0f1517',acc:'#fff08a'},
 boss:{robe:'#8a3bb5',robe2:'#42186a',trim:'#ffd85b',skin:'#f0c6a6',hair:'#0f0b16',acc:'#ffd85b'},
 boss2:{robe:'#a8323c',robe2:'#560f1d',trim:'#ffe27a',skin:'#f0c6a6',hair:'#0f0b16',acc:'#ff9a3a'}
};
/* ---- seamless grass tile ---- */
const GT=512;let groundPat=null;
function makeGroundTile(q){
 const cv=document.createElement('canvas');cv.width=cv.height=GT*q;const g=cv.getContext('2d');g.scale(q,q);
 let seed=20240917;const R=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 g.fillStyle='#3c6839';g.fillRect(0,0,GT,GT);
 const patch=(x,y,r,col,a)=>{for(const ox of [-GT,0,GT])for(const oy of [-GT,0,GT]){const cx=x+ox,cy=y+oy;if(cx<-r||cy<-r||cx>GT+r||cy>GT+r)continue;const gr=g.createRadialGradient(cx,cy,0,cx,cy,r);gr.addColorStop(0,col+a);gr.addColorStop(1,col+'00');g.fillStyle=gr;g.fillRect(cx-r,cy-r,r*2,r*2)}};
 for(let i=0;i<36;i++)patch(R()*GT,R()*GT,50+R()*110,R()<.55?'#5d9450':'#2a4f2f',R()<.5?'66':'88');
 for(let i=0;i<5;i++)patch(R()*GT,R()*GT,30+R()*40,'#6b5a3a','44');
 g.fillStyle='rgba(255,255,255,.026)';for(let y=0;y<GT;y+=128)g.fillRect(0,y,GT,64);
 const cols=['#72a862','#4d8546','#84ba6c','#33683a','#5f9a55'];g.lineCap='round';
 for(let i=0;i<1800;i++){const x=R()*GT,y=R()*GT,l=3+R()*5,a=-Math.PI/2+(R()-.5)*1.1;g.strokeStyle=cols[(R()*cols.length)|0];g.globalAlpha=.25+R()*.4;g.lineWidth=.9+R()*.7;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
 g.globalAlpha=1;
 for(let i=0;i<34;i++){const x=R()*GT,y=R()*GT;g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(x+1,y+1.5,3.4,2,0,0,TAU);g.fill();g.fillStyle=R()<.5?'#8b9088':'#a7aba1';g.beginPath();g.ellipse(x,y,3,1.9,R()*3,0,TAU);g.fill()}
 const fc=['#ffffff','#ffe27a','#ff9ac0','#b6a2ff'];
 for(let i=0;i<46;i++){const x=R()*GT,y=R()*GT,c=fc[(R()*fc.length)|0];g.fillStyle=c;for(let k=0;k<5;k++){const a=k*TAU/5;g.beginPath();g.arc(x+Math.cos(a)*1.9,y+Math.sin(a)*1.9,1.3,0,TAU);g.fill()}g.fillStyle='#f5b52a';g.beginPath();g.arc(x,y,1,0,TAU);g.fill()}
 return cv}
function ensureGround(){if(groundPat)return;const q=Math.min(2,Math.max(1,devicePixelRatio||1));try{groundPat=ax.createPattern(makeGroundTile(q),'repeat');if(!groundPat.setTransform)throw 0;groundPat.setTransform(new DOMMatrix([1/q,0,0,1/q,0,0]))}catch(e){groundPat=ax.createPattern(makeGroundTile(1),'repeat')}}
/* ---- world drawing ---- */
function drawGround(W,H,time){
 const s=arenaState,ox=((s.camx-W/2)%GT+GT)%GT,oy=((s.camy-H/2)%GT+GT)%GT;
 ax.save();ax.translate(-ox,-oy);ax.fillStyle=groundPat;ax.fillRect(0,0,W+GT,H+GT);ax.restore();
 const a=worldToScreen(0,0),b=worldToScreen(s.world,s.world);
 ax.fillStyle='#060b08';
 if(a.x>0)ax.fillRect(-20,-20,a.x+20,H+40);if(b.x<W)ax.fillRect(b.x,-20,W-b.x+20,H+40);
 if(a.y>0)ax.fillRect(-20,-20,W+40,a.y+20);if(b.y<H)ax.fillRect(-20,b.y,W+40,H-b.y+20);
 const fade=110;
 if(a.x>-fade&&a.x<W){const g=ax.createLinearGradient(a.x,0,a.x+fade,0);g.addColorStop(0,'rgba(6,11,8,.9)');g.addColorStop(1,'rgba(6,11,8,0)');ax.fillStyle=g;ax.fillRect(a.x,0,fade,H)}
 if(b.x<W+fade&&b.x>0){const g=ax.createLinearGradient(b.x,0,b.x-fade,0);g.addColorStop(0,'rgba(6,11,8,.9)');g.addColorStop(1,'rgba(6,11,8,0)');ax.fillStyle=g;ax.fillRect(b.x-fade,0,fade,H)}
 if(a.y>-fade&&a.y<H){const g=ax.createLinearGradient(0,a.y,0,a.y+fade);g.addColorStop(0,'rgba(6,11,8,.9)');g.addColorStop(1,'rgba(6,11,8,0)');ax.fillStyle=g;ax.fillRect(0,a.y,W,fade)}
 if(b.y<H+fade&&b.y>0){const g=ax.createLinearGradient(0,b.y,0,b.y-fade);g.addColorStop(0,'rgba(6,11,8,.9)');g.addColorStop(1,'rgba(6,11,8,0)');ax.fillStyle=g;ax.fillRect(0,b.y-fade,W,fade)}
 ax.save();ax.strokeStyle='rgba(255,216,91,.5)';ax.lineWidth=2;ax.setLineDash([14,10]);ax.lineDashOffset=-time*22;ax.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);ax.restore();
}
function drawTufts(W,H,time){
 const s=arenaState,cs=104,x0=Math.floor((s.camx-W/2-30)/cs),x1=Math.floor((s.camx+W/2+30)/cs),y0=Math.floor((s.camy-H/2-30)/cs),y1=Math.floor((s.camy+H/2+30)/cs);
 ax.lineCap='round';
 for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++){
  const h=hash2(gx,gy);if(h<.3)continue;
  const wx=(gx+hash2(gx+7,gy+3))*cs,wy=(gy+hash2(gx+11,gy+5))*cs;if(wx<40||wy<40||wx>s.world-40||wy>s.world-40)continue;
  const p=worldToScreen(wx,wy),kind=hash2(gx+2,gy+9),sw=Math.sin(time*1.9+h*20+wx*.01)*3;
  if(kind<.62){
   ax.strokeStyle=h>.65?'#86bd70':'#5b9853';ax.lineWidth=1.7;ax.beginPath();
   for(let k=-2;k<=2;k++){ax.moveTo(p.x+k*2.6,p.y);ax.quadraticCurveTo(p.x+k*3.6+sw*.5,p.y-6,p.x+k*4.6+sw,p.y-10-(2-Math.abs(k))*2.2)}
   ax.stroke();
  }else if(kind<.82){
   const fc=['#ffffff','#ffe27a','#ff9ac0','#b6a2ff'][(h*40|0)%4];
   ax.strokeStyle='#4f8a48';ax.lineWidth=1.4;ax.beginPath();ax.moveTo(p.x,p.y);ax.quadraticCurveTo(p.x+sw*.3,p.y-5,p.x+sw*.6,p.y-9);ax.stroke();
   ax.fillStyle=fc;for(let k=0;k<5;k++){const a=k*TAU/5+time*.3*(h>.5?1:-1);ax.beginPath();ax.arc(p.x+sw*.6+Math.cos(a)*3,p.y-9+Math.sin(a)*3,2.1,0,TAU);ax.fill()}
   ax.fillStyle='#f5b52a';ax.beginPath();ax.arc(p.x+sw*.6,p.y-9,1.5,0,TAU);ax.fill();
  }else{
   ax.fillStyle='rgba(0,0,0,.2)';ax.beginPath();ax.ellipse(p.x+1,p.y+2,6,3,0,0,TAU);ax.fill();
   ax.fillStyle='#8f958a';ax.beginPath();ax.ellipse(p.x,p.y,5.5,3.6,h*3,0,TAU);ax.fill();ax.fillStyle='#b8bcae';ax.beginPath();ax.ellipse(p.x-1.4,p.y-1,2.4,1.4,h*3,0,TAU);ax.fill();
  }
 }
}
function drawHazard(z,W,H,time){
 const p=worldToScreen(z.x,z.y);if(p.x<-z.r-20||p.x>W+z.r+20||p.y<-z.r-20||p.y>H+z.r+20)return;
 ax.save();ax.translate(p.x,p.y);ax.scale(1,.72);
 const g=ax.createRadialGradient(0,0,z.r*.08,0,0,z.r);g.addColorStop(0,'rgba(70,6,26,.82)');g.addColorStop(.62,'rgba(140,24,44,.5)');g.addColorStop(1,'rgba(170,32,52,0)');
 ax.fillStyle=g;ax.beginPath();ax.arc(0,0,z.r,0,TAU);ax.fill();
 ax.strokeStyle='rgba(255,96,116,.55)';ax.lineWidth=2;ax.setLineDash([12,9]);ax.lineDashOffset=-time*20;ax.beginPath();ax.arc(0,0,z.r*.8,0,TAU);ax.stroke();
 ax.lineDashOffset=time*14;ax.strokeStyle='rgba(255,140,150,.35)';ax.beginPath();ax.arc(0,0,z.r*.55,0,TAU);ax.stroke();ax.setLineDash([]);
 ax.strokeStyle='rgba(255,120,130,.28)';ax.lineWidth=1.5;ax.rotate(time*.25);
 for(let k=0;k<6;k++){ax.rotate(TAU/6);ax.beginPath();ax.moveTo(z.r*.18,0);ax.quadraticCurveTo(z.r*.45,z.r*.14,z.r*.72,0);ax.stroke()}
 ax.restore();
 for(let k=0;k<5;k++){const ph=(time*.35+hash2(z.x,k))%1,a=hash2(z.y,k)*TAU;ax.fillStyle='rgba(255,120,140,'+(.6*(1-ph))+')';ax.beginPath();ax.arc(p.x+Math.cos(a)*z.r*.5*hash2(k,z.x),p.y+Math.sin(a)*z.r*.3-ph*22,2+1.6*ph,0,TAU);ax.fill()}
}
function drawSpring(z,W,H,time){
 const p=worldToScreen(z.x,z.y);if(p.x<-z.r-20||p.x>W+z.r+20||p.y<-z.r-20||p.y>H+z.r+20)return;
 ax.save();ax.translate(p.x,p.y);ax.scale(1,.72);
 const g=ax.createRadialGradient(0,0,z.r*.08,0,0,z.r);g.addColorStop(0,'rgba(16,70,60,.75)');g.addColorStop(.62,'rgba(30,140,120,.42)');g.addColorStop(1,'rgba(60,200,170,0)');
 ax.fillStyle=g;ax.beginPath();ax.arc(0,0,z.r,0,TAU);ax.fill();
 ax.strokeStyle='rgba(140,255,225,.55)';ax.lineWidth=2;ax.setLineDash([12,9]);ax.lineDashOffset=time*20;ax.beginPath();ax.arc(0,0,z.r*.8,0,TAU);ax.stroke();
 ax.lineDashOffset=-time*14;ax.strokeStyle='rgba(180,255,235,.35)';ax.beginPath();ax.arc(0,0,z.r*.55,0,TAU);ax.stroke();ax.setLineDash([]);
 ax.strokeStyle='rgba(160,255,220,.3)';ax.lineWidth=1.5;ax.rotate(-time*.25);
 for(let k=0;k<6;k++){ax.rotate(TAU/6);ax.beginPath();ax.moveTo(z.r*.72,0);ax.quadraticCurveTo(z.r*.45,z.r*.14,z.r*.18,0);ax.stroke()}
 ax.restore();
 for(let k=0;k<5;k++){const ph=(time*.35+hash2(z.x,k))%1,a=hash2(z.y,k)*TAU;ax.fillStyle='rgba(170,255,225,'+(.6*ph)+')';ax.beginPath();ax.arc(p.x+Math.cos(a)*z.r*.5*hash2(k,z.x),p.y+Math.sin(a)*z.r*.3-(1-ph)*22,2+1.6*ph,0,TAU);ax.fill()}
}
function drawOrb(q,W,H,time){
 const p=worldToScreen(q.x,q.y);if(p.x<-30||p.x>W+30||p.y<-30||p.y>H+30)return;
 const pu=1+.16*Math.sin(time*4+q.x);
 ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y,q.r*3.4*pu,'#55ddff',.9);
 for(let k=0;k<2;k++){const a=time*2.2+k*Math.PI+q.y;ax.fillStyle='#bff4ff';ax.beginPath();ax.arc(p.x+Math.cos(a)*q.r*1.9,p.y+Math.sin(a)*q.r*1.9*.7,1.6,0,TAU);ax.fill()}
 ax.globalCompositeOperation='source-over';
 ax.fillStyle='#e6fbff';ax.beginPath();ax.arc(p.x,p.y,q.r*.58,0,TAU);ax.fill();ax.fillStyle='#55ddff';ax.beginPath();ax.arc(p.x,p.y,q.r*.9,0,TAU);ax.globalAlpha=.55;ax.fill();ax.globalAlpha=1;
}
function drawChest(q,W,H,time){
 const p=worldToScreen(q.x,q.y);if(p.x<-40||p.x>W+40||p.y<-40||p.y>H+40)return;
 ax.save();ax.translate(p.x,p.y);
 ax.fillStyle='rgba(0,0,0,.3)';ax.beginPath();ax.ellipse(2,13,20,7,0,0,TAU);ax.fill();
 ax.fillStyle='#7f4622';ax.beginPath();ax.roundRect(-17,-5,34,19,4);ax.fill();
 ax.strokeStyle='#5a3016';ax.lineWidth=1;ax.beginPath();ax.moveTo(-17,4);ax.lineTo(17,4);ax.moveTo(-17,9);ax.lineTo(17,9);ax.stroke();
 ax.fillStyle='#a0602e';ax.beginPath();ax.moveTo(-17,-4);ax.quadraticCurveTo(0,-24,17,-4);ax.closePath();ax.fill();
 ax.strokeStyle='#e3b446';ax.lineWidth=2.4;ax.beginPath();ax.moveTo(-9,-13);ax.lineTo(-9,14);ax.moveTo(9,-13);ax.lineTo(9,14);ax.stroke();
 ax.strokeStyle='#f6d574';ax.lineWidth=1.4;ax.beginPath();ax.moveTo(-17,-4);ax.quadraticCurveTo(0,-24,17,-4);ax.stroke();
 ax.fillStyle='#f2c94f';ax.beginPath();ax.roundRect(-3,-5,6,8,2);ax.fill();ax.fillStyle='#6a4a10';ax.beginPath();ax.arc(0,-1,1.1,0,TAU);ax.fill();
 const gl=(time*.6+hash2(q.x,q.y)*3)%3;if(gl<.5){const k=Math.sin(gl/.5*Math.PI);ax.globalCompositeOperation='lighter';ax.fillStyle='rgba(255,240,170,'+k+')';star4(ax,8,-12,6*k+1);ax.fill();ax.globalCompositeOperation='source-over'}
 ax.restore();
}
function drawPoint(q,W,H,time){
 const p=worldToScreen(q.x,q.y);if(p.x<-30||p.x>W+30||p.y<-30||p.y>H+30)return;
 const k=Math.abs(Math.cos(time*1.8+q.x));
 ax.globalCompositeOperation='lighter';glow(ax,p.x,p.y,26+4*Math.sin(time*3),'#ffd85b',.7);
 ax.fillStyle='#fff3b8';ax.save();ax.translate(p.x,p.y);ax.scale(.35+.65*k,1);star4(ax,0,0,12);ax.fill();ax.restore();
 const a=time*2.4+q.y;ax.fillStyle='#ffe9a0';ax.beginPath();ax.arc(p.x+Math.cos(a)*15,p.y+Math.sin(a)*10,1.6,0,TAU);ax.fill();
 ax.globalCompositeOperation='source-over';
}
function lobe(c,x,y,r,tone){const g=c.createRadialGradient(x-r*.3,y-r*.35,r*.1,x,y,r);g.addColorStop(0,tone?'#6db552':'#68ad50');g.addColorStop(.55,'#3c8138');g.addColorStop(1,'#1f5230');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill()}
function drawObstacle(c,x,y,o,time){
 const w=o.w,h=o.h,hs=hash2(o.x,o.y);c.save();c.translate(x,y);
 if(o.type==='tree'){
  const R=Math.max(26,Math.min(w,h)*.46),sway=Math.sin(time*1.05+hs*9)*2.3;
  c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(9,12,w*.48,h*.4,0,0,TAU);c.fill();
  c.fillStyle='#5b3b25';c.beginPath();c.roundRect(-6,-2,12,24,3);c.fill();c.fillStyle='#402617';c.fillRect(1,-2,5,24);
  c.strokeStyle='#5b3b25';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(-3,20);c.lineTo(-11,26);c.moveTo(3,20);c.lineTo(11,26);c.stroke();
  const n=5;for(let i=0;i<n;i++){const a=hs*6+i*TAU/n;lobe(c,Math.cos(a)*w*.26+sway*.6,Math.sin(a)*h*.22-8+sway*.3,R*(.62+.16*hash2(i,hs*100)),i%2)}
  lobe(c,sway,-10,R*.8,1);
  c.fillStyle='rgba(190,240,140,.32)';for(let i=0;i<7;i++){const a=hs*9+i*.9;c.beginPath();c.arc(Math.cos(a)*R*.5+sway*.8,-12+Math.sin(a)*R*.4,2.2+hash2(i,hs*50)*2,0,TAU);c.fill()}
 }else{
  c.fillStyle='rgba(0,0,0,.32)';c.beginPath();c.ellipse(8,11,w*.5,h*.4,0,0,TAU);c.fill();
  const rx=w*.42,ry=h*.4,n=9,pts=[];for(let i=0;i<n;i++){const a=i/n*TAU,r=.8+.24*hash2(o.x+i*13,o.y);pts.push([Math.cos(a)*rx*r,Math.sin(a)*ry*r])}
  const g=c.createLinearGradient(-rx,-ry,rx,ry);g.addColorStop(0,'#9aa192');g.addColorStop(.5,'#6b7268');g.addColorStop(1,'#3d423b');
  c.fillStyle=g;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();
  c.strokeStyle='rgba(20,24,20,.55)';c.lineWidth=1.6;c.stroke();
  c.strokeStyle='rgba(255,255,255,.16)';c.lineWidth=1.2;c.beginPath();for(let i=0;i<n;i+=2){c.moveTo(0,-ry*.1);c.lineTo(pts[i][0]*.9,pts[i][1]*.9)}c.stroke();
  c.fillStyle='rgba(255,255,255,.14)';c.beginPath();c.moveTo(pts[6][0]*.8,pts[6][1]*.8);c.lineTo(pts[7][0]*.85,pts[7][1]*.85);c.lineTo(pts[8][0]*.6,pts[8][1]*.6);c.lineTo(0,-ry*.15);c.closePath();c.fill();
  c.fillStyle='rgba(84,140,70,.6)';c.beginPath();c.ellipse(-rx*.2,-ry*.55,rx*.42,ry*.16,-.2,0,TAU);c.fill();c.fillStyle='rgba(120,180,96,.5)';c.beginPath();c.ellipse(-rx*.32,-ry*.6,rx*.2,ry*.07,-.2,0,TAU);c.fill();
  c.fillStyle='#7d8477';c.beginPath();c.ellipse(rx*.85,ry*.5,rx*.14,ry*.13,0,0,TAU);c.fill();c.beginPath();c.ellipse(-rx*.82,ry*.55,rx*.1,ry*.09,0,0,TAU);c.fill();
 }
 c.restore();
}
/* ---- fighters ---- */
function drawFighter(c,o){
 const sc=o.sc||1,t=o.t||0,pal=o.pal,mv=o.mv||0,wp=o.wp||0,pose=o.pose||'',seed=o.seed||0,al=o.alpha===undefined?1:o.alpha;
 c.save();c.translate(o.x,o.y);c.globalAlpha=al;
 c.fillStyle='rgba(0,0,0,.30)';c.beginPath();c.ellipse(2*sc,8*sc,19*sc,12*sc,0,0,TAU);c.fill();
 if(o.aura){c.globalCompositeOperation='lighter';glow(c,0,0,(o.auraR||36)*sc*(1+.07*Math.sin(t*3+seed)),o.aura,(o.auraA||.5)*al);c.globalCompositeOperation='source-over'}
 c.save();c.rotate(o.ang);c.scale(sc,sc);
 const br=Math.sin(t*2.6+seed)*.5,sway=Math.sin(t*5+wp)*3*(.35+mv)+Math.sin(t*1.7+seed)*1.2,sit=pose==='meditate';
 // robe tail
 c.fillStyle=pal.robe2;c.beginPath();c.moveTo(-5,-9);c.quadraticCurveTo(-15-mv*7,-10+sway,-22-mv*9,sway*1.5);c.quadraticCurveTo(-15-mv*7,10+sway,-5,9);c.closePath();c.fill();
 // legs
 if(sit){c.fillStyle=pal.robe2;c.beginPath();c.ellipse(1,-8,8,4.4,.35,0,TAU);c.fill();c.beginPath();c.ellipse(1,8,8,4.4,-.35,0,TAU);c.fill()}
 else{const sw=Math.sin(wp)*7*mv;c.fillStyle='#181c29';c.beginPath();c.ellipse(-2+sw,-6.5,6.2,3.6,0,0,TAU);c.fill();c.beginPath();c.ellipse(-2-sw,6.5,6.2,3.6,0,0,TAU);c.fill();c.fillStyle=pal.trim;c.beginPath();c.ellipse(-6+sw,-6.5,1.6,3.2,0,0,TAU);c.fill();c.beginPath();c.ellipse(-6-sw,6.5,1.6,3.2,0,0,TAU);c.fill()}
 // shoulders + torso
 c.fillStyle=pal.robe2;c.beginPath();c.arc(0,-12.6,5.2,0,TAU);c.arc(0,12.6,5.2,0,TAU);c.fill();
 c.fillStyle=pal.robe;c.beginPath();c.ellipse(0,0,11.6+br*.4,16.6+br*.5,0,0,TAU);c.fill();c.strokeStyle=pal.robe2;c.lineWidth=1.8;c.stroke();
 c.fillStyle='rgba(255,255,255,.12)';c.beginPath();c.ellipse(3,-4,5,8,.2,0,TAU);c.fill();
 c.fillStyle=pal.trim;c.beginPath();c.roundRect(-3.2,-11.6,3.6,23.2,1.6);c.fill();
 c.strokeStyle=pal.trim;c.lineWidth=2;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(7.4,-9);c.lineTo(3.6,0);c.lineTo(7.4,9);c.stroke();
 c.lineWidth=1.2;c.globalAlpha=al*.85;c.beginPath();c.arc(-7.5,-3,3.6,-1.2,1.3);c.arc(-7.5,3,3.6,-1.3,1.2,true);c.stroke();c.globalAlpha=al;
 // arms
 const arm=sd=>{
  let hx=10+Math.sin(wp+(sd>0?Math.PI:0))*5*mv,hy=sd*9.6,punching=false;
  if(pose==='meditate'){hx=9;hy=sd*3}
  else if(pose==='channel'){hx=16;hy=sd*3.4}
  else if(pose==='thrust'){hx=16+8*ease(o.cast||0);hy=sd*3.2;punching=true}
  else if(pose==='raise'){hx=17+3*Math.sin(t*10);hy=sd*4;punching=true}
  else if(o.punch>=0&&o.side===(sd>0?1:0)){const p=o.punch,k=p<.35?ease(p/.35):ease(1-(p-.35)/.65);hx=10+19*k;hy=sd*(9.6-6.4*k);punching=k>.2}
  else if(o.atk>0){const p=1-o.atk/.32,k=Math.sin(Math.min(1,p)*Math.PI);if(sd>0){hx=10+12*k;hy=sd*(9.6-4*k);punching=k>.4}}
  c.strokeStyle=pal.robe;c.lineWidth=6.4;c.lineCap='round';c.beginPath();c.moveTo(1,sd*12.6);c.lineTo(hx-3,hy);c.stroke();
  c.strokeStyle=pal.trim;c.lineWidth=6.6;c.beginPath();c.moveTo(hx-5.5,hy);c.lineTo(hx-3.5,hy);c.stroke();
  c.fillStyle=pal.skin;c.beginPath();c.arc(hx,hy,3.7,0,TAU);c.fill();
  if(punching&&o.fistGlow){c.globalCompositeOperation='lighter';glow(c,hx,hy,11,o.fistGlow,.75);c.globalCompositeOperation='source-over'}
 };
 arm(-1);arm(1);
 // head
 if(o.crown){c.fillStyle=pal.trim;for(let k=-2;k<=2;k++){c.beginPath();c.moveTo(-5.5,k*3.8-1.6);c.lineTo(-12-(k===0?4:0),k*4.3);c.lineTo(-5.5,k*3.8+1.6);c.closePath();c.fill()}}
 c.fillStyle=pal.skin;c.beginPath();c.arc(1.6,0,8.2,0,TAU);c.fill();
 c.fillStyle='rgba(0,0,0,.12)';c.beginPath();c.ellipse(9.6,0,1.9,2.4,0,0,TAU);c.fill();
 c.fillStyle=pal.hair;c.beginPath();c.arc(1.6,0,8.6,Math.PI*.36,Math.PI*1.64);c.closePath();c.fill();
 c.beginPath();c.arc(-5.6,0,4.5,0,TAU);c.fill();
 c.strokeStyle=pal.acc;c.lineWidth=2.1;c.beginPath();c.arc(1.6,0,8.3,-.9,.9);c.stroke();
 c.lineWidth=1.6;c.beginPath();c.moveTo(-6.4,-3);c.quadraticCurveTo(-13-mv*4,-3+sway*.9,-19-mv*5,-1+sway*1.5);c.moveTo(-6.4,3);c.quadraticCurveTo(-12-mv*4,4+sway*.9,-17-mv*5,5+sway*1.4);c.stroke();
 c.strokeStyle=pal.trim;c.lineWidth=1.4;c.beginPath();c.moveTo(-5.6,-6.6);c.lineTo(-5.6,6.6);c.stroke();
 c.fillStyle='#1a1418';c.beginPath();c.arc(7.3,-2.7,.95,0,TAU);c.arc(7.3,2.7,.95,0,TAU);c.fill();
 if(o.flash>0){c.globalAlpha=Math.min(.75,o.flash*.85);c.fillStyle='#fff';c.beginPath();c.ellipse(0,0,11.6,16.6,0,0,TAU);c.fill();c.beginPath();c.arc(1.6,0,8.2,0,TAU);c.fill()}
 c.restore();
 if(pose==='channel'&&o.chan>=0){const k=o.chan,ox=Math.cos(o.ang)*22*sc,oy=Math.sin(o.ang)*22*sc;c.globalCompositeOperation='lighter';glow(c,ox,oy,(6+16*k)*sc,'#c58cff',.9);glow(c,ox,oy,(3+7*k)*sc,'#ffffff',.9);c.globalCompositeOperation='source-over'}
 if(o.stun>0){c.globalCompositeOperation='lighter';glow(c,0,0,32*sc,'#8fb8ff',.45);c.globalCompositeOperation='source-over';c.fillStyle='#fff3a0';for(let k=0;k<3;k++){const a=t*3.4+k*TAU/3;star4(c,Math.cos(a)*14*sc,-26*sc+Math.sin(a)*4,4.2);c.fill()}}
 c.restore();
}
function shieldBubble(c,x,y,R,k,flash,time){
 c.save();c.translate(x,y);
 const g=c.createRadialGradient(0,0,R*.5,0,0,R);g.addColorStop(0,'rgba(99,233,255,0)');g.addColorStop(1,'rgba(99,233,255,'+(.22+.3*k*.5+.3*flash)+')');
 c.fillStyle=g;c.beginPath();c.arc(0,0,R,0,TAU);c.fill();
 c.strokeStyle='rgba(190,248,255,'+(.55+.3*flash)+')';c.lineWidth=2.2;c.beginPath();c.arc(0,0,R,0,TAU);c.stroke();
 c.rotate(time*.7);c.strokeStyle='rgba(160,240,255,.5)';c.lineWidth=1.2;c.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6;c.lineTo(Math.cos(a)*R*.86,Math.sin(a)*R*.86)}c.closePath();c.stroke();
 c.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6+TAU/12;c.lineTo(Math.cos(a)*R*.55,Math.sin(a)*R*.55)}c.closePath();c.stroke();
 c.globalCompositeOperation='lighter';c.fillStyle='#d8fbff';for(let i=0;i<4;i++){const a=i*TAU/4+time*1.6;c.beginPath();c.arc(Math.cos(a)*R,Math.sin(a)*R,2,0,TAU);c.fill()}
 c.restore();
}
function drawBar(c,x,y,w,r,h){r=Math.max(0,Math.min(1,r));c.fillStyle='rgba(8,12,22,.85)';c.beginPath();c.roundRect(x-w/2-1.5,y-1.5,w+3,h+3,(h+3)/2);c.fill();const col=r>.5?'#63e07f':r>.25?'#f0c24a':'#ea5a4a';c.fillStyle=col;c.beginPath();c.roundRect(x-w/2,y,Math.max(h,w*r),h,h/2);c.fill();c.fillStyle='rgba(255,255,255,.28)';c.beginPath();c.roundRect(x-w/2,y,Math.max(h,w*r),h/2,h/4);c.fill()}
/* ---- sprites (embedded art) ---- */
const SPR_SRC={beam:'assets/beam.webp',player:'assets/player.webp',enemy:'assets/enemy.webp',boss:'assets/boss.webp',star:'assets/star.webp'};
const SPR={};
function loadSprites(){for(const k in SPR_SRC){const im=new Image(),o={img:im,ok:false,tint:{}};SPR[k]=o;im.onload=()=>{o.ok=true;if($('cult').classList.contains('active'))drawCult();if($('techModal').classList.contains('show'))drawTech()};im.src=SPR_SRC[k]}}
loadSprites();
function tinted(k,color){const o=SPR[k];if(!o||!o.ok)return null;if(o.tint[color])return o.tint[color];const c=document.createElement('canvas');c.width=o.img.naturalWidth;c.height=o.img.naturalHeight;const g=c.getContext('2d');g.drawImage(o.img,0,0);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);return o.tint[color]=c}
function starSprite(c,x,y,r,rot,alpha){const o=SPR.star;if(!o||!o.ok)return false;c.save();c.globalCompositeOperation='lighter';c.globalAlpha=alpha===undefined?1:alpha;c.translate(x,y);c.rotate(rot||0);c.drawImage(o.img,-r,-r,r*2,r*2);c.restore();return true}
function sectOf(a){return((Math.round(a/(Math.PI/4))%8)+8)%8}
const QD=.46,BEAM_HF=.864,FIST=36;
function drawQiFx(fx,time){
 const p=worldToScreen(fx.x,fx.y),q=Math.min(1,fx.life/fx.duration),a=1-q*q;
 ax.save();ax.translate(p.x,p.y);ax.globalCompositeOperation='lighter';
 if(fx.type==='single'){
  const host=!!fx.hostile;
  if(!host&&SPR.beam.ok){
   ax.translate(0,-PL.DY);ax.rotate(fx.ang);
   const OX=FIST,Ls=(fx.range*.97-OX)/BEAM_HF,Hs=2*Math.tan(fx.cone)*fx.range*.62,g=ease(Math.min(1,Math.max(0,(q-.1)/.24))),al=(q<.55?1:1-ease((q-.55)/.45))*.92,fl=1+.05*Math.sin(fx.life*46);
   if(g>0){ax.globalAlpha=al;ax.drawImage(SPR.beam.img,OX,-Hs*fl/2,Ls*g,Hs*fl);ax.globalAlpha=1;
   glow(ax,OX+BEAM_HF*Ls*g,0,Hs*.3,'#ffd84d',.4*al);glow(ax,OX+BEAM_HF*Ls*g,0,Hs*.11,'#ffffff',.45*al)}
   ax.restore();return;
  }
  const c1=host?'255,80,70':'255,216,77',c2=host?'255,196,170':'255,243,160',len=fx.range*Math.min(1,q*1.7);
  ax.rotate(fx.ang);
  let g=ax.createLinearGradient(0,0,len,0);g.addColorStop(0,'rgba('+c2+','+.85*a+')');g.addColorStop(.5,'rgba('+c1+','+.5*a+')');g.addColorStop(1,'rgba('+c1+',0)');
  sector(ax,len,fx.cone);ax.fillStyle=g;ax.fill();
  sector(ax,len,fx.cone*.4);g=ax.createLinearGradient(0,0,len,0);g.addColorStop(0,'rgba(255,255,255,'+.9*a+')');g.addColorStop(1,'rgba(255,255,255,0)');ax.fillStyle=g;ax.fill();
  ax.strokeStyle='rgba('+c2+','+.8*a+')';ax.lineWidth=2.2;sector(ax,len,fx.cone);ax.stroke();
  ax.lineWidth=1.4;for(let k=0;k<3;k++){ax.beginPath();for(let x=0;x<=len;x+=10){const y=Math.sin(x*.06-fx.life*36+k*2.1)*Math.tan(fx.cone)*x*.34*(k-1||.6);x?ax.lineTo(x,y):ax.moveTo(x,y)}ax.stroke()}
  ax.rotate(-fx.ang);glow(ax,0,0,46*a+8,host?'#ff5a4a':'#ffe27a',.9*a);
 }else if(fx.type==='area'){
  const hostA=fx.hostile,c1a=hostA?'255,90,70':'255,240,150',c2a=hostA?'255,120,90':'255,216,77',c3a=hostA?'255,236,150':'255,236,140';
  const r=fx.radius*(.2+.8*ease(q*1.3)),g=ax.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba('+c1a+','+.4*a+')');g.addColorStop(.6,'rgba('+c2a+','+.16*a+')');g.addColorStop(1,'rgba('+c2a+',0)');
  ax.fillStyle=g;ax.beginPath();ax.arc(0,0,r,0,TAU);ax.fill();ax.strokeStyle='rgba('+c3a+','+a+')';ax.lineWidth=6*(1-q)+1;ax.beginPath();ax.arc(0,0,r,0,TAU);ax.stroke();
  ax.lineWidth=2;ax.strokeStyle='rgba(255,255,255,'+.7*a+')';ax.beginPath();ax.arc(0,0,r*.72,0,TAU);ax.stroke();
  for(let i=0;i<16;i++){const an=i*TAU/16+q;ax.beginPath();ax.moveTo(Math.cos(an)*r*.3,Math.sin(an)*r*.3);ax.lineTo(Math.cos(an)*r*.95,Math.sin(an)*r*.95);ax.strokeStyle='rgba(255,230,120,'+.3*a+')';ax.stroke()}
  glow(ax,0,0,60*a+10,fx.hostile?'#ff8a6a':'#fff0a0',.8*a);
 }else if(fx.type==='stun'){
  const r=fx.radius*ease(Math.min(1,q*1.5)),g=ax.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(220,190,255,'+.35*a+')');g.addColorStop(.7,'rgba(160,110,255,'+.16*a+')');g.addColorStop(1,'rgba(160,110,255,0)');
  ax.fillStyle=g;ax.beginPath();ax.arc(0,0,r,0,TAU);ax.fill();
  ax.strokeStyle='rgba(206,170,255,'+a+')';ax.lineWidth=5*(1-q)+1.4;ax.beginPath();ax.arc(0,0,r,0,TAU);ax.stroke();
  ax.rotate(fx.life*2.4);ax.lineWidth=2;ax.setLineDash([16,12]);ax.strokeStyle='rgba(235,215,255,'+.8*a+')';ax.beginPath();ax.arc(0,0,r*.82,0,TAU);ax.stroke();ax.setLineDash([]);
  ax.lineWidth=1.6;ax.beginPath();for(let i=0;i<5;i++){const an=i*TAU*2/5;ax.lineTo(Math.cos(an)*r*.6,Math.sin(an)*r*.6)}ax.closePath();ax.stroke();
  for(let i=0;i<24;i++){const an=i*TAU/24;ax.beginPath();ax.moveTo(Math.cos(an)*r*.94,Math.sin(an)*r*.94);ax.lineTo(Math.cos(an)*r*1.02,Math.sin(an)*r*1.02);ax.stroke()}
  glow(ax,0,0,80*a+12,'#c58cff',.9*a);
 }else if(fx.type==='ring'){
  const r=fx.radius*ease(q);ax.strokeStyle=fx.col+Math.round(a*200).toString(16).padStart(2,'0');ax.lineWidth=4*(1-q)+1;ax.beginPath();ax.arc(0,0,r,0,TAU);ax.stroke();
 }
 ax.restore();
}
function drawSlash(sl){
 const p=worldToScreen(sl.x,sl.y),k=sl.t/sl.max,a=1-k;
 ax.save();ax.translate(p.x,p.y);ax.rotate(sl.ang);ax.globalCompositeOperation='lighter';
 const sw=sl.side?1:-1,from=-1.35*sw,to=1.35*sw,cur=from+(to-from)*ease(Math.min(1,k*2.2));
 ax.strokeStyle='rgba(190,240,255,'+.85*a+')';ax.lineWidth=7*a+1;ax.lineCap='round';ax.beginPath();ax.arc(0,0,44,from,cur,sw<0);ax.stroke();
 ax.strokeStyle='rgba(255,255,255,'+a+')';ax.lineWidth=2.6*a+.6;ax.beginPath();ax.arc(0,0,44,from,cur,sw<0);ax.stroke();
 ax.restore();
}
function drawParts(){
 const s=arenaState;
 for(const p of s.parts){if(p.k!=='dust')continue;const q=p.t/p.max,x=p.x-s.camx+aw/devicePixelRatio/2,y=p.y-s.camy+ah/devicePixelRatio/2;ax.fillStyle='rgba(190,180,150,'+.32*(1-q)+')';ax.beginPath();ax.arc(x,y,p.size*(1+q*1.6),0,TAU);ax.fill()}
 ax.globalCompositeOperation='lighter';
 for(const p of s.parts){
  if(p.k==='dust')continue;const q=p.t/p.max,k=1-q;let x=p.x-s.camx+aw/devicePixelRatio/2,y=p.y-s.camy+ah/devicePixelRatio/2;
  if(p.k==='spark'){ax.fillStyle=p.col;ax.globalAlpha=Math.min(1,k*1.4);ax.beginPath();ax.arc(x,y,p.size*k+.5,0,TAU);ax.fill()}
  else if(p.k==='soul'||p.k==='ember'){glow(ax,x,y,p.size*(1+.3*q),p.col,k*.85)}
  else if(p.k==='mote'){const rr=p.r0*(1-q*q),a=p.a+p.t*p.spin;x=s.px-s.camx+aw/devicePixelRatio/2+Math.cos(a)*rr;y=s.py-s.camy+ah/devicePixelRatio/2+Math.sin(a)*rr*.85;glow(ax,x,y,5,p.col,Math.min(1,k*1.6)*.9)}
 }
 ax.globalAlpha=1;ax.globalCompositeOperation='source-over';
}
function drawFloats(){
 const s=arenaState;ax.textAlign='center';
 for(const f of s.floats){const k=f.t/f.max,al=k<.7?1:1-(k-.7)/.3,sc=k<.15?1+(.15-k)*3.5:1,x=f.x-s.camx+aw/devicePixelRatio/2,y=f.y-s.camy+ah/devicePixelRatio/2;ax.globalAlpha=al;outText(ax,f.text,x,y,f.col,f.size*sc)}
 ax.globalAlpha=1;
}
function drawAmbient(W,H,time){
 const s=arenaState;ax.globalCompositeOperation='lighter';
 for(let i=0;i<22;i++){const sp=8+hash2(i,3)*14,bx=hash2(i,1)*(W+80),by=hash2(i,2)*(H+80);
  const x=(((bx+time*sp-s.camx*.22+Math.sin(time*.7+i)*22)%(W+80))+(W+80))%(W+80)-40,y=(((by+Math.sin(time*.5+i*2)*26-s.camy*.22)%(H+80))+(H+80))%(H+80)-40;
  glow(ax,x,y,7,'#d8ff9a',.35+.35*Math.sin(time*2.4+i*1.7))}
 ax.globalCompositeOperation='source-over';
 for(let i=0;i<9;i++){const sp=14+hash2(i,7)*12,x=(((hash2(i,5)*(W+60)+time*sp*.6-s.camx*.3)%(W+60))+(W+60))%(W+60)-30,y=(((hash2(i,6)*(H+60)+time*sp-s.camy*.3)%(H+60))+(H+60))%(H+60)-30;
  ax.save();ax.translate(x,y);ax.rotate(time*1.2+i);ax.fillStyle='rgba(255,182,208,.7)';ax.beginPath();ax.ellipse(0,0,3.4,1.6*Math.abs(Math.cos(time*2+i))+.4,0,0,TAU);ax.fill();ax.restore()}
}
