export const communityObjects={
  switch:{x:0,z:3.4,name:'灯りの分配器',radius:3.8},
  wind:{x:5.4,z:5.4,name:'風のオルガン',radius:3.4},
  board:{x:-6.2,z:4.6,name:'明日のスケッチ',radius:3.6},
};
export const powerRoutes={
  central:{name:'中央へ',town:0,central:4,color:'#a8dce9'},
  town:{name:'街のみんなへ',town:4,central:0,color:'#f1c184'},
  shared:{name:'半分ずつ',town:2,central:2,color:'#9edbbd'},
};
export const projectKinds={
  garden:{name:'灯りの庭',color:'#9cd0ac'},
  playground:{name:'遊べる広場',color:'#e6b39a'},
  observatory:{name:'星を眺める場所',color:'#b9b7e6'},
};
export const communityIdeas=[
  '中央にも電力を残して、みんなで休める光る庭を作ろう。',
  'Tomoと一緒に、触ると音が鳴る遊び場を作りたい！',
  '星を見ながら、人間とAIが話せる場所にしよう。',
];
export const communityLines={
  arrival_mia:{by:'mia',text:'……あれ？ 人間？ ねえ、みんな見て！'},
  arrival_tomo:{by:'tomo',text:'ほんとだ！ そのレバー、触ってみて！'},
  first_light:{by:'mia',text:'灯りが戻った！ あなたが変えたんだね。'},
  first_central:{by:'central',text:'電力の流れが変わりました。明日は、少し遅くなります。'},
  first_invite:{by:'shell',text:'この灯りで、何を作りましょう。あなたの案を聞かせて。'},
};
