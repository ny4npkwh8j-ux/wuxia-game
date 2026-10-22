'use strict';
/* ===== единый вид окон: шапка с иконкой, названием и крестиком; нижняя кнопка «Закрыть» скрывается (работает крестик и касание фона) ===== */
const MODAL_ICO={settingsModal:'cog',techModal:'yin-yang',scrollModal:'scroll-unfurled',pillarModal:'pagoda',columnsModal:'pagoda',coreModal:'crystal-shine',soulModal:'crystal-ball',npcModal:'two-coins',tradeModal:'two-coins',sectModal:'dragon-head',invModal:'backpack',mapModal:'treasure-map',modal:'yin-yang'};
function uniModal(m){
 if(m.__u||m.id==='stageAnim'||m.id==='confirmModal')return;
 const sh=m.querySelector('.sheet'),h3=sh&&sh.querySelector('h3');if(!h3)return;
 m.__u=1;sh.classList.add('usheet');h3.textContent=h3.textContent.replace(/^[^A-Za-zА-Яа-яЁё0-9]+/,'');
 const head=document.createElement('div');head.className='uhead';
 const ic=document.createElement('i');ic.className='ico';ic.dataset.ico=MODAL_ICO[m.id]||'yin-yang';
 const x=document.createElement('button');x.className='uclose';x.textContent='×';x.setAttribute('aria-label','Закрыть');
 sh.insertBefore(head,sh.firstChild);head.append(ic,h3,x);hydrateIcons(head);
 const closer=[...sh.querySelectorAll('button')].reverse().find(b=>!head.contains(b)&&/^(Закрыть|Назад|Продолжить)/.test(b.textContent.trim()));
 if(closer){const p=closer.parentElement;(p.classList.contains('row')&&p.children.length===1?p:closer).classList.add('uhide')}
 x.onclick=()=>closer?closer.click():m.classList.remove('show');
 m.addEventListener('pointerdown',e=>{if(e.target===m)x.onclick()});
}
document.querySelectorAll('.modal').forEach(uniModal);
