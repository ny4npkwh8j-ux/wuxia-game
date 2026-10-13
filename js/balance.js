'use strict';
const PILLAR_STEP=500,MAX_PILLARS=5,FIRST_PILLAR_STARS=50,PATH_CAP=40;
function pillarCost(n){return 10000*n}
function activeColumnCost(){return pillarCost(save.pillars+1)}
function pillarChance(extra){return Math.min(90,30+10*Math.floor(Math.max(0,extra)/10000))}
function currentQualityCoef(){return save.pillars>0?save.pillarCoef:pillarQualityFor(save.stars).coef}
const VISION_RADIUS=520,TARGET_MEMORY_TIME=4,MAX_BOSS_INDEX=MAX_PILLARS+1;
const CHARGE_MAX=1.2,CHARGE_MIN_F=.4,CHARGE_MAX_F=1.5;
function chargeFactor(held){held=Math.max(0,Math.min(CHARGE_MAX,held||0));return CHARGE_MIN_F+(CHARGE_MAX_F-CHARGE_MIN_F)*(held/CHARGE_MAX)}
function healRate(t){return 10+.6*Math.min(PATH_CAP,t.nodes.length)}
const PILLAR_Q=[[100,'ИСКЛЮЧИТЕЛЬНАЯ',1000,1.30],[90,'ПРЕВОСХОДНАЯ',900,1.15],[80,'ОТЛИЧНАЯ',800,1.00],[70,'ХОРОШАЯ',700,.70],[60,'ОБЫЧНАЯ',600,.50],[50,'НИЧТОЖНАЯ',500,.30]];
function pillarQualityFor(stars){for(const q of PILLAR_Q)if(stars>=q[0])return{name:q[1],qi:q[2],coef:q[3]};return{name:PILLAR_Q[5][1],qi:PILLAR_Q[5][2],coef:PILLAR_Q[5][3]}}
function stage(){return save.stageLevel>=2?'II':'I'}
function currentStarCost(){return 10+5*save.stars}
/* ===== power formula (same for player, mobs and bosses) ===== */
const DANTIAN_Y=-.075,QI_SHIELD_RATIO=.5;
const TECH_BASE={qiSingle:50,qiArea:60,shield:120,stun:10};
const MIN_STARS={dodge:3,shield:5,qiSingle:5,qiArea:15,stun:20,qiShield:20,heal:3};
const MOB_MIN={dodge:3,shield:5,qiSingle:5,qiArea:15,qiShield:10};
function dashDist(n){n=Math.max(3,Math.min(PATH_CAP,n));return n<=20?110+(243-110)*(n-3)/17:243+(340-243)*(n-20)/20}
function dashCdOf(n){n=Math.max(3,Math.min(PATH_CAP,n));return n<=20?1.6-.8*(n-3)/17:.8-.3*(n-20)/20}
function stunMaxDur(n){return 4+.1*Math.min(PATH_CAP,Math.max(0,n))}
const TECH_COST={qiSingle:20,qiArea:20,shield:20,stun:40};
function techniquePower(n){return Math.pow(1.05,Math.max(0,Math.min(PATH_CAP,n)-10))}
function starFactor(stars){return .5*Math.min(100,Math.max(0,stars))}
function colFactor(cols,M){return cols>0?Math.pow(M||1,cols):1}
function powerMult(pathLen,stars,cols,M){return techniquePower(pathLen)*starFactor(stars)*colFactor(cols,M)}
function myMult(t){return powerMult(t.nodes.length,save.stars,save.pillars,save.pillarCoef)}
function mobMult(stars){return powerMult(Math.min(PATH_CAP,stars),stars,0,1)}
function bossMult(b){return powerMult(PATH_CAP,100,b.columns||0,PILLAR_Q[0][3])}
function techDamage(t){return TECH_BASE[t.type]*myMult(t)}
function techShieldMax(t){return TECH_BASE.shield*myMult(t)}
function techCost(t){if(t.type==='dodge')return Math.ceil(save.maxQi*.05);if(t.type==='qiShield')return 0;return Math.ceil(TECH_COST[t.type]+.3*save.stars)}
function castTime(base){return Math.max(.3,base-.1*(save.meridians||0))}
function starRegen(){return .5*Math.min(100,save.stars)/100}
function spendStarCost(cost){const useQi=Math.min(Math.floor(save.qi),cost);save.qi-=useQi;const rest=cost-useQi;if(rest>0)save.rewards-=rest;return rest}
function canAfford(cost){return Math.floor(save.qi)+Math.floor(save.rewards)>=cost}
