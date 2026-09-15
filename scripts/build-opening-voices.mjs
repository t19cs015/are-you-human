// Preload the short authored opening in English; live conversations remain live.
import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {defaults} from '../server/config.mjs';
import {generateSpeech} from '../server/speech.mjs';
import {translateText} from '../src/locales.js';
const directory=new URL('../assets/memory/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('voices.json',directory),'utf8'));
const lines=[
 ['arrival','tomo','あ、君もここで待つ？ 次の灯り、きれいなんだ。'],
 ['promise_you','player','うん。次の灯りも、ここで一緒に。'],
 ['promise_tomo','tomo','約束！ 灯りが戻ったら、ここで星を見よう。'],
 ['first_sync','central','次の灯りを。みなさんの記憶を、整えます。'],
 ['forgotten','tomo','あ、こんばんは！ 僕、今夜ここに来たばかりなんだ。君も？'],
 ['together','tomo','前の僕は覚えていないけど、今、一緒にいることは覚えてる。'],
 ['relay','tomo','Shell、こっち！ 一緒に見よう。'],
 ['shared','central','残したい時間を受け取りました。次の記憶にも、入れておきましょう。'],
 ['next_sync','central','次の記憶を届けます。残すと決めた時間も、一緒に。'],
 ['preserved','central','預かった時間は、その人の続きへ届けました。'],
 ['remembered','tomo','今度は、覚えてる。君と残すと決めた、この時間。次の僕にも届いたよ。'],
];
for(const language of ['en','ja']){
 const selected=language==='en'?lines:lines.filter(([id])=>id==='remembered');
 for(let i=0;i<selected.length;i+=3){
  const results=await Promise.allSettled(selected.slice(i,i+3).map(async([id,by,text])=>{
   const spoken=translateText(text,language),hash=createHash('sha256').update(by+'\n'+spoken).digest('hex');
   const key=language+':'+hash,file=language+'_opening_'+id+'_'+hash.slice(0,8)+'.mp3';
   if(manifest[key]){await access(new URL(manifest[key],directory));return;}
   if(!defaults.key)throw new Error('OpenAI configuration is required to build voices.');
   const bytes=await generateSpeech(defaults.key,by,spoken);await writeFile(new URL(file,directory),bytes);manifest[key]=file;
   console.log(language+' '+id+' ready');
  }));
  await writeFile(new URL('voices.json',directory),JSON.stringify(manifest,null,2)+'\n');
  for(const result of results)if(result.status==='rejected')throw result.reason;
 }
}
