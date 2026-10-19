'use strict';
/* ===== обмен с мобами и боссами, секта игрока =====
   Торговать можно с теми, кто не агрился (не враждебен и не вызван на бой), и со своими по секте.
   Они продают то, что носят, и покупают снаряжение за свои осколки; платёж идёт им на рост. Босс продаёт описание своей техники.
   Секта игрока: save.sectId (новый ключ). Свои не нападают и помогают в бою, враги секты — враги игрока; ударишь своего — изгнан. ===== */
const TRADE_RANGE=120;
function playerSect(){const s=arenaState;if(!s||save.sectId==null)return null;return sectById(save.sectId)}
function isMate(e){return !!e&&e.sect!=null&&e.sect===save.sectId}
function tradeOk(e){
 if(!e||e.hp<=0||e.foeId!=null||e.stun>0)return false;
 if(isMate(e))return true;
 if(e.hostile||e.provoked)return false;
 if(e.isBoss&&(e.engagedT||0)>0)return false;
 return true;
}
function tradeTarget(){
 const s=arenaState;if(!s)return null;let best=null,bd=TRADE_RANGE;
 for(const e of s.enemies.concat(aliveBosses(s))){if(e.hp<=0)continue;const d=Math.hypot(e.x-s.px,e.y-s.py);if(d<bd&&tradeOk(e)){bd=d;best=e}}
 return best;
}
let tradeId=null;
(function(){const m=document.createElement('div');m.id='tradeModal';m.className='modal';m.innerHTML='<div class="sheet"><h3 id="tradeTitle">Обмен</h3><p id="tradeInfo"></p><div id="tradeList"></div><div class="row"><button class="bigbtn" onclick="closeTrade()">Закрыть</button></div></div>';document.body.appendChild(m)})();
function tradeEnt(){return tradeId==null||!arenaState?null:findEnt(tradeId)}
function openTrade(){const e=tradeTarget();if(!e)return;arenaMeditation.active&&interruptArenaMeditation();tradeId=e.id;renderTrade();$('tradeModal').classList.add('show')}
function closeTrade(){tradeId=null;$('tradeModal').classList.remove('show')}
function tradeTick(){
 if(tradeId==null)return;const s=arenaState,e=tradeEnt();
 if(!s||!e||!tradeOk(e)||Math.hypot(e.x-s.px,e.y-s.py)>TRADE_RANGE*2){const broke=!!e&&!tradeOk(e);closeTrade();if(broke)toast('Собеседник прервал обмен.')}
}
function drawTradeHint(time){
 const s=arenaState;if(!s)return;const e=tradeTarget();if(!e||$('tradeModal').classList.contains('show'))return;
 const p=worldToScreen(e.x,e.y);outText(ax,'E — обмен',p.x,p.y-(e.isBoss?96:72),'#fff',11);
}
function tradeMult(e){return (e.isBoss?1.6:1.25)*(isMate(e)?.8:1)}
function joinPlayerSect(sc){save.sectId=sc.id;persist();chron('Игрок вступил в секту «'+sc.name+'»');toast('Ты вступил в секту «'+sc.name+'». Свои не тронут тебя и помогут в бою.')}
function leavePlayerSect(){const sc=playerSect();save.sectId=null;persist();if(sc)chron('Игрок покинул секту «'+sc.name+'»');toast('Ты покинул секту.')}
function renderTrade(){
 const e=tradeEnt();if(!e)return closeTrade();
 const sc=e.sect?sectById(e.sect):null,mate=isMate(e),mult=tradeMult(e);
 $('tradeTitle').textContent=e.isBoss?'Босс '+e.index:'Культиватор ★'+(e.stars||0);
 $('tradeInfo').textContent='Твои осколки: душа '+fmt(save.rewards)+' · 2 этапа '+fmt(save.rewards2)+' | у него: '+fmt(e.sh1||0)+' / '+fmt(e.sh2||0)+(mate?' | свой по секте — скидка':'');
 const box=$('tradeList');box.innerHTML='';let any=false;
 if(sc){any=true;const m=SM.get(sc.id),n=sectMembers(sc).length,ps=playerSect();
  const btns=[];
  if(mate)btns.push(['Покинуть секту',true,()=>{leavePlayerSect();renderTrade()}]);
  else if(!ps)btns.push(['Вступить в секту',true,()=>{joinPlayerSect(sc);renderTrade()}]);
  else btns.push(['Ты уже в другой секте «'+ps.name+'»',false,()=>{}]);
  shopCard(box,'☯ Секта «'+sc.name+'»',mate?'твоя':'чужая','Глава ★'+(m?m.stars||0:'?')+' · учеников: '+n+'. Члены секты не нападают друг на друга, помогают в бою и торгуют со скидкой.',btns)}
 /* его товар: снаряжение */
 for(const slot of ['weapon','armor']){
  const id=e.gear&&e.gear[slot];if(!id||!GEAR[id])continue;any=true;
  const it=GEAR[id],k=it.tier===1?1:2,price=Math.ceil(it.price*mult),key=k===1?'sh1':'sh2';
  shopCard(box,it.icon+' '+it.name,'носит он',it.desc,[['Купить · '+costText(k,price),canPay(k,price),()=>{
   if(!tradeOk(e))return closeTrade();if(!e.gear||e.gear[slot]!==id)return renderTrade();if(!shopPay(k,price))return;
   e.gear[slot]=null;e[key]=(e[key]||0)+price;gearGive(id,true);toast('Куплено: '+it.name+' — в инвентаре.');persist();renderTrade()}]])}
 /* техника босса */
 if(e.isBoss){
  for(const id of [].concat(BOSS_SCROLL[e.index]||[])){
   const sc2=SCROLLS[id];if(!sc2||(save.scrolls||[]).includes(id))continue;any=true;const price=400*e.index;
   shopCard(box,'📜 Описание техники «'+sc2.name+'»','босс '+e.index,'Босс делится знанием за осколки души.',[['Купить · '+costText(1,price),canPay(1,price),()=>{
    if(!tradeOk(e))return closeTrade();if(!shopPay(1,price))return;e.sh1=(e.sh1||0)+price;grantScroll(id);toast('Свиток «'+sc2.name+'» получен — смотри «Свитки».');persist();renderTrade()}]])}
 }
 /* твой товар: снаряжение, которое ему пригодится; платит он своими осколками */
 const ids=[...new Set(gearSave().own)].filter(id=>GEAR[id]&&gearUseful(e,id));
 if(ids.length){
  const h=document.createElement('h4');h.textContent='Продать ему';box.appendChild(h);
  for(const id of ids){
   const it=GEAR[id],k=it.tier===1?1:2,key=k===1?'sh1':'sh2',pay=Math.floor(it.price*.5*(mate?1:.9)),ok=(e[key]||0)>=pay;any=true;
   shopCard(box,it.icon+' '+it.name,'ур. '+it.tier,'',[[ok?'Продать · +'+costText(k,pay):'У него нет столько осколков ('+costText(k,pay)+')',ok,()=>{
    if(!tradeOk(e))return closeTrade();if((e[key]||0)<pay||!gearTake(id))return;entEquip(e,id);e[key]-=pay;save[k===1?'rewards':'rewards2']+=pay;toast('Продано: '+it.name);persist();renderTrade()}]])}
 }
 if(!any){const p=document.createElement('p');p.className='sc-empty';p.textContent='Ему сейчас нечего предложить и нечего купить у тебя.';box.appendChild(p)}
}
/* свои помогают игроку: когда он бьёт чужого, до трёх учеников секты вступают в бой с ним */
function sectAssist(e){
 const s=arenaState,sc=playerSect();if(!s||!sc||e.sect===sc.id||e.foeId!=null)return;
 const now=performance.now();if(e._asT&&now-e._asT<5000)return;e._asT=now;
 let n=0;
 for(const m of s.enemies){
  if(m.hp<=0||m.sect!==sc.id||m.foeId!=null||Math.hypot(m.x-s.px,m.y-s.py)>900)continue;
  if(entPow(m)/entPow(e)<PW_LO)continue;
  startDuel(m,e);if(++n>=3)break;
 }
}
/* вражда сект: секта в бою с другой считает её врагом, а враги секты игрока — враги игрока */
function sectAtWar(a,b){const sa=sectById(a);return !!(sa&&sa.war&&sa.war[b])}
function sectWarWithPlayer(e){return e.sect!=null&&save.sectId!=null&&e.sect!==save.sectId&&sectAtWar(e.sect,save.sectId)}
