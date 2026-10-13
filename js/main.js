'use strict';
updateUI();
window.addEventListener('pagehide',()=>{if(arenaState)saveArenaCheckpoint()});
