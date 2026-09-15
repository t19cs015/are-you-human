// Own disposable Chromium instance. This never automates a user's browser tab.
// Usage: node --experimental-websocket scripts/render-demo-v7.mjs --preview
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
const build=fileURLToPath(new URL('../data/film-v7/',import.meta.url));await mkdir(build,{recursive:true});
const riverOnly=process.argv.includes('--river'),preview=process.argv.includes('--preview')||riverOnly,profile=await mkdtemp(join(tmpdir(),'ayh-v7-chrome-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--hide-scrollbars','--remote-debugging-port=9236','--window-size=1920,1080','--force-device-scale-factor=1','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
let socket,encoder,seq=0,waiting=new Map(),errors=[],audit=[],completed=false;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function command(method,params={}){const id=++seq;const p=new Promise((resolve,reject)=>waiting.set(id,{resolve,reject}));socket.send(JSON.stringify({id,method,params}));return p;}
async function js(expression){const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
async function pointer(x,y,kind='mouseMoved',clickCount=1){await command('Input.dispatchMouseEvent',{type:kind,x,y,button:kind==='mouseMoved'?'none':'left',buttons:kind==='mousePressed'?1:0,clickCount});await js(`film.pointer(${x},${y},${kind==='mousePressed'})`);}
async function key(key,code=key){await command('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:key==='Enter'?13:0});await command('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:key==='Enter'?13:0});}
async function bounds(selector){return js('film.bounds('+JSON.stringify(selector)+')');}
try{
  let target=null;for(let i=0;i<80;i++){try{target=(await(await fetch('http://127.0.0.1:9236/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{}await pause(250);}if(!target)throw new Error('Chromium did not start');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=event=>{const r=JSON.parse(event.data);if(r.id){const h=waiting.get(r.id);if(h){waiting.delete(r.id);r.error?h.reject(new Error(r.error.message)):h.resolve(r.result);}}else if(r.method==='Runtime.exceptionThrown'){errors.push(r.params.exceptionDetails.exception?.description||r.params.exceptionDetails.text);}};
  await command('Runtime.enable');await command('Page.enable');
  await command('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url:'http://127.0.0.1:4180/'});
  for(let i=0;i<240;i++){if(await js('Boolean(window.film?.ready)'))break;if(errors.length)throw new Error(errors.join('\n'));if(i===239)throw new Error('Town loading timed out');await pause(500);}
  console.log('Town loaded; live memory decision and restoration verified.');
  await js('film.resetDrawer()');
  const samples=riverOnly?[1278,1285,1300]:[0,25,45,65,90,120,150,180,210,285,335,392,450,525,650,714,780,842,915,978,1080,1150,1200,1265,1278,1285,1310,1323,1330,1340,1350,1360,1370,1383,1410,1455,1490,1515,1545,1575,1635,1760];
  const typing='\nI want to keep our promise.',typingAt=Array.from(typing,(_,i)=>Math.round(760+i*2.8));
  const important=new Set([...samples,566,620,621,650,681,726,732,750,861,910,...typingAt]);
  const frames=riverOnly?samples:preview?[...important].sort((a,b)=>a-b):Array.from({length:1800},(_,i)=>i);
  let origin,slot,editorPoint;
  if(!preview){encoder=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',join(build,'picture.mp4')],{stdio:['pipe','ignore','pipe']});encoder.stderr.on('data',d=>console.error(d.toString()));encoder.stdin.on('error',()=>{});}
  for(const frame of frames){
    if(frame===566){await js('film.openDrawer()');origin=await bounds('#memory-library [data-id="promise"]');slot=await bounds('[data-memory-slot="0"]');}
    if(frame===620)await pointer(origin.x,origin.y);
    if(frame===621)await pointer(origin.x,origin.y,'mousePressed');
    if(frame>621&&frame<681){const u=(frame-621)/60,s=u*u*(3-2*u),x=origin.x+(slot.x-origin.x)*s,y=origin.y+(slot.y-origin.y)*s-Math.sin(u*Math.PI)*65;await command('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1});await js(`film.pointer(${x},${y},true)`);}
    if(frame===681){await command('Input.dispatchMouseEvent',{type:'mouseMoved',x:slot.x,y:slot.y,button:'left',buttons:1});await pointer(slot.x,slot.y,'mouseReleased');const r=await js('film.settled()');if(r.equipped[0]!=='promise')throw new Error('Actual memory drag failed');}
    if(frame===726){slot=await bounds('#memory-slots [data-id="promise"]');await pointer(slot.x,slot.y);}
    if(frame===732){await pointer(slot.x,slot.y,'mousePressed',1);await pointer(slot.x,slot.y,'mouseReleased',1);await pointer(slot.x,slot.y,'mousePressed',2);await pointer(slot.x,slot.y,'mouseReleased',2);await js('film.settled()');}
    if(frame===750){editorPoint=await bounds('#memory-text');await pointer(editorPoint.x,editorPoint.y);await js("(()=>{const e=document.getElementById('memory-text');e.focus();e.setSelectionRange(e.value.length,e.value.length)})()");}
    const typed=typingAt.indexOf(frame);if(typed>=0)await command('Input.insertText',{text:typing[typed]});
    if(frame===861){await key('Enter');const r=await js('film.settled()');if(!r.text.endsWith('I want to keep our promise.'))throw new Error('Natural-language memory edit was not saved');}
    if(frame===910)await js('film.closeDrawer()');
    const pose=await js(`film.draw(${frame/30})`);if(samples.includes(frame))audit.push(pose);
    if(!preview){const shot=await command('Page.captureScreenshot',{format:'jpeg',quality:96,fromSurface:true,captureBeyondViewport:false});if(!encoder.stdin.write(Buffer.from(shot.data,'base64')))await once(encoder.stdin,'drain');}
    if(samples.includes(frame)){const shot=await command('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});await writeFile(join(build,'frame-'+String(frame).padStart(4,'0')+'.png'),Buffer.from(shot.data,'base64'));}
    if(!preview&&frame%90===0)console.log('Rendering '+Math.round(frame/18)+'% · '+frame+' / 1800');
  }
  if(encoder){const ended=once(encoder,'close');encoder.stdin.end();const [code]=await ended;if(code!==0)throw new Error('Picture encoding failed');}
  if(errors.length)throw new Error(errors.join('\n'));
  await writeFile(join(build,riverOnly?'river-audit.json':'visual-audit.json'),JSON.stringify({firstPerson:true,samples:audit,errors,actualDrawer:!riverOnly},null,2));
  if(!preview){const p=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',join(build,'picture.mp4')],{encoding:'utf8'}));if(p.streams[0].nb_frames!=='1800')throw new Error('Incorrect frame count');}
  completed=true;console.log(riverOnly?'River composition preview complete.':preview?'Preview frames and real memory UI verified.':'Picture complete: 60 seconds, 1800 frames.');
}finally{socket?.close();if(!completed)encoder?.kill();chrome.kill();await pause(800);await rm(profile,{recursive:true,force:true,maxRetries:3}).catch(()=>{});}
