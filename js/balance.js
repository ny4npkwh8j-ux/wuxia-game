'use strict';
const PILLAR_STEP=500,MAX_PILLARS=5,FIRST_PILLAR_STARS=50,PATH_CAP=40;
function pillarCost(n){return 10000*n}
function activeColumnCost(){return pillarCost(save.pillars+1)}
function pillarChance(extra){return Math.min(90,30+10*Math.floor(Math.max(0,extra)/10000))}
function currentQualityCoef(){return save.pillars>0?save.pillarCoef:pillarQualityFor(save.stars).coef}
const MOB_START=40,MOB_MAX=200;
const VISION_RADIUS=520,TARGET_MEMORY_TIME=4,MAX_BOSS_INDEX=MAX_PILLARS+1;
const CHARGE_MAX=1.2,CHARGE_MIN_F=.4,CHARGE_MAX_F=1.5;
function chargeFactor(held){held=Math.max(0,Math.min(CHARGE_MAX,held||0));return CHARGE_MIN_F+(CHARGE_MAX_F-CHARGE_MIN_F)*(held/CHARGE_MAX)}
function healRate(t){return 10+.6*Math.min(PATH_CAP,t.nodes.length)}
const PILLAR_Q=[[100,'ИСКЛЮЧИТЕЛЬНАЯ',1000,1.30],[90,'ПРЕВОСХОДНАЯ',900,1.15],[80,'ОТЛИЧНАЯ',800,1.00],[70,'ХОРОШАЯ',700,.70],[60,'ОБЫЧНАЯ',600,.50],[50,'НИЧТОЖНАЯ',500,.30]];
/* ядро — третий этап: открывается с 3-й колонны; цена Ци или осколками 2 этапа (вместе тоже); колонны сплавляются в ядро */
const CORE_MIN_PILLARS=3,CORE_QI_COST=100000,CORE_SHARD_COST=1000,CORE_CHANCE_UNIT=500;
/* качество ядра по «силе колонн» = число колонн × коэффициент их качества: [порог, название, множитель ко всем параметрам] */
const CORE_Q=[[6,'ИСКЛЮЧИТЕЛЬНОЕ',10],[5,'ПРЕВОСХОДНОЕ',7],[4,'ОТЛИЧНОЕ',5],[3,'ХОРОШЕЕ',3.5],[2,'ОБЫЧНОЕ',2.5],[0,'НИЧТОЖНОЕ',1.8]];
function coreQualityFor(pillars,coef){const sc=pillars*coef;for(const q of CORE_Q)if(sc>=q[0])return{name:q[1],coef:q[2],score:sc};return{name:CORE_Q[5][1],coef:CORE_Q[5][2],score:sc}}
/* шанс как у колонн (30%, до 90%), +10% за каждую колонну сверх третьей и +10% за каждые 500 вложенных осколков 2 этапа */
function coreChanceFor(pillars,extra){return Math.min(90,30+10*Math.max(0,pillars-CORE_MIN_PILLARS)+10*Math.floor(Math.max(0,extra)/CORE_CHANCE_UNIT))}
function pillarQualityFor(stars){for(const q of PILLAR_Q)if(stars>=q[0])return{name:q[1],qi:q[2],coef:q[3]};return{name:PILLAR_Q[5][1],qi:PILLAR_Q[5][2],coef:PILLAR_Q[5][3]}}
function stage(){return save.stageLevel>=3?'III':save.stageLevel>=2?'II':'I'}
function currentStarCost(){return 10+5*save.stars}
/* мягкий запрет на скученность: вокруг каждой звезды невидимый радиус, звезда внутри него удорожает новую (до +25% при вплотную);
   при пересечении радиусов надбавки складываются */
const STAR_CROWD_R=36,STAR_CROWD_W=.25;
function crowdSurcharge(p){let k=0;for(const q of save.starPts){const d=Math.hypot((q.x-p.x)*210,(q.y-p.y)*520);if(d<STAR_CROWD_R)k+=STAR_CROWD_W*(1-d/STAR_CROWD_R)}return k}
function starCostAt(p){const b=currentStarCost();return Math.ceil(b*(1+crowdSurcharge(p)))}
/* ===== power formula (same for player, mobs and bosses) ===== */
const DANTIAN_Y=-.075,QI_SHIELD_RATIO=.5;
/* TECH_BASE: фиксированная сила техники атакующего (не зависит от здоровья цели), в единицах «здоровье тела с таким же числом звёзд»
   (техника на полную длину, без колонн). Удар равной силы без щита убивает (110%), любой щит равной силы (350% = ~3 удара) возвращает дуэль:
   щит + здоровье = ~4 удара. Колонны и длина техники множат результат. */
const TECH_BASE={qiSingle:1.21,qiArea:.968,shield:3.85,stun:11}; /* +10% к силе техник (было 1.1 / .88 / 3.5 / 10) */
/* перезарядки способностей по площади, секунды (общие для игрока, мобов и боссов) */
const AREA_CD={qiArea:6,stun:12};
const MIN_STARS={dodge:3,shield:5,qiSingle:5,qiArea:15,stun:20,qiShield:20,heal:3,blade:8,pull:8,repel:25,mirage:10,poison:6};
const MOB_MIN={dodge:3,shield:5,qiSingle:5,qiArea:15,qiShield:10};
function dashDist(n){n=Math.max(3,Math.min(PATH_CAP,n));return n<=20?110+(243-110)*(n-3)/17:243+(340-243)*(n-20)/20}
function dashCdOf(n){n=Math.max(3,Math.min(PATH_CAP,n));return n<=20?1.6-.8*(n-3)/17:.8-.3*(n-20)/20}
function stunMaxDur(n){return 4+.1*Math.min(PATH_CAP,Math.max(0,n))}
const TECH_COST={qiSingle:20,qiArea:20,shield:20,stun:40,blade:30,pull:25,repel:40,mirage:30,poison:20};
/* одни и те же формулы тела для игрока, мобов и боссов: здоровье, физическая сила, запас Ци */
function bodyHp(stars){return 100+4*Math.max(0,stars)}
function bodyStr(stars){return 10+.9*Math.max(0,stars)}
function bodyQi(stars,cols,perCol){return 100+10*Math.max(0,stars)+Math.max(0,cols||0)*(perCol||0)}
/* объём Ци относительно «звёздного» (100 + 10 за звезду): растёт от колонн и ядра. Затраты Ци техник растут вместе с ним,
   а урон и щиты — вместе с долей от колонн (долю от ядра уже даёт множитель стадии), чтобы урон на единицу Ци не менялся. */
function qiVolume(maxQi,stars){return Math.max(1,(maxQi||0)/bodyQi(stars,0,0))}
function qiColVolume(maxQi,stars,core){return Math.max(1,qiVolume(maxQi,stars)/(core>0?core:1))}
/* техника на полную длину (столько звёзд, сколько есть, но не больше PATH_CAP) = 1; каждая недостающая звезда -5% */
function techniquePower(n,stars){const ref=Math.min(PATH_CAP,Math.max(3,Math.floor(stars||0)));return Math.pow(1.05,Math.min(PATH_CAP,Math.max(0,n))-ref)}
function colFactor(cols,M){return cols>0?Math.pow(M||1,cols):1}
/* множитель стадии: ядро (если есть) вместо колонн; ядро усиливает всё: здоровье, силу, Ци, силу техник и стойкость */
function stageFactor(cols,M,core){return core>0?core:colFactor(cols,M)}
function powerMult(pathLen,stars,cols,M,core){return techniquePower(pathLen,stars)*bodyHp(stars)*stageFactor(cols,M,core)}
/* уплотнение ядра (0–5): каждая стадия усиливает ядро ещё на 10% от его множителя */
function myCore(){return save.coreCoef>0?save.coreCoef*(1+.1*(save.coreDens||0)):0}
function myStage(){return stageFactor(save.pillars,save.pillarCoef,myCore())}
function myQiVol(){return qiVolume(save.maxQi,save.stars)}
function myQiCol(){return qiColVolume(save.maxQi,save.stars,myCore())}
function myMult(t){return techniquePower(t.nodes.length,save.stars)*bodyHp(save.stars)*myStage()*myQiCol()}
function mobMult(stars){return powerMult(Math.min(PATH_CAP,stars),stars,0,1)}
/* качество колонн босса не ниже лучшего в игре и не ниже качества колонн самого игрока (чтобы боссы не отставали от прокачанного игрока) */
function bossCoef(){return Math.max(PILLAR_Q[0][3],save.pillarCoef||0)}
/* качество колонн противника: босс — по лучшему/по игроку, моб с колоннами — лучшее из таблицы */
function entCoef(e){return e.isBoss?bossCoef():(e.columns>0?PILLAR_Q[0][3]:1)}
function bossMult(b){return powerMult(PATH_CAP,100,b.columns||0,bossCoef())*qiVolume(bodyQi(100,b.columns||0,PILLAR_Q[0][2]),100)}
/* сила любого противника по тем же формулам, что и у игрока */
function entQiVol(e){return qiVolume(e.maxQi,e.stars||0)}
function entMult(e){return powerMult(Math.min(PATH_CAP,e.stars||0),e.stars||0,e.columns||0,entCoef(e),e.core||0)*qiColVolume(e.maxQi,e.stars||0,e.core||0)}
/* сила игрока как цели оглушения (максимальная техника по его звёздам) */
function playerRefMult(){return techniquePower(Math.min(PATH_CAP,save.stars),save.stars)*bodyHp(save.stars)*myStage()*myQiCol()}
/* сила обычного удара кулаком: привязана к звёздам (100 звёзд = 100 урона) */
function playerStr(){return bodyStr(save.stars)*myStage()*(typeof pillPower==='function'?pillPower():1)}
/* удар кулаком противника: колонны усиливают его так же, как удар игрока (ядро уже учтено в e.str) */
function entMelee(e){return (e.str??bodyStr(e.stars||0))*colFactor(e.columns||0,entCoef(e))+entWeaponDmg(e)}
function techDamage(t){return TECH_BASE[t.type]*myMult(t)}
/* Стойкость стадии: колонны усиливают не только атаку (colFactor), но и делят входящий урон на ту же величину.
   Равные по стадии противники дерутся как на этапе I (удар = 30% здоровья), а разница в колоннах даёт двойное преимущество.
   Колонны с коэффициентом <1 стойкости не добавляют. Щит считается без колонн: стойкость уже работает на входе урона. */
function toughness(cols,M,core){return Math.max(1,stageFactor(cols,M,core))}
function myToughness(){return toughness(save.pillars,save.pillarCoef,myCore())}
function entToughness(e){return toughness(e.columns||0,entCoef(e),e.core||0)}
function techShieldMax(t){return TECH_BASE.shield*techniquePower(t.nodes.length,save.stars)*bodyHp(save.stars)*myQiCol()}
function entShieldMax(e){const S=e.stars||0;return TECH_BASE.shield*techniquePower(Math.min(PATH_CAP,S),S)*bodyHp(S)*qiColVolume(e.maxQi,S,e.core||0)}
function techCost(t){if(t.type==='dodge')return Math.ceil(save.maxQi*.05);if(t.type==='qiShield')return 0;return Math.ceil((TECH_COST[t.type]+.3*save.stars)*myQiVol())}
function castTime(base){return Math.max(.3,base-.1*(save.meridians||0))}
function starRegen(){return .5*Math.min(100,save.stars)/100}
function spendStarCost(cost){const useQi=Math.min(Math.floor(save.qi),cost);save.qi-=useQi;const rest=cost-useQi;if(rest>0)save.rewards-=rest;return rest}
function canAfford(cost){return Math.floor(save.qi)+Math.floor(save.rewards)>=cost}
