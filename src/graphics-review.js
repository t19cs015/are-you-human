const views={plaza:{label:'広場',position:[0,1.68,6.6],look:[0,1.6,-3]},cafe:{label:'カフェ',position:[-1.5,1.68,2.6],look:[-5.4,2,-4]},homes:{label:'住宅の入口',position:[6.7,1.68,.6],look:[10,1.9,-1]},road:{label:'中央への道',position:[0,1.68,14],look:[0,2.7,28.9]},central:{label:'中央',position:[0,1.68,24.5],look:[0,2.8,28.9]},memory:{label:'記憶の都市',position:[0,1.68,48.3],look:[0,3.3,72]},river:{label:'川辺',position:[-18,1.68,32.7],look:[-27,0,41.5]}};
export function createGraphicsReview({visit,graphics,renderer}){
  const panel=document.createElement('aside');panel.id='graphics-review';panel.setAttribute('aria-label','描画の確認');
  panel.style.cssText='position:fixed;left:20px;bottom:20px;padding:14px;background:#1b334beb;color:#efe2c5;z-index:100;border-radius:14px;font:14px monospace';
  panel.innerHTML='<label>確認する場所 <select aria-label="確認する場所"></select></label><label style="display:block;margin:10px 0"><input type="checkbox" checked>光の仕上げ</label><pre style="margin:0"></pre>';
  const select=panel.querySelector('select');for(const [id,v] of Object.entries(views)){const option=document.createElement('option');option.value=id;option.textContent=v.label;select.append(option);}
  document.body.append(panel);let samples=[],last=0,started=performance.now();
  select.onchange=()=>{visit(views[select.value]);samples=[];started=performance.now();};panel.querySelector('input').onchange=e=>{graphics.setEnabled(e.target.checked);samples=[];started=performance.now();};
  return {frame(now,playing,frameMs){panel.hidden=!playing;if(!playing||now-started<2500)return;if(frameMs>0&&frameMs<250)samples.push(frameMs);samples=samples.slice(-180);
    if(now-last<1200||samples.length<30)return;last=now;const sorted=[...samples].sort((a,b)=>a-b),mean=samples.reduce((a,b)=>a+b,0)/samples.length;
    panel.querySelector('pre').textContent=JSON.stringify({view:select.value,finish:graphics.enabled,meanFrameMs:+mean.toFixed(1),p95FrameMs:+sorted[Math.floor(sorted.length*.95)].toFixed(1),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:+renderer.getPixelRatio().toFixed(2)},null,2);
  }};
}
