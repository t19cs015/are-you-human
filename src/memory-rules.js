// The body has a small working context. The human's witnessed history is separate.
export const memorySlots=3;
export const memoryMeeting={x:2.7,z:3.15};
export const memoryNames={player:'あなたの声',tomo:'Tomo',mia:'Mia',ren:'Ren',shell:'Shell',central:'中央'};
export const initialBlocks=[
  {id:'light',title:'中央の灯り',text:'中央が灯りを戻してくれた。みんなで街の仕事を進めれば、明日はもっとよくなる。',color:'#9ecbdc',motif:'tower',source:'中央から届いた記憶'},
  {id:'arrival',title:'知らない街',text:'初めての街に来た。まだ知らないことばかりで、相手の話を聞いてみたい。',color:'#c9b6dd',motif:'star',source:'あなたの経験'},
  {id:'blank',title:'白紙の記憶',text:'',color:'#e1dcc1',motif:'write',source:'あなたの言葉で、これから書くこと'},
];
export const promiseBlock={id:'promise',title:'ここで、また',text:'Tomoと、次の灯りがついたら広場で星を見る約束をした。覚えていなくても、もう一度一緒に座りたい。',color:'#f0cc91',motif:'promise',source:'Tomoと過ごした時間'};
export const memoryGoals={
  arrival:['はじめての、同じ顔。','目の前のTomoに、Eで応えてみよう。'],
  promised:['ここで、また。','約束を受け取った。次の灯りを、一緒に待とう。'],
  syncing:['街が、思い出し直す。','みんなの記憶が入れ替わる。あなたは動ける。'],
  changed:['同じ顔。違う、つづき。','Tomoに、もう一度話しかけてみよう。'],
  remembering:['あなたは、覚えている。','Qで記憶を開き「ここで、また」を一番大切な場所へ。'],
  invited:['言葉が、誰かを動かした。','Tomoを追いかけて、広場の灯りへ。'],
  together:['新しい、同じ約束。','別の記憶でも話してみよう。街は、ここから続く。'],
};
export function selectedMemories(game){return game.equipped.map(id=>game.blocks.find(b=>b.id===id)).filter(Boolean);}
export function validateSlots(ids,blocks){return Array.isArray(ids)&&ids.length<=memorySlots&&new Set(ids).size===ids.length&&ids.every(id=>typeof id==='string'&&blocks.some(b=>b.id===id&&b.text.trim()));}
