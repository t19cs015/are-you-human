import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';
import {createSociety} from '../server/society.mjs';
import {startCity} from '../server/city.mjs';
import {centralSnapshot,runCentralTool,openCentralVoice,endCentralVoice,voiceTool,chatWithCentral} from '../server/central.mjs';
import {recordConversation} from '../server/infrastructure.mjs';
import {places} from '../src/town-layout.js';
const sdp='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n';
const session=()=>{const s={world:createSociety(),config:{key:'test-server-secret',model:'gpt-5.6-luna',realtimeModel:'gpt-realtime-mini',calls:0,retryAfter:0}};startCity(s.world);return s;};
const answer=()=>new Response(sdp,{status:201,headers:{Location:'https://api.openai.com/v1/realtime/calls/rtc_example'}});

test('central knows only delivered records, not private memories or undelivered conversation',()=>{
  const s=session();recordConversation(s.world,'mia','This parcel has not reached the center.');
  s.world.agents.ren.memories.push({text:'A private memory.'});
  s.world.city.infrastructure.received.push({by:'tomo',text:'A delivered observation.'});
  const snapshot=JSON.stringify(centralSnapshot(s.world));
  assert.ok(snapshot.includes('A delivered observation.'));assert.ok(!snapshot.includes('This parcel'));assert.ok(!snapshot.includes('A private memory'));
  assert.throws(()=>runCentralTool(s,'set_modernization',{enabled:false},{x:0,z:0}),/TOO_FAR/);
  assert.throws(()=>runCentralTool(s,'set_modernization',{enabled:'false'},places.central),/INVALID_ACTION/);
  assert.throws(()=>runCentralTool(s,'wind_stop',{},places.central),/INVALID_ACTION/);
  runCentralTool(s,'set_modernization',{enabled:false},places.central);assert.equal(s.world.city.infrastructure.modelEnabled,false);
});

test('WebRTC negotiation keeps the project key on the server, uses mini, and binds tools to the active call',async()=>{
  const s=session(),requests=[];
  const fetcher=async(url,options)=>{requests.push({url,options});return url.endsWith('/hangup')?new Response(null,{status:200}):answer();};
  await assert.rejects(openCentralVoice(s,{sdp:'bad',position:places.central},fetcher),/INVALID_SDP/);assert.equal(requests.length,0);
  const connected=await openCentralVoice(s,{sdp,position:places.central},fetcher);
  try{
    const config=JSON.parse(requests[0].options.body.get('session'));
    assert.equal(config.model,'gpt-realtime-mini');assert.equal(config.audio.input.turn_detection.interrupt_response,true);
    assert.equal(requests[0].options.headers.Authorization,'Bearer test-server-secret');
    assert.ok(!JSON.stringify(connected).includes('test-server-secret'));
    await assert.rejects(openCentralVoice(s,{sdp,position:places.central},fetcher),/REALTIME_BUSY/);
    const data={connection:connected.connection,callId:'call_1',name:'set_modernization',arguments:{enabled:false},position:places.central};
    assert.throws(()=>voiceTool(session(),data),/REALTIME_CLOSED/);
    const result=voiceTool(s,data);assert.equal(result.result.town.modelEnabled,false);
    const serial=s.world.city.serial;assert.deepEqual(voiceTool(s,data).result,result.result);assert.equal(s.world.city.serial,serial);
    assert.throws(()=>voiceTool(s,{...data,arguments:{enabled:true}}),/INVALID_ACTION/);
    s.realtime.expiresAt=0;assert.throws(()=>voiceTool(s,{...data,callId:'call_2'}),/REALTIME_CLOSED/);
  }finally{await endCentralVoice(s,connected.connection,fetcher);}
  assert.equal(s.realtime,null);assert.ok(requests.at(-1).url.endsWith('/rtc_example/hangup'));
});

test('closing during negotiation hangs up a late answer and cannot delete a newer connection',async()=>{
  const s=session();let resolve;const calls=[];
  const fetcher=(url)=>{calls.push(url);return url.endsWith('/hangup')?Promise.resolve(new Response(null,{status:200})):new Promise(r=>resolve=r);};
  const opening=openCentralVoice(s,{sdp,position:places.central},fetcher);
  const closed=s.realtime;await endCentralVoice(s,null,fetcher);assert.equal(closed.controller.signal.aborted,true);
  const replacement={connection:'replacement'};s.realtime=replacement;
  resolve(answer());await assert.rejects(opening,/REALTIME_CLOSED/);
  assert.equal(s.realtime,replacement);assert.ok(calls.some(url=>url.endsWith('/hangup')));
});

test('central text uses the same validated controls; failed generation does not change the city',async()=>{
  const s=session();let prompt;
  const r=await chatWithCentral(s,{message:'更新を止めて。',position:places.central},async(instructions,input,fallback,options)=>{
    prompt=instructions;assert.equal(options.schema.additionalProperties,false);return {mode:'live',data:{text:'この夜を、もう少し眺めましょう。',action:'pause_model'}};
  });
  assert.equal(r.city.infrastructure.modelEnabled,false);assert.match(r.text,/更新を止めました/);assert.equal(s.world.busy.size,0);assert.ok(prompt.includes('実際にLLMの重みを訓練'));
  await chatWithCentral(s,{message:'再開して。',position:places.central},async()=>({mode:'demo',text:'接続できませんでした。'}));
  assert.equal(s.world.city.infrastructure.modelEnabled,false);
  assert.equal(s.centralHistory.length,4);
});

test('HTTP defaults, model-only changes, session isolation and voice failures never expose a key',async()=>{
  const requests=[];let failVoice=false;
  const server=createServer({apiKey:'test-default-secret',model:'gpt-5.6-luna',fetcher:async(url,options)=>{
    requests.push({url,options});
    if(url.endsWith('/responses'))return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({text:'こんばんは。中央です。',action:'none'})}]}]});
    if(url.endsWith('/hangup'))return new Response(null,{status:200});
    return failVoice?Response.json({error:{message:'test-default-secret'}},{status:429}):answer();
  }});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const req=async(path,data,id)=>{const r=await fetch(base+'/api/'+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(id?{'X-Session':id}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});const body=await r.json();assert.ok(!JSON.stringify(body).includes('test-default-secret'));return {status:r.status,body};};
  try{
    assert.equal((await req('central/voice',{sdp,position:places.central})).status,401);
    const id=(await req('session',{})).body.id,other=(await req('session',{})).body.id;
    let state=(await req('state',undefined,id)).body;assert.equal(state.connected,true);assert.equal(state.model,'gpt-5.6-luna');
    await req('config',{model:'gpt-5.6-luna'},id);assert.equal((await req('state',undefined,id)).body.connected,true);
    await req('city/start',{},id);
    assert.equal((await req('central/voice',{sdp,position:{x:0,z:0}},id)).status,400);
    await req('central/chat',{message:'こんばんは。',position:places.central},id);
    const payload=JSON.parse(requests.find(r=>r.url.endsWith('/responses')).options.body);
    assert.equal(payload.model,'gpt-5.6-luna');assert.deepEqual(payload.reasoning,{effort:'none'});assert.equal(payload.store,false);
    const voice=(await req('central/voice',{sdp,position:places.central},id)).body;
    const tool={connection:voice.connection,callId:'call_http',name:'set_modernization',arguments:{enabled:false},position:places.central};
    assert.equal((await req('central/tool',tool,other)).status,409);
    assert.equal((await req('central/tool',tool,id)).body.city.infrastructure.modelEnabled,false);
    await req('central/stop',{connection:voice.connection},id);failVoice=true;
    const error=await req('central/voice',{sdp,position:places.central},id);assert.equal(error.status,503);assert.equal(error.body.error,'API_LIMIT');
    await req('config',{key:'',model:'gpt-5.6-luna'},id);assert.equal((await req('state',undefined,id)).body.connected,false);
    assert.equal((await req('state',undefined,other)).body.connected,true);
    await req('config',{useDefault:true,model:'gpt-5.6-luna'},id);assert.equal((await req('state',undefined,id)).body.connected,true);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
