import test from 'node:test';
import assert from 'node:assert/strict';
import {translateText} from '../src/locales.js';
import {createGenerator} from '../server/provider.mjs';
import {createServer} from '../server.mjs';

test('authored game copy switches between complete English and unchanged Japanese',()=>{
  assert.equal(translateText('この身体で、目を覚ます ↗','en'),'Wake up in this body ↗');
  assert.equal(translateText('はじめての、同じ顔。','en'),"The first face that's the same.");
  assert.equal(translateText('中央の灯りの記憶を開く','en'),'Open memory: The Central Light');
  assert.equal(translateText('2番目の場所に記憶を置く','en'),'Place a memory in slot 2');
  assert.equal(translateText('中央の灯り','ja'),'中央の灯り');
});

test('English sessions instruct live residents to answer in English',async()=>{
  let request;
  const fetcher=async(_url,options)=>{request=JSON.parse(options.body);return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:'Hello.'}]}]}),{status:200,headers:{'Content-Type':'application/json'}});};
  const generate=createGenerator({key:'test-key',model:'gpt-5.6-luna',calls:0,retryAfter:0},fetcher,'en');
  const result=await generate('Resident persona',[] ,()=> 'fallback');
  assert.equal(result.text,'Hello.');
  assert.match(request.instructions,/Always answer in concise, natural English/);
});

test('the browser language header reaches the session generator',async()=>{
  let request;
  const fetcher=async(_url,options)=>{request=JSON.parse(options.body);return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:'Good evening.'}]}]}),{status:200,headers:{'Content-Type':'application/json'}});};
  const server=createServer({apiKey:'test-key',fetcher});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port,headers={'Content-Type':'application/json','X-Language':'en'};
  try{
    const session=await (await fetch(base+'/api/session',{method:'POST',headers,body:'{}'})).json();
    const response=await fetch(base+'/api/greet',{method:'POST',headers:{...headers,'X-Session':session.id},body:JSON.stringify({id:'mia'})});
    assert.equal(response.status,200);
    assert.match(request.instructions,/Always answer in concise, natural English/);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
