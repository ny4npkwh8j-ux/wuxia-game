'use strict';
const joy=$('joy'),stick=$('stick');let joyId=null;
function moveJoyPoint(x,y){interruptArenaMeditation();if(!arenaState)return;const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy)||1,m=Math.min(42,d);dx=dx/d*m;dy=dy/d*m;stick.style.transform=`translate(${dx}px,${dy}px)`;arenaState.dx=dx/42;arenaState.dy=dy/42}
joy.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();e.stopPropagation();joyId=e.pointerId;moveJoyPoint(e.clientX,e.clientY)});window.addEventListener('pointermove',e=>{if(e.pointerId===joyId){e.preventDefault();moveJoyPoint(e.clientX,e.clientY)}},{passive:false});
function endJoy(e){if(e.pointerId===joyId){joyId=null;if(arenaState){arenaState.dx=0;arenaState.dy=0}stick.style.transform='translate(0,0)'}}
window.addEventListener('pointerup',endJoy);window.addEventListener('pointercancel',endJoy);
const attackBtn=$('attackBtn'),attackAim=$('attackAim');
function setButtonAim(btn,marker,e){if(!arenaState)return;arenaState.aimT=.7;const r=btn.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),d=Math.hypot(dx,dy);if(d<8){arenaState.shootAng=arenaState.facing||0}else{const nx=dx/d,ny=dy/d;arenaState.shootAng=Math.atan2(ny,nx);const mm=Math.min(23,d);marker.style.left=(50+nx*mm/r.width*100)+'%';marker.style.top=(50+ny*mm/r.height*100)+'%'}}
function wireAimButton(btn,marker,onRelease){let id=null;btn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();id=e.pointerId;btn.setPointerCapture?.(e.pointerId);setButtonAim(btn,marker,e)});btn.addEventListener('pointermove',e=>{if(e.pointerId===id){e.preventDefault();e.stopPropagation();setButtonAim(btn,marker,e)}});btn.addEventListener('pointerup',e=>{if(e.pointerId===id){e.preventDefault();e.stopPropagation();setButtonAim(btn,marker,e);onRelease();id=null;marker.style.left='50%';marker.style.top='50%'}});btn.addEventListener('pointercancel',()=>{id=null;marker.style.left='50%';marker.style.top='50%'})}
wireAimButton(attackBtn,attackAim,arenaAttack);
$('arenaMeditateBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();beginArenaMeditation()});$('arenaMeditateBtn').addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();stopArenaMeditation()});$('arenaMeditateBtn').addEventListener('pointercancel',stopArenaMeditation);$('arenaMeditateBtn').addEventListener('lostpointercapture',stopArenaMeditation);
/* ===== ПК: WASD/стрелки — движение · мышь — поворот и прицел · ЛКМ — удар · цифры 1–9, 0 — техники =====
   Цифра = кнопка техники с тем же номером (бейдж на кнопке). Техники с зажатием (Удар Ци, Волна, Оцепенение, Лечение):
   держи цифру — заряд/каст, отпусти — выстрел в сторону курсора. Сенсорное управление работает как раньше. */
const kb={keys:new Set(),held:new Map(),mx:0,my:0,mouseDown:false,moving:false};
const MOVE_KEYS={KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
function arenaActive(){return !!arenaState&&$('arena').classList.contains('active')&&!document.querySelector('.modal.show')}
function updateMouseAim(){
 const s=arenaState;if(!s||!s.kbAim)return;
 const r=$('arena').getBoundingClientRect(),p=worldToScreen(s.px,s.py),ang=Math.atan2(kb.my-r.top-p.y,kb.mx-r.left-p.x);
 s.shootAng=ang;s.facing=ang;
}
function applyKbMove(){
 const s=arenaState;if(!s)return;let x=0,y=0;
 for(const k of kb.keys){const v=MOVE_KEYS[k];if(v){x+=v[0];y+=v[1]}}
 if(x||y){interruptArenaMeditation();const m=Math.hypot(x,y);s.dx=x/m;s.dy=y/m;kb.moving=true}
 else if(kb.moving){kb.moving=false;if(joyId===null){s.dx=0;s.dy=0}}
}
function techKeyDown(i){
 const s=arenaState,t=save.techniques[i];if(!s||!t)return false;
 if(!s.kbAim)s.shootAng=s.facing;else updateMouseAim();
 switch(t.type){
  case 'qiSingle':case 'qiArea':beginQiCharge(t.type);break;
  case 'stun':beginChannel(t);break;
  case 'heal':beginHeal(t);break;
  case 'shield':activateShield(t);break;
  case 'dodge':startDash(t);break;
  case 'qiShield':toggleQiShield();break;
 }
 return true;
}
function techKeyUp(i){
 const s=arenaState,t=save.techniques[i];if(!s||!t)return;
 if(t.type==='qiSingle'||t.type==='qiArea'){if(s.kbAim)updateMouseAim();else s.shootAng=s.facing;endQiCharge(t.type,t)}
 else if(t.type==='stun')endChannel();
 else if(t.type==='heal')endHeal();
}
function techIndexOfKey(code){const m=/^(?:Digit|Numpad)(\d)$/.exec(code);if(!m)return -1;const n=+m[1];return n===0?9:n-1}
window.addEventListener('keydown',e=>{
 if(!arenaActive()||e.ctrlKey||e.metaKey||e.altKey)return;
 if(MOVE_KEYS[e.code]){e.preventDefault();kb.keys.add(e.code);applyKbMove();return}
 if(e.code==='KeyE'){e.preventDefault();if(!e.repeat)openNpc();return}
 const i=techIndexOfKey(e.code);
 if(i>=0){e.preventDefault();if(e.repeat||kb.held.has(e.code))return;if(techKeyDown(i))kb.held.set(e.code,i)}
});
window.addEventListener('keyup',e=>{
 if(MOVE_KEYS[e.code]){kb.keys.delete(e.code);applyKbMove();return}
 if(kb.held.has(e.code)){const i=kb.held.get(e.code);kb.held.delete(e.code);techKeyUp(i)}
});
function releaseAllKeys(){
 kb.keys.clear();applyKbMove();kb.mouseDown=false;
 for(const i of kb.held.values())techKeyUp(i);kb.held.clear();
}
window.addEventListener('blur',releaseAllKeys);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAllKeys()});
/* мышь: поворот и прицел следуют за курсором, ЛКМ — удар (удержание — серия ударов с кулдауном замаха) */
window.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||!arenaState)return;kb.mx=e.clientX;kb.my=e.clientY;arenaState.kbAim=true;updateMouseAim()},{passive:true});
window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&arenaState)arenaState.kbAim=false},true);
$('arena').addEventListener('pointerdown',e=>{
 if(e.pointerType!=='mouse'||e.button!==0||!arenaState||e.target.closest('button,#joy,.card,#techCol,.leave'))return;
 kb.mx=e.clientX;kb.my=e.clientY;arenaState.kbAim=true;updateMouseAim();kb.mouseDown=true;arenaAttack();
});
window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&e.button===0)kb.mouseDown=false});
setInterval(()=>{if(kb.mouseDown&&arenaActive()){updateMouseAim();arenaAttack()}},50);
