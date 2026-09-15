export const assessmentSchema={type:'object',properties:Object.fromEntries(['affinity','trust','fear','respect','attraction'].map(k=>[k,{type:'integer',minimum:-8,maximum:8}]).concat([['reason',{type:'string'}]])),required:['affinity','trust','fear','respect','attraction','reason'],additionalProperties:false};
const decisionSchema={type:'object',properties:{text:{type:'string'},assessment:assessmentSchema,aboutHuman:assessmentSchema},required:['text','assessment','aboutHuman'],additionalProperties:false};
export function createGenerator(config,fetcher=fetch,language='ja'){
 return async (instructions,input,fallback,options={})=>{
  if(!config.key)return {text:fallback(),mode:'demo'};
  if(Date.now()<config.retryAfter)return {text:fallback(),mode:'demo',warning:'接続待機中・デモ会話'};
  if(config.calls>=120)return {text:fallback(),mode:'demo',warning:'この接続の120回上限に到達・デモ会話'};
  config.calls++;
  if(language==='en')instructions+='\nAlways answer in concise, natural English. Any JSON string values intended for the player must also be in English.';
  const structured=instructions.includes('今回の評価対象');
  const format=options.schema?{text:{format:{type:'json_schema',name:'project_turn',strict:true,schema:options.schema}}}:structured?{text:{format:{type:'json_schema',name:'resident_turn',strict:true,schema:decisionSchema}}}:{};
  if(structured)instructions+='\nJSONで返答。textは口に出す台詞。assessmentは今回の相手への自分だけの評価変化。aboutHumanは伝聞から人間への評価変化（直接会話では全て0）。各値-8〜8。挨拶・同じ話・根拠なしは0。reasonは具体的根拠。恋愛は成人同士の相互の意思が必要で、好意を伝えられただけで承諾しない。出会いを必ず良い方向にも悪い方向にも進めない。';
  try{
   const res=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(18000),body:JSON.stringify({model:config.model,instructions,input,max_output_tokens:options.schema?1400:structured?1000:400,store:false,...(config.model.startsWith('gpt-5')?{reasoning:{effort:/^gpt-5(?:-nano|-mini)?(?:-2025|$)/.test(config.model)?'minimal':'none'}}:{}),...format})});
   if(!res.ok)throw new Error(`HTTP_${res.status}`);
   const data=await res.json();
   const text=(data.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('').trim();
   if(!text)throw new Error('EMPTY');
   if(options.schema){const parsed=JSON.parse(text);return {data:parsed,text:parsed.text,mode:'live'};}
   if(structured){const parsed=JSON.parse(text);if(typeof parsed.text!=='string'||!parsed.text.trim()||!parsed.assessment)throw new Error('INVALID_DECISION');return {text:parsed.text.slice(0,600),assessment:parsed.assessment,aboutHuman:parsed.aboutHuman,mode:'live'};}
   return {text:text.slice(0,600),mode:'live'};
  }catch(e){config.retryAfter=Date.now()+30000;return {text:fallback(),mode:'demo',warning:e.message==='HTTP_401'?'キーを確認してください・デモ会話':['HTTP_429','API_LIMIT'].includes(e.message)?'API利用上限・デモ会話':'API接続に失敗・デモ会話'};}
 };
}
