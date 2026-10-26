'use strict';
const BUILD_VERSION='0.8.46';
const SAVE_KEY='wuxiaSave';
const SAVE_SCHEMA='cultivation_arena_v2';
const $=id=>document.getElementById(id);
const freshSave=()=>({qi:100,maxQi:100,dantian:100,stars:0,meridians:0,pillars:0,pillarProgress:0,pillarQi:0,pillarRewards:0,pillarChanceExtra:0,pillarQuality:null,pillarCoef:0,pillarQiBonus:0,pillarStars:0,blueprints:[],str:10,spd:7,health:100,zoom:1,panX:0,panY:0,starPts:[],meridianEdges:[],techniques:[],rewards:0,rewards2:0,scrolls:[],arenaCheckpoint:null,stageLevel:1,strengthBalanceV:2,coreCoef:0,coreQuality:null,coreDeposit:0,coreChanceExtra:0,hints:[],coreDens:0,lostLoot:[]});
let save=freshSave();
function latestLegacySaveKey(){
 const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&/^wuxiaSave_\d+\.\d+\.\d+$/.test(k))keys.push(k)}
 keys.sort((a,b)=>{const va=a.slice(10).split('.').map(Number),vb=b.slice(10).split('.').map(Number);for(let i=0;i<3;i++){if((vb[i]||0)!==(va[i]||0))return (vb[i]||0)-(va[i]||0)}return 0});return keys[0]||null;
}
try{
 const raw=localStorage.getItem(SAVE_KEY)||localStorage.getItem(latestLegacySaveKey());
 if(raw){Object.assign(save,JSON.parse(raw));}
 if(save.arenaCheckpoint&&Array.isArray(save.arenaCheckpoint.enemies))save.arenaCheckpoint.enemies=save.arenaCheckpoint.enemies.filter(e=>e&&e.hp>0);/* убитые раньше копились в сохранении и раздували его */
 save.pillarProgress??=0;save.pillarQi??=0;save.pillarRewards??=0;save.techniques??=[];save.arenaCheckpoint??=null;save.stageLevel??=1;save.rewards??=0;save.scrolls??=[];
 save.hints??=[];save.lostLoot??=[];save.coreDens??=0;save.coreCoef??=0;save.coreQuality??=null;save.coreDeposit??=0;save.coreChanceExtra??=0;
 save.rewards2??=0;save.pillarChanceQi??=0;save.pillarChanceExtra??=0;save.pillarQuality??=null;save.pillarCoef??=0;save.pillarQiBonus??=0;save.pillarStars??=0;
 if(save.pillarMult&&!save.pillarCoef){save.pillarCoef=save.pillarMult;delete save.pillarMult}
 if(save.pillars>0&&!save.pillarCoef){const q=pillarQualityFor(save.stars);save.pillarCoef=q.coef;save.pillarQiBonus=q.qi;save.pillarQuality=q.name;save.pillarStars=save.stars}
 save.rewards3??=0;save.divineAt??=0;save.divineGrant??=null;save.soulStage??=0;save.soulDeposit??=0;save.soulQi??=null;
 /* ремонт: этап души не выше III; если запас Ци или здоровье испорчены (NaN при записи становится null), они восстанавливаются по формулам стадий */
 {const ok=v=>typeof v==='number'&&Number.isFinite(v);save.soulStage=Math.max(0,Math.min(3,Math.floor(Number(save.soulStage))||0));
  if(!ok(save.maxQi)||!ok(save.health)){const cc=ok(save.coreCoef)&&save.coreCoef>0?save.coreCoef*(1+.1*(save.coreDens||0)):1,sm=[1,1.3,1.6,2][save.soulStage],st=ok(save.stars)?save.stars:0;
   if(!ok(save.maxQi))save.maxQi=Math.round(Math.max(100,100+10*st)*cc*sm);
   if(!ok(save.health))save.health=Math.round((100+4*st+3*st*(save.stageLevel>=2?1.5:1))*cc*sm)}
  /* ядро больше не множит запас Ци: пересчёт один раз для уже сформированных ядер (колонны на момент слияния считаются тремя, качество — по множителю ядра) */
  if(save.coreCoef>0&&save.coreQiV!==2){const t=Math.max(0,Math.min(1,(save.coreCoef-1.3)/1.2)),plus=3000*(1+.5*t)+(save.coreDens||0)*1000*Math.max(.3,Math.min(1,save.coreCoef/2.5));
   save.maxQi=Math.round((100+10*(ok(save.stars)?save.stars:0)+plus)*[1,1.3,1.6,2][save.soulStage]);save.coreQiV=2}
  if(!ok(save.qi))save.qi=0;save.qi=Math.min(save.qi,save.maxQi)}
 if(save.pillars>0&&!Array.isArray(save.pillarQs)){save.pillarQs=[];save.pillarBs=[]}
 if(save.pillars>0){while(save.pillarQs.length<save.pillars){save.pillarQs.push(save.pillarCoef||pillarQualityFor(save.stars).coef);save.pillarBs.push(save.pillarQiBonus||pillarQualityFor(save.stars).qi)}}
 if(save.pillars>0&&!save.pillarQiBonus){save.pillarQiBonus=pillarQualityFor(save.pillarStars||save.stars).qi}/* старые сохранения: бонус Ци колонны не был записан */
 if(save.pillarRewards>0){save.rewards+=save.pillarRewards;save.pillarRewards=0}
 save.pillarQi=Math.min(save.pillarQi||0,activeColumnCost());save.rewards=Math.floor(save.rewards||0);save.rewards2=Math.floor(save.rewards2||0);
 if(save.pillars>0&&save.stageLevel<2)save.stageLevel=2;
 save.techniques=save.techniques.filter(t=>t&&t.nodes&&t.type);
 save.blueprints??=[];save.blueprints=save.blueprints.filter(b=>b&&b.type&&b.n);
 if(save.healthBalanceV!==3){save.health+=3*save.stars*(save.stageLevel>=2?1.5:1);save.healthBalanceV=3}
 // v0.4.15 balance migration: convert old strength progression (7 + 0.1★) to 10 + 0.9★.
 if(save.strengthBalanceV!==2){save.str=10+save.stars*.9;save.strengthBalanceV=2;}
 localStorage.setItem(SAVE_SCHEMA,'1');localStorage.setItem('wuxiaBuildVersion',BUILD_VERSION);storeSave();
}catch(e){save=freshSave()}
/* запись сохранения: если память браузера переполнена, прогресс всё равно пишется — без снимка арены (иначе тихий сбой откатывал бы прогресс) */
let storeWarned=false;
function storeSave(){
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));return true}catch(e){}
 const cp=save.arenaCheckpoint;
 try{save.arenaCheckpoint=null;localStorage.setItem(SAVE_KEY,JSON.stringify(save));if(!storeWarned){storeWarned=true;try{toast('Память браузера заполнена: прогресс сохранён, а положение арены — нет.')}catch(_){}}return true}
 catch(e){return false}finally{save.arenaCheckpoint=cp}
}
function persist(){storeSave();try{localStorage.setItem('wuxiaBuildVersion',BUILD_VERSION);localStorage.setItem('wuxiaSaveSchema',SAVE_SCHEMA)}catch(e){}updateUI()}
async function resetProgress(){if(!await confirmDialog('Обнулить весь прогресс? Это удалит культивацию, техники, осколки души и сохранённую арену.','Обнулить'))return;for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&(k===SAVE_KEY||k.startsWith('wuxiaSave_')))localStorage.removeItem(k)}save=freshSave();persist();show('home');toast('Прогресс полностью обнулён.');}
/* ===== multiplayer-ready helpers (no network yet) ===== */
let ENT_SEQ=1,cultOnline=false;
function nid(){return ENT_SEQ++}
const NET={enabled:false,room:null,send(){},onState(){}};
