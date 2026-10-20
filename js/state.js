'use strict';
const BUILD_VERSION='0.8.22';
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
 save.pillarProgress??=0;save.pillarQi??=0;save.pillarRewards??=0;save.techniques??=[];save.arenaCheckpoint??=null;save.stageLevel??=1;save.rewards??=0;save.scrolls??=[];
 save.hints??=[];save.lostLoot??=[];save.coreDens??=0;save.coreCoef??=0;save.coreQuality??=null;save.coreDeposit??=0;save.coreChanceExtra??=0;
 save.rewards2??=0;save.pillarChanceExtra??=0;save.pillarQuality??=null;save.pillarCoef??=0;save.pillarQiBonus??=0;save.pillarStars??=0;
 if(save.pillarMult&&!save.pillarCoef){save.pillarCoef=save.pillarMult;delete save.pillarMult}
 if(save.pillars>0&&!save.pillarCoef){const q=pillarQualityFor(save.stars);save.pillarCoef=q.coef;save.pillarQiBonus=q.qi;save.pillarQuality=q.name;save.pillarStars=save.stars}
 if(save.pillars>0&&!save.pillarQiBonus){save.pillarQiBonus=pillarQualityFor(save.pillarStars||save.stars).qi}/* старые сохранения: бонус Ци колонны не был записан */
 if(save.pillarRewards>0){save.rewards+=save.pillarRewards;save.pillarRewards=0}
 save.pillarQi=Math.min(save.pillarQi||0,activeColumnCost());save.rewards=Math.floor(save.rewards||0);save.rewards2=Math.floor(save.rewards2||0);
 if(save.pillars>0&&save.stageLevel<2)save.stageLevel=2;
 save.techniques=save.techniques.filter(t=>t&&t.nodes&&t.type);
 save.blueprints??=[];save.blueprints=save.blueprints.filter(b=>b&&b.type&&b.n);
 if(save.healthBalanceV!==3){save.health+=3*save.stars*(save.stageLevel>=2?1.5:1);save.healthBalanceV=3}
 // v0.4.15 balance migration: convert old strength progression (7 + 0.1★) to 10 + 0.9★.
 if(save.strengthBalanceV!==2){save.str=10+save.stars*.9;save.strengthBalanceV=2;}
 localStorage.setItem(SAVE_SCHEMA,'1');localStorage.setItem('wuxiaBuildVersion',BUILD_VERSION);localStorage.setItem(SAVE_KEY,JSON.stringify(save));
}catch(e){save=freshSave()}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));localStorage.setItem('wuxiaBuildVersion',BUILD_VERSION);localStorage.setItem('wuxiaSaveSchema',SAVE_SCHEMA)}catch(e){}updateUI()}
async function resetProgress(){if(!await confirmDialog('Обнулить весь прогресс? Это удалит культивацию, техники, осколки души и сохранённую арену.','Обнулить'))return;for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&(k===SAVE_KEY||k.startsWith('wuxiaSave_')))localStorage.removeItem(k)}save=freshSave();persist();show('home');toast('Прогресс полностью обнулён.');}
/* ===== multiplayer-ready helpers (no network yet) ===== */
let ENT_SEQ=1;
function nid(){return ENT_SEQ++}
const NET={enabled:false,room:null,send(){},onState(){}};
