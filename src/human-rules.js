export const humanCallRadius=8.5;
export const humanRelayRadius=14;
export function createHumanState(clock=0){return {phase:'idle',cycle:0,nextAt:clock+10,startedAt:0,endsAt:0,awake:{},links:[],seed:null,nextRelay:0,moments:[],lastGreeting:-100,lastArchive:-100};}
export function residentIsSynced(city,id){const h=city?.community?.human;return h?.phase==='sync'&&!Object.hasOwn(h.awake,id);}
