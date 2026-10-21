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
function leavePlayerSect(){const sc=playerSect();save.sectId=null;if(sc&&sc.pl)sc.pl=false;persist();if(sc)chron('Игрок покинул секту «'+sc.name+'»');toast('Ты покинул секту.')}
function playerLeads(){const sc=playerSect();return !!(sc&&sc.pl)}
/* возглавить секту: убив её главу; ученики признают победителя */
function sectKilledByPlayer(e){
 const s=arenaState;if(!s||e.sect==null)return;const sc=sectById(e.sect);if(!sc||sc.pl||playerLeads())return;
 if(!(SM.get(sc.id)===e||sc.master===e.id))return;
 const mem=sectMembers(sc).filter(m=>m!==e);if(!mem.length)return;
 mem.sort((a,b)=>entPow(b)-entPow(a));sc.master=mem[0].id;sc.pl=true;sc.order='free';save.sectId=sc.id;persist();
 for(const m of mem){m.hostile=false;m.provoked=false;m.foeId=null;m.noSeeT=0}
 chron('Игрок убил главу секты «'+sc.name+'» и возглавил её');toast('☯ Секта «'+sc.name+'» признала тебя главой! Ученики: '+mem.length+'.');
}
/* пригласить свободного культиватора в свою секту: идёт за равным или сильным, слабейшему служить не станет */
function invitePlayer(e){
 const s=arenaState;if(!s||e.sect!=null||e.lord||e.isBoss)return;
 if(e._invT&&performance.now()-e._invT<90000)return toast('Он ещё обдумывает прошлое предложение.');
 e._invT=performance.now();
 const r=playerPow()/entPow(e);
 if(r<PW_LO)return toast('«Я не стану служить тому, кто слабее меня.»');
 if(Math.random()>.7)return toast('«Не сейчас. Предложи позже.»');
 const sc=playerSect();
 if(sc&&sc.pl){sectJoin(e,sc);chron('К секте «'+sc.name+'» присоединился ★'+(e.stars||0))}
 else foundSect(e,[],true);
 toast('☯ Он принял предложение и вступил в твою секту!');renderTrade();
}
function giveShards(e,k,n){const key=k===1?'rewards':'rewards2',ek=k===1?'sh1':'sh2';if(save[key]<n)return;save[key]-=n;e[ek]=(e[ek]||0)+n;persist();renderTrade()}
function takeShards(e,k,n){const key=k===1?'rewards':'rewards2',ek=k===1?'sh1':'sh2';n=Math.min(n,Math.floor(e[ek]||0));if(n<=0)return;e[ek]-=n;save[key]+=n;persist();renderTrade()}
function renderTrade(){
 const e=tradeEnt();if(!e)return closeTrade();
 const sc=e.sect?sectById(e.sect):null,mate=isMate(e),mult=tradeMult(e);
 $('tradeTitle').textContent=e.isBoss?'Босс '+e.index:'Культиватор ★'+(e.stars||0);
 $('tradeInfo').textContent='Твои осколки: душа '+fmt(save.rewards)+' · 2 этапа '+fmt(save.rewards2)+' | у него: '+fmt(e.sh1||0)+' / '+fmt(e.sh2||0)+(mate?' | свой по секте — скидка':'');
 const box=$('tradeList');box.innerHTML='';let any=false;
 if(sc){any=true;const m=SM.get(sc.id),n=sectMembers(sc).length,ps=playerSect();
  const btns=[];
  if(mate&&sc.pl)btns.push(['☯ Меню секты',true,()=>{closeTrade();openSectMenu()}]);
  if(mate)btns.push([sc.pl?'Оставить секту (перейдёт заместителю)':'Покинуть секту',true,()=>{leavePlayerSect();renderTrade()}]);
  else if(!ps)btns.push(['Вступить в секту',true,()=>{joinPlayerSect(sc);renderTrade()}]);
  else btns.push(['Ты уже в другой секте «'+ps.name+'»',false,()=>{}]);
  shopCard(box,'☯ Секта «'+sc.name+'»',mate?(sc.pl?'ты глава':'твоя'):'чужая',(sc.pl?'Заместитель ★':'Глава ★')+(m?m.stars||0:'?')+' · учеников: '+n+'. Члены секты не нападают друг на друга, помогают в бою и торгуют со скидкой.'+(sc.pl?' Раз в минуту секта приносит тебе дань.':''),btns)}
 /* приглашение свободного культиватора */
 if(!e.isBoss&&!e.sect&&!e.lord){const ps=playerSect();any=true;
  shopCard(box,'🤝 Предложить вступить в твою секту',ps&&sc===null&&!ps.pl?'нельзя':(ps&&ps.pl?'ты глава':'новая секта'),ps&&!ps.pl?'Ты состоишь в чужой секте — сначала покинь её.':ps&&ps.pl?'Он станет твоим учеником: будет приносить дань и драться на твоей стороне.':'Если согласится, ты основешь секту и станешь её главой. Слабейшему себя он служить не станет.',[['Предложить',!(ps&&!ps.pl)&&!(ps&&ps.pl&&sectMembers(ps).length>=sectCapOf(ps,SM.get(ps.id)||e)),()=>invitePlayer(e)]])}
 /* свои: дать или взять */
 if(mate){any=true;const lead=playerLeads();
  if(lead)shopCard(box,'🚪 Исключить из секты','ты глава','Он покинет секту и вернётся к своим делам; прежних сил у него не отнимут.',[['Исключить',true,()=>kickMember(e)]]);
  shopCard(box,'🎁 Дать осколки','свои','Подарок ученику — ему на рост.',[[ '100 души',canPay(1,100),()=>giveShards(e,1,100)],['1000 души',canPay(1,1000),()=>giveShards(e,1,1000)],['1 (2 этапа)',canPay(2,1),()=>giveShards(e,2,1)],['10 (2 этапа)',canPay(2,10),()=>giveShards(e,2,10)]]);
  if(lead)shopCard(box,'🤲 Взять осколки','ты глава','Забрать у ученика накопленное.',[['100 души',(e.sh1||0)>=100,()=>takeShards(e,1,100)],['Всё душа ('+fmt(e.sh1||0)+')',(e.sh1||0)>=1,()=>takeShards(e,1,1e12)],['1 (2 этапа)',(e.sh2||0)>=1,()=>takeShards(e,2,1)],['Всё 2 этапа ('+fmt(e.sh2||0)+')',(e.sh2||0)>=1,()=>takeShards(e,2,1e12)]]);
  else{const p=document.createElement('p');p.className='sc-empty';p.textContent='Забирать у своих может только глава секты.';box.appendChild(p)}
  for(const slot of ['weapon','armor']){const id=e.gear&&e.gear[slot];if(!id||!GEAR[id]||!lead)continue;const it=GEAR[id];
   shopCard(box,it.icon+' '+it.name,'у него','',[['Забрать себе',true,()=>{if(!e.gear||e.gear[slot]!==id)return renderTrade();e.gear[slot]=null;gearGive(id,true);toast('Забрано: '+it.name);persist();renderTrade()}]])}
  for(const id of [...new Set(gearSave().own)]){if(!GEAR[id]||!gearUseful(e,id))continue;const it=GEAR[id];
   shopCard(box,it.icon+' '+it.name,'из инвентаря','',[['Отдать ему',true,()=>{if(!gearTake(id))return;entEquip(e,id);toast('Отдано: '+it.name);persist();renderTrade()}]])}
 }
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
 const ids=mate?[]:[...new Set(gearSave().own)].filter(id=>GEAR[id]&&gearUseful(e,id));
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
 const od=sc.pl?sc.order:'free';if(od==='retreat'||od==='hunt')return;/* на отступлении и охоте помощь не идёт */
 const fol=od==='follow',now=performance.now();if(e._asT&&now-e._asT<(fol?1500:5000))return;e._asT=now;
 let n=0;const lim=fol?20:sc.pl?6:3,rng=fol?2200:sc.pl?1400:900;
 for(const m of s.enemies){
  if(m.hp<=0||m.sect!==sc.id||m.foeId!=null||Math.hypot(m.x-s.px,m.y-s.py)>rng)continue;
  if((!fol||e.isBoss)&&entPow(m)/entPow(e)<PW_LO)continue;/* по приказу «следовать» ученики бьют всё, с чем дерётся глава */
  startDuel(m,e);if(++n>=lim)break;
 }
}
/* вражда сект: секта в бою с другой считает её врагом, а враги секты игрока — враги игрока */
function sectAtWar(a,b){const sa=sectById(a);return !!(sa&&sa.war&&sa.war[b])}
function sectWarWithPlayer(e){return e.sect!=null&&save.sectId!=null&&e.sect!==save.sectId&&sectAtWar(e.sect,save.sectId)}
