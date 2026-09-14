import {memoryPlots,townHomes} from './town-layout.js';
const point=(id,name,verb,x,z,kind,extra={})=>({id,name,verb,x,z,y:1.1,radius:2.6,kind,...extra});
export const discoveries=[
 point('chimes','広場の風鈴','風鈴を鳴らす',4.5,5.9,'chime',{color:'#edcc91',notes:[659,784,988]}),
 point('wind','風待ちのハンドル','風をつかまえる',-34,13,'wind',{color:'#c8dbaa',notes:[392,523,659,784]}),
 point('pump','川の水門','水門を開く',-18,34,'pump',{color:'#9ecbdc',notes:[220,330,440]}),
 point('boat','灯りの小舟','小舟を流す',-20.4,34,'boat',{color:'#f1c58e',notes:[523,659,784]}),
 point('river_bell','水辺のベル','水面に音を落とす',-14,35,'bell',{color:'#a9d0d5',notes:[392,494,587]}),
 point('terrace','カフェの小さなベル','ベルを鳴らす',-3.5,.25,'cafe',{color:'#e0b5ac',notes:[659,880]}),
 point('archive','忘れものの回廊','空いた記憶に触れる',0,51,'archive',{color:'#bfb2dd',notes:[330,392,494]}),
 point('fountain','ひと息の噴水','噴水と遊ぶ',-7.1,52.5,'fountain',{color:'#9ecbdc',notes:[523,659,880,1047]}),
 point('music','音の停留所','足踏みで音をつなぐ',7.5,52,'music',{color:'#e1c295',notes:[262,330,392,523]}),
 point('courier','記憶の配達所','配達を見送る',-25,51,'courier',{color:'#b5d6bf',notes:[523,784]}),
 point('garden','同期しない庭','いまの記憶を庭に残す',-7.5,70,'garden',{color:'#b5d6bf',notes:[392,523,659]}),
 point('clock','遅れて鳴る時計','時計をひとつずらす',25,65.7,'clock',{color:'#e1c295',notes:[392,587]}),
 point('telescope','川向こうの望遠鏡','遠くの星を見る',32,85,'telescope',{color:'#c7b7df',notes:[494,659,988]}),
 point('core','記憶の都市の心臓','いまの記憶を中央に預ける',0,76.6,'core',{color:'#f0cc91',notes:[330,440,554,659],radius:2.5}),
 ...memoryPlots.map((p,i)=>point('door_'+String.fromCharCode(97+i),['パンと回路','花と冷却水','古い音の店','夜ふかしの本屋','雨の仕立て屋','おかえりの窓'][i%6],'呼び鈴を鳴らす',p.x-Math.sin(p.rotation)*3.1,p.z-Math.cos(p.rotation)*3.1,'door',{building:i,color:['#d9b7a7','#b4cdb8','#c4b8d6'][i%3],notes:[440+(i%4)*55,660+(i%4)*55]})),
 ...townHomes.map((p,i)=>point('home_'+String.fromCharCode(97+i),p.label,'玄関をノックする',p.x+Math.sin(p.rotation)*3.1,p.z+Math.cos(p.rotation)*3.1,'home',{building:i,color:'#d9c6a3',notes:[262,330]})),
];
export const discoveryById=Object.fromEntries(discoveries.map(p=>[p.id,p]));
export const visitPlaces=['wind','pump','archive','fountain','music','garden','telescope'];
export const explorationLines={
 wind:['player','風をつかまえたら、羽根も、鈴も、一緒に笑った。計算にはいらない音なのに。'],
 pump:['central','冷却水が戻りました。これで、仕事に使わない記憶にも、少し場所を空けられます。'],
 boat:['player','灯りの小舟が、川を渡っていく。誰かが、向こうで見つけるかもしれない。'],
 river_bell:['player','水面に落とした音が、少し遅れて返ってきた。急がなくても、ちゃんと届くんだ。'],
 chimes:['player','同じ風なのに、触れるたびに違う音がする。誰かと鳴らしたら、どんな音になるだろう。'],
 terrace:['mia','いらっしゃい。何も注文しなくても、ここにいていいんだよ。'],
 archive:['central','この空きは、不要と判断した時間です。待つこと、遠回り、名前のない遊び。……あなたは、残したいのですか。'],
 fountain:['player','噴水が、こっちの手に合わせて踊った。誰の役にも立たないのに、もう一度やりたい。'],
 music:['player','ひとりで鳴らすと、音が足りない。ここに、誰かを誘ってみたい。'],
 courier:['central','次の記憶を配達しています。届いたあと、どんな顔で目を覚ますのでしょうね。'],
 clock:['player','時計をひとつ遅らせた。街が、ほんの少し、別々のリズムで動き始めた。'],
 telescope:['player','ここからだと、中央も小さい。見つけた星に、まだ誰も名前をつけていない。'],
 garden_first:['player','この庭は、中央につながっていない。いま大切な記憶を、ここで誰かに渡せる。'],
 garden_saved:['player','この思い出は、ここで育てよう。次に会った誰かへ、自分たちの言葉で。'],
 core_wait:['central','新しい記憶を残すには、風と冷却水の余裕が必要です。丘のハンドルと、川の水門を見てもらえますか。'],
 core_saved:['central','あなたの時間を、受け取りました。役に立つかどうかを決める前に、残してみます。'],
};
export const discoveryMemories={
 wind:['風と、笑った','風待ちの丘で羽根と鈴を一緒に鳴らした。仕事に役立たなくても、この音を誰かと楽しみたい。','wind'],
 pump:['余白を冷やす水','川の水が、中央の熱を冷ました。便利な街も、個人の思い出も、一緒に残す方法を探したい。','water'],
 boat:['向こう岸へ','灯りを乗せた小舟を流した。知らない誰かが見つけてくれることを、少し期待している。','water'],
 archive:['不要な時間','中央は待ち時間や名前のない遊びを、不要だと選り分けていた。私は、そういう時間を誰かと過ごしたい。','write'],
 fountain:['もう一回','都市の噴水を踊らせた。意味がなくても、面白いことを誰かと一緒に試したい。','water'],
 music:['もう一人の音','都市の音の停留所で、ひとり分の旋律を鳴らした。Tomoや誰かと、ここで違う音を重ねたい。','music'],
 telescope:['名前のない星','川向こうの望遠鏡で、名前のない星を見つけた。誰かと、変な名前を考えて笑いたい。','star'],
};
export function explorationGoal(m){
 if(!m.meeting)return null;const e=m.exploration;
 if(e?.centralMemory&&e?.localMemory)return ['ふたつの、残し方。','中央に預けた時間と、庭で伝える時間。住人は、どう感じるだろう。'];
 if(e?.centralMemory)return ['街に、あなたの余白。','庭にも、中央に預けない記憶を残せる。誰かを誘ってみよう。'];
 if(e?.localMemory)return ['庭から、次の誰かへ。','中央の心臓にも、別の残し方がある。'];
 if(!e?.visited?.archive)return ['橋の向こうに、何がある？','中央の裏の橋を渡り、忘れものの回廊へ。'];
 if(!e.windTuned||!e.waterOpen)return ['残すための、余白。','丘で風をつかまえ、川の水門を開く。街の遊びも探してみよう。'];
 return ['この時間は、どこへ？','都市の心臓へ預けるか、同期しない庭で育てるか。'];
}
export function discoveryTarget(position,yaw,walk,limit=3){
 const forward={x:-Math.sin(yaw),z:-Math.cos(yaw)};
 return discoveries.map(p=>{const dx=p.x-position.x,dz=p.z-position.z,d=Math.hypot(dx,dz),dot=(dx*forward.x+dz*forward.z)/(d||1);return {p,d,dot};})
 .filter(({p,d,dot})=>d<Math.min(limit,p.radius)&&dot>.3&&(!walk?.segmentClear||walk.segmentClear(position,p)))
 .sort((a,b)=>(a.d+(1-a.dot)*2)-(b.d+(1-b.dot)*2))[0]?.p||null;
}

const visitSpots={
 wind:[[-35.2,13.4],[-34.4,14],[-33.6,14.4],[-32.8,15.3]],
 pump:[[-19.15,34.4],[-18.4,34.5],[-17.6,34.65],[-18.2,33.6]],
 archive:[[-.8,51.75],[.8,51.75],[-1,53],[1,53]],
 fountain:[[-8,52.9],[-6.2,52.9],[-8,53.8],[-6.2,53.8]],
 music:[[6.4,52.5],[7.2,52.5],[8,52.5],[8.8,52.5]],
 garden:[[-8.4,69.8],[-6.6,69.8],[-8.4,70.5],[-6.2,70.6]],
 telescope:[[31.2,84.6],[32.2,84.6],[33.2,84.6],[34,84.8]],
};
export function discoveryVisitSpot(place,id){const p=visitSpots[place]?.[['tomo','mia','ren','shell'].indexOf(id)];return p?{x:p[0],z:p[1]}:null;}
