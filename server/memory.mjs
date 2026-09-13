export const MEMORY_LIMIT=5000;
export const HISTORY_LIMIT=10000;
export function remember(agent,memory){
 agent.memories??=[];
 if(agent.memories.some(m=>m.id===memory.id))return;
 agent.memories.push({...memory,owner:agent.id,at:Date.now(),importance:memory.topic==='routine'?1:memory.hop>0?2:4});
 if(agent.memories.length>MEMORY_LIMIT){agent.memories.shift();agent.evicted=(agent.evicted||0)+1;}
}
export function archiveSpeech(agent,role,content){
 agent.archive??=[];agent.archive.push({role,content,at:Date.now()});
 if(agent.archive.length>HISTORY_LIMIT){agent.archive.shift();agent.evictedSpeech=(agent.evictedSpeech||0)+1;}
}
function terms(text){
 const clean=String(text).toLowerCase();const result=new Set(clean.match(/[a-z0-9]{2,}/g)||[]);
 for(const run of clean.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+/gu)||[])for(let i=0;i<run.length-1;i++)result.add(run.slice(i,i+2));
 return result;
}
export function recall(agent,query='',{limit=16,budget=6000}={}){
 const q=terms(query),all=[...(agent.memories||[]),...(agent.reflections||[])].filter(m=>!m.supersededBy),n=all.length;
 const ranked=all.map((m,i)=>{
  const words=terms(m.text);let overlap=0;for(const t of q)if(words.has(t))overlap++;
  return {m,score:overlap*6+(m.importance||1)+(i/Math.max(n,1))};
 }).sort((a,b)=>b.score-a.score);
 const selected=[];let used=0;
 for(const {m} of ranked){const entry={id:m.id,topic:m.topic,text:m.text,source:m.source,hop:m.hop,at:m.at};const cost=JSON.stringify(entry).length;
  if(selected.length>=limit)break;if(used+cost>budget)continue;selected.push(entry);used+=cost;
 }
 return selected;
}
export function memoryPage(agent,query='',offset=0){
 const search=String(query).trim().toLowerCase();const all=agent.memories.filter(m=>!search||m.text.toLowerCase().includes(search)||m.source.toLowerCase().includes(search));
 return {total:all.length,offset,items:[...all].reverse().slice(offset,offset+30),stored:agent.memories.length,utterances:agent.archive?.length||0,evicted:agent.evicted||0};
}
