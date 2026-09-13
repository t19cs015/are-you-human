export function createCentralVoice({api,position,changed,onVoice}){
  const $=id=>document.getElementById(id),output=$('central-audio'),lines=new Map();
  let current=null,available=false,configured=false,pendingText=false,closing=Promise.resolve();
  const errors={KEY_REQUIRED:'接続設定からAPIキーを設定してください。',API_KEY_INVALID:'APIキーを確認してください。',API_LIMIT:'APIの利用上限に達しました。',REALTIME_UNAVAILABLE:'音声に接続できませんでした。文字でも話せます。',REALTIME_BUSY:'前の会話を閉じています。少し待ってから、もう一度。',REALTIME_CLOSED:'音声の接続が終了しました。もう一度つなげます。',TOO_FAR:'中央のそばで話しかけてください。',NotAllowedError:'マイクが許可されていません。「声を聴く」なら文字で話せます。',NotFoundError:'マイクが見つかりません。「声を聴く」なら文字で話せます。',NotReadableError:'マイクを使えません。「声を聴く」か、文字の会話を使ってください。'};
  const explain=e=>errors[e.message]||errors[e.name]||'接続が途切れました。もう一度つなぐか、文字で話せます。';
  function status(text,kind='idle'){$('central-status').textContent=text;$('central-conversation').dataset.state=kind;}
  function controls(){
    $('central-start').disabled=!available||!configured||!!current||pendingText;
    $('central-listen').disabled=$('central-start').disabled;
    $('central-stop').hidden=!current;
    $('central-start').hidden=!!current;$('central-listen').hidden=!!current;
    $('central-message').disabled=!available||pendingText||!!current&&!current.ready;
    $('central-send').disabled=$('central-message').disabled;
  }
  function line(id,who,text,append=false){
    let p=lines.get(id);
    if(!p){const row=document.createElement('article'),label=document.createElement('small');p=document.createElement('p');label.textContent=who;row.append(label,p);row.dataset.line=id;$('central-transcript').append(row);lines.set(id,p);
      while($('central-transcript').children.length>18){const first=$('central-transcript').firstElementChild;lines.delete(first.dataset.line);first.remove();}}
    p.textContent=(append?p.textContent+text:text).slice(0,1800);$('central-transcript').scrollTop=$('central-transcript').scrollHeight;
  }
  function send(c,event){if(current===c&&c.channel?.readyState==='open')c.channel.send(JSON.stringify(event));}
  function listening(c){status(c.microphone?'声を聞いています。話しかけてください。':'つながりました。文字を送ると、声で返事をします。','listening');}
  function stop(message='会話を終えました。マイクはオフです。'){
    const c=current;if(!c)return closing;current=null;
    clearTimeout(c.timeout);clearTimeout(c.expiry);clearTimeout(c.disconnected);c.controller.abort();
    c.stream?.getTracks().forEach(t=>t.stop());c.channel?.close();c.peer?.close();output.pause();output.srcObject=null;
    $('central-play').hidden=true;$('central-duration').textContent='';onVoice(false);status(message);controls();
    closing=closing.catch(()=>{}).then(()=>api('central/stop',{connection:c.connection})).catch(()=>{});
    return closing;
  }
  async function toolsDone(c,response){
    const calls=(response.output||[]).filter(o=>o.type==='function_call');if(!calls.length)return;
    status('街の様子を確かめています…','thinking');
    for(const call of calls){
      if(current!==c)return;
      let result;
      try{
        const data=await api('central/tool',{connection:c.connection,callId:call.call_id,name:call.name,arguments:JSON.parse(call.arguments),position:position()},{signal:c.controller.signal});
        if(current!==c)return;changed(data.city);result=data.result;
      }catch(error){if(current!==c)return;result={ok:false,error:explain(error)};}
      send(c,{type:'conversation.item.create',item:{type:'function_call_output',call_id:call.call_id,output:JSON.stringify(result)}});
    }
    if(current===c)send(c,{type:'response.create'});
  }
  async function event(c,event){
    if(current!==c)return;
    if(event.type==='session.created'){
      c.ready=true;clearTimeout(c.timeout);controls();listening(c);onVoice(true);
      send(c,{type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:'中央のそばへ来ました。短く挨拶して。'}]}});
      send(c,{type:'response.create'});
    }
    if(event.type==='input_audio_buffer.speech_started'){
      status('あなたの声を聞いています…','listening');line(event.item_id,'あなた','…');
    }
    if(event.type==='input_audio_buffer.speech_stopped')status('中央が考えています…','thinking');
    if(event.type==='conversation.item.input_audio_transcription.completed')line(event.item_id,'あなた',event.transcript);
    if(event.type==='conversation.item.input_audio_transcription.failed')line(event.item_id,'あなた','（字幕を取得できませんでした）');
    if(event.type==='response.created'){c.responding=true;status('中央が考えています…','thinking');}
    if(['response.output_audio_transcript.delta','response.output_text.delta'].includes(event.type))line(event.item_id,'中央',event.delta,true);
    if(['response.output_audio_transcript.done','response.output_text.done'].includes(event.type))line(event.item_id,'中央',event.transcript??event.text??'');
    if(event.type==='output_audio_buffer.started')status('中央が話しています。途中で話しかけても大丈夫です。','speaking');
    if(event.type==='output_audio_buffer.stopped'||event.type==='output_audio_buffer.cleared')listening(c);
    if(event.type==='response.done'){
      c.responding=false;
      if(event.response.status==='failed'){stop('返事を受け取れませんでした。文字でも話せます。');return;}
      if(event.response.status==='completed')await toolsDone(c,event.response);
    }
    if(event.type==='error'&&!['response_cancel_not_active','output_audio_buffer_empty'].includes(event.error?.code))stop('音声の返答を続けられませんでした。文字でも話せます。');
  }
  async function start(microphone){
    if(current||!available||!configured||pendingText)return;
    if(!window.RTCPeerConnection){status('このブラウザは音声に対応していません。文字で話せます。');return;}
    const c={microphone,controller:new AbortController(),ready:false,responding:false};current=c;controls();status(microphone?'マイクを準備しています…':'中央へつないでいます…','connecting');
    c.timeout=setTimeout(()=>{if(current===c)stop('接続が時間切れになりました。もう一度つなげます。');},35000);
    try{
      await closing;if(current!==c)return;
      if(microphone){
        if(!navigator.mediaDevices?.getUserMedia)throw Object.assign(new Error(),{name:'NotFoundError'});
        const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
        if(current!==c){stream.getTracks().forEach(t=>t.stop());return;}c.stream=stream;
      }
      const peer=new RTCPeerConnection();c.peer=peer;
      peer.ontrack=e=>{if(current!==c)return;output.srcObject=e.streams[0]||new MediaStream([e.track]);output.play().catch(()=>{$('central-play').hidden=false;});};
      if(c.stream)for(const track of c.stream.getAudioTracks()){
        peer.addTrack(track,c.stream);track.onended=()=>{if(current===c)stop('マイクがオフになったので、会話を終えました。');};
      }else peer.addTransceiver('audio',{direction:'recvonly'});
      c.channel=peer.createDataChannel('oai-events');
      c.channel.onmessage=({data})=>{let message;try{message=JSON.parse(data);}catch{return;}event(c,message).catch(()=>{if(current===c)stop('返事を受け取れませんでした。もう一度つなげます。');});};
      c.channel.onclose=()=>{if(current===c)stop('中央との接続が終了しました。');};
      peer.onconnectionstatechange=()=>{
        if(current!==c)return;clearTimeout(c.disconnected);
        if(['failed','closed'].includes(peer.connectionState))stop('音声の接続が途切れました。');
        if(peer.connectionState==='disconnected')c.disconnected=setTimeout(()=>{if(current===c)stop('音声の接続が途切れました。');},4000);
      };
      await peer.setLocalDescription(await peer.createOffer());
      const result=await api('central/voice',{sdp:peer.localDescription.sdp,position:position()},{signal:c.controller.signal});
      if(current!==c)return;c.connection=result.connection;
      await peer.setRemoteDescription({type:'answer',sdp:result.sdp});
      if(current!==c)return;
      c.expiry=setTimeout(()=>{if(current===c)stop('5分たったので会話を終えました。また話しかけられます。');},Math.max(0,result.expiresAt-Date.now()));
      $('central-duration').textContent=(microphone?'マイク ON':'マイク OFF')+' · 5分で自動終了';
    }catch(error){if(current===c)stop(explain(error));}
  }
  $('central-start').onclick=()=>start(true);$('central-listen').onclick=()=>start(false);$('central-stop').onclick=()=>stop();
  $('central-play').onclick=()=>output.play().then(()=>{$('central-play').hidden=true;}).catch(()=>status('音声を再生できません。字幕で返事を読めます。'));
  $('central-form').onsubmit=async e=>{
    e.preventDefault();const message=$('central-message').value.trim();if(!message||!available||pendingText)return;
    const c=current;if(c&&!c.ready)return;
    line(crypto.randomUUID(),'あなた',message);$('central-message').value='';
    if(c){
      if(c.responding)send(c,{type:'response.cancel'});send(c,{type:'output_audio_buffer.clear'});
      send(c,{type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:message}]}});send(c,{type:'response.create'});return;
    }
    pendingText=true;controls();status('中央が考えています…','thinking');
    try{
      await closing;const r=await api('central/chat',{message,position:position()});changed(r.city);line(crypto.randomUUID(),'中央',r.text);
      status(r.mode==='live'?'中央と文字で話しています。':r.warning||'デモ会話 · API未接続');
    }catch(error){status(explain(error));}finally{pendingText=false;controls();}
  };
  addEventListener('pagehide',()=>stop());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('画面を離れたので、マイクをオフにしました。');});
  return {stop,setMuted(value){output.muted=value;},setAvailable(value,connected){
    if(!value&&current)stop();available=value;configured=connected;controls();
  },reset(){stop();lines.clear();$('central-transcript').replaceChildren();status('中央に、聞いてみたいことはありますか。');}};
}
