import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {defaults} from '../server/config.mjs';
import {explorationLines} from '../src/discovery-rules.js';
import {generateSpeech} from '../server/speech.mjs';
const directory=new URL('../assets/memory/',import.meta.url);await mkdir(directory,{recursive:true});
const lines=[
 ...Object.entries(explorationLines).map(([name,[by,text]])=>['explore_'+name,by,text]),
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
 ['synced','central','街の記憶を届けました。'],
];
let manifest={};try{manifest=JSON.parse(await readFile(new URL('voices.json',directory),'utf8'));}catch{}
if(!defaults.key)throw new Error('The server default API key is not configured.');
for(let i=0;i<lines.length;i+=2){
 const results=await Promise.allSettled(lines.slice(i,i+2).map(async([name,by,text])=>{const hash=createHash('sha256').update(by+'\n'+text).digest('hex'),file=name+'.mp3';if(manifest[hash]){try{await readFile(new URL(file,directory));return;}catch{}}const bytes=await generateSpeech(defaults.key,by,text);await writeFile(new URL(file,directory),bytes);manifest[hash]=file;console.log(file+' · '+bytes.length+' bytes');}));
 await writeFile(new URL('voices.json',directory),JSON.stringify(manifest,null,2)+'\n');
 for(const result of results)if(result.status==='rejected')console.error('Voice generation unavailable:',result.reason.message);
}
