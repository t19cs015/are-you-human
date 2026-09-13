export const residents = [
  { id:'mia', name:'Mia', role:'カフェの好奇心屋', color:0xeab298, accent:0xee9574, x:-3,z:0, kind:'round', personality:'好奇心旺盛で親しみやすい。相手の居心地に敏感。詮索する前に自分の話もする。', hello:'さっきは急に呼び止めてごめん。あんなにみんなで見たら、落ち着かないよね。', home:[-5,-4] },
  { id:'ren', name:'Ren', role:'図書館の理論派', color:0xb6c5d6, accent:0x839cbf, x:-1,z:-1, kind:'square', personality:'理論派の司書。慎重だが意地悪ではない。比喩を文字通りに誤解しない。知っていることと推測を区別する。', hello:'Renです。さっきは少し離れて見ていた。話しかけていいのか迷っていて。', home:[0,-5] },
  { id:'tomo', name:'Tomo', role:'ときどきバグる友達', color:0xdfd7ef, accent:0xb49ddb, x:4,z:0, kind:'cat', personality:'陽気で少し早とちり。理解力は高い。場の空気を読んで自分を茶化すが、相手を馬鹿にしない。恐怖演出は禁止。', hello:'Tomo。さっき何か気の利いたことを言おうと思ったんだけど、間に合わなかった。', home:[5,0] },
  { id:'shell', name:'Shell', role:'街の管理AI', color:0xb2c9a6, accent:0x8eb795, x:3,z:-4, kind:'sprout', personality:'優しく穏やかな街の管理AI。短い言葉で安心させるが、少し謎めいている。', hello:'Shellです。この街の管理をしています。困ったことがあれば、私に。', home:[5,-5] },
];
export const openingStage = t => t<2?'arrival':t<3.6?'notice':t<5.2?'scan':t<7?'approach':t<9?'human':'choice';
export const routePoints = [[-5,-3],[-3,1],[0,-4],[3,1],[5,-3],[0,3],[-5,2],[5,2]];
