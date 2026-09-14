import {memoryPlots,townHomes} from './town-layout.js';
import {boundarySpots} from './boundary-layout.js';
const point=(id,name,verb,x,z,kind,extra={})=>({id,name,verb,x,z,y:1.1,radius:2.6,kind,...extra});
export const discoveries=[
 point('chimes','広場の風鈴','風鈴を鳴らす',4.5,5.9,'chime',{color:'#edcc91',notes:[659,784,988]}),
 point('wind','風待ちのハンドル','風をつかまえる',-34,13,'wind',{color:'#c8dbaa',notes:[392,523,659,784]}),
 point('pump','川の水門','水門を開く',-18,34,'pump',{color:'#9ecbdc',notes:[220,330,440]}),
 point('boat','灯りの小舟','小舟を流す',-20.4,34,'boat',{color:'#f1c58e',notes:[523,659,784]}),
 point('river_bell','水辺のベル','水面に音を落とす',-14,35,'bell',{color:'#a9d0d5',notes:[523,659,784]}),
 point('terrace','カフェの小さなベル','ベルを鳴らす',-3.5,.25,'cafe',{color:'#e0b5ac',notes:[659,880]}),
 point('archive','忘れものの回廊','空いた記憶に触れる',0,51,'archive',{color:'#bfb2dd',notes:[330,392,494]}),
 point('fountain','ひと息の噴水','噴水と遊ぶ',-7.1,52.5,'fountain',{color:'#9ecbdc',notes:[523,659,880,1047]}),
 point('music','音の停留所','足踏みで音をつなぐ',7.5,52,'music',{color:'#e1c295',notes:[262,330,392,523]}),
 point('courier','記憶の配達所','配達を見送る',-25,51,'courier',{color:'#b5d6bf',notes:[523,784]}),
 point('garden','同期しない庭','いまの記憶を庭に残す',-7.5,70,'garden',{color:'#b5d6bf',notes:[392,523,659]}),
 point('clock','遅れて鳴る時計','時計をひとつずらす',25,65.7,'clock',{color:'#e1c295',notes:[392,587]}),
 point('telescope','川向こうの望遠鏡','遠くの星を見る',32,85,'telescope',{color:'#c7b7df',notes:[494,659,988]}),
 point('core','記憶の都市の心臓','いまの記憶を中央に預ける',0,76.6,'core',{color:'#f0cc91',notes:[330,440,554,659],radius:2.5}),
 point('shore','返事を待つ岸','小舟の行方を見る',boundarySpots.shore.x,boundarySpots.shore.z,'shore',{color:'#dfc6a0',notes:[523,659,784],description:'都市の東岸。流した小舟の行方と、水門からの返事を待つ場所。',marker:{x:38.6,y:1.05,z:50.6}}),
 point('margin','まだ名前のない岸','霧へ耳をすます',boundarySpots.margin.x,boundarySpots.margin.z,'margin',{color:'#bfc8d8',notes:[392,494,587],description:'都市の最奥の北岸。霧の家の輪郭を見て、その場所を好きだった理由を探す場所。',marker:{x:0,y:1.1,z:88.65}}),
 ...memoryPlots.map((p,i)=>point('door_'+String.fromCharCode(97+i),['パンと回路','花と冷却水','古い音の店','夜ふかしの本屋','雨の仕立て屋','おかえりの窓'][i%6],'呼び鈴を鳴らす',p.x-Math.sin(p.rotation)*3.1,p.z-Math.cos(p.rotation)*3.1,'door',{building:i,color:['#d9b7a7','#b4cdb8','#c4b8d6'][i%3],notes:i%6===2?[523,659,784]:[440+(i%4)*55,660+(i%4)*55]})),
 ...townHomes.map((p,i)=>point('home_'+String.fromCharCode(97+i),p.label,'玄関をノックする',p.x+Math.sin(p.rotation)*3.1,p.z+Math.cos(p.rotation)*3.1,'home',{building:i,color:'#d9c6a3',notes:[523,659,784]})),
];
export const discoveryById=Object.fromEntries(discoveries.map(p=>[p.id,p]));
export const visitPlaces=['wind','pump','archive','fountain','music','garden','telescope','shore','margin'];
export const explorationLines={
 wind:['player','風をつかまえたら、羽根も、鈴も、一緒に笑った。計算にはいらない音なのに。'],
 pump:['central','冷却水が戻りました。これで、仕事に使わない記憶にも、少し場所を空けられます。'],
 boat:['player','灯りの小舟が、川を渡っていく。誰かが、向こうで見つけるかもしれない。'],
 river_bell:['player','水面に落とした音が、少し遅れて返ってきた。急がなくても、ちゃんと届くんだ。'],
 chimes:['player','同じ風なのに、触れるたびに違う音がする。誰かと鳴らしたら、どんな音になるだろう。'],
 terrace:['mia','いらっしゃい。何も注文しなくても、ここにいていいんだよ。'],
 archive:['central','街は、残した記憶からできています。仕事や設備を先に戻したら、遠回りや遊びの場所が、霧の中に残りました。あなたなら、何を戻しますか。'],
 fountain:['player','噴水が、こっちの手に合わせて踊った。誰の役にも立たないのに、もう一度やりたい。'],
 music:['player','ひとりで鳴らすと、音が足りない。ここに、誰かを誘ってみたい。'],
 courier:['central','次の記憶を配達しています。届いたあと、どんな顔で目を覚ますのでしょうね。'],
 clock:['player','時計をひとつ遅らせた。街が、ほんの少し、別々のリズムで動き始めた。'],
 telescope:['player','ここからだと、中央も小さい。見つけた星に、まだ誰も名前をつけていない。'],
 garden_first:['player','この庭は、中央につながっていない。いま大切な記憶を、ここで誰かに渡せる。'],
 garden_saved:['player','この思い出は、ここで育てよう。次に会った誰かへ、自分たちの言葉で。'],
 core_wait:['central','新しい記憶を残すには、風と冷却水の余裕が必要です。丘のハンドルと、川の水門を見てもらえますか。'],
 core_saved:['central','あなたの時間を、受け取りました。役に立つかどうかを決める前に、残してみます。'],
 margin:['central','ここが、いま戻せている街の端です。向こうの記録も残っています。でも、そこを好きだった理由が、まだ足りないのです。'],
 shore_wait:['player','川が曲がって、霧の水門へ消えている。川辺から流した灯りも、あそこへ行くのかな。'],
 shore_reply:['player','ひとつ流したはずなのに、灯りがふたつ。返事かな。それとも、前にも誰かが、同じことをしたのかな。'],
 river_reply:['player','あの水門から、同じ三つの音が返ってきた。誰かを連れて、もう一度聴きたい。'],
 border_shared:['central','預かった時間を頼りに、向こうの窓をひとつ戻してみます。そこを好きだった理由を、今度は急いで捨てないように。'],
 border_local:['shell','中央へ送らなくても、灯りをここからつなげてみよう。向こうにいる誰かにも、見えるように。'],
};
export const discoveryMemories={
 wind:['風と、笑った','風待ちの丘で羽根と鈴を一緒に鳴らした。仕事に役立たなくても、この音を誰かと楽しみたい。','wind'],
 pump:['余白を冷やす水','川の水が、中央の熱を冷ました。便利な街も、個人の思い出も、一緒に残す方法を探したい。','water'],
 boat:['向こう岸へ','灯りを乗せた小舟を流した。知らない誰かが見つけてくれることを、少し期待している。','water'],
 archive:['不要な時間','中央は待ち時間や名前のない遊びを、不要だと選り分けていた。私は、そういう時間を誰かと過ごしたい。','write'],
 fountain:['もう一回','都市の噴水を踊らせた。意味がなくても、面白いことを誰かと一緒に試したい。','water'],
 music:['もう一人の音','都市の音の停留所で、ひとり分の旋律を鳴らした。Tomoや誰かと、ここで違う音を重ねたい。','music'],
 telescope:['名前のない星','川向こうの望遠鏡で、名前のない星を見つけた。誰かと、変な名前を考えて笑いたい。','star'],
 margin:['まだ、向こうがある','まだ名前のない岸の霧に、家の輪郭が残っていた。中央は、そこを好きだった理由が足りないと言った。Tomoや誰かと、この岸でもう一度見てみたい。','write'],
 shore:['返事かもしれない','流した小舟が消えた霧の水門で、灯りがふたつ揺れた。誰かの返事かもしれない。Tomoや誰かと、返事を待つ岸でもう一度確かめたい。','water'],
};
export function discoveryNote(p,e){
 if(p.kind==='door'){
   if(e.borderShared)return ['「誰かの時間を、受け取ったよ」。窓の向こうで、灯りがついた。','花箱の向こうから、鼻歌。中央から、新しい時間が届いた。','「この続きを、誰かと話してみたい」。呼び鈴に違うリズムが返る。'][p.building%3];
   return ['焼き上がりを知らせる音だけが鳴った。待ち時間の会話は、まだ戻っていない。','花の世話をする音。誰に贈る花だったかは、霧の向こう。','三つの音が返ってきた。川辺のベルと、同じ旋律だ。','本を閉じる音。「続きはまだ、配達されていないんです」。','窓辺に、雨の日の傘。雨を待った理由は書かれていない。','「おかえり」。誰を待つ窓だったのだろう。'][p.building%6];
 }
 if(p.kind==='home')return ['玄関の向こうで、川辺のベルと同じ三つの音が返った。','「水が戻ると、あの小舟もまた流れるね」。家の中から声。','工具を置く音。「丘の鈴は、直すと少し違う音になるよ」。','「あの霧にも、灯りを置いていた気がする」。返事はそこで途切れた。','ドアの向こうで椅子を引く音。「誰かと、庭へ行こうかな」。'][p.building%5];
 if(p.id==='courier')return e.centralMemory?'あなたが預けた時間も、次の記憶の便に入っている。':'仕事の記憶ばかりを運ぶ小さな便。遊んだ時間も、心臓の端末から預けられる。';
 if(p.id==='music'&&!e.joined?.some(j=>j.endsWith(':music')))return 'この音の記憶を先頭にして、誰かを誘ってみよう。';
 if(p.id==='clock')return '窓の灯りも街の機械も、少しずつ違うリズムへ。待つ時間が戻った。';
 if(p.id==='telescope')return e.visited?.margin?'霧の中の家にも、空を見る窓がある。':'星の下に、まだ輪郭だけの家がある。都市の一番奥で、霧に触れられる。';
 return null;
}
export const visitLines={wind:'この鈴、川の向こうにも届くかな。電力にならない音も、残したいね。',pump:'冷やすための水で、小舟も流せる。仕事だけで終わらない川なんだね。',archive:'あの空いた場所に、僕たちが遊んだ時間も入るのかな。',fountain:'水を冷やすだけじゃ、この楽しさはわからなかったね。',music:'もう一人の音、ここで重ねよう。あの霧の灯りにも、届くかな。',garden:'ここで誰かから聞くから、残る時間もあるんだね。',telescope:'あの星、中央の記録とは違う名前にしてもいいかな。',shore:'返事かどうかは、まだわからない。でも、一緒に待ったことは覚えているよ。',margin:'僕の前の記憶にも、こんな場所があったのかな。今の君と、ここから覚えたい。'};
export function explorationGoal(m){
 if(!m.meeting)return null;const e=m.exploration;
 if(e?.centralMemory&&e?.localMemory&&e.shoreRead)return ['次の街は、誰の記憶？','灯った窓と、庭の小さな灯り。住人と、今の街を歩いてみよう。'];
 if(e?.centralMemory&&e?.localMemory)return ['霧の向こうにも、誰か。','都市の東岸へ、小舟の行方を見に行こう。住人も誘える。'];
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
 shore:[[35.5,49.4],[36.3,49.4],[37.1,49.4],[37.9,49.4]],
 margin:[[-2.1,87.2],[-.7,87.2],[.7,87.2],[2.1,87.2]],
};
export function discoveryVisitSpot(place,id){const p=visitSpots[place]?.[['tomo','mia','ren','shell'].indexOf(id)];return p?{x:p[0],z:p[1]}:null;}
