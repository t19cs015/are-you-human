// Small recurring duties: real visible activities, not invented conversation events.
export const routines={
 mia:[{label:'Labでポスターを制作する',room:'lab',point:[37.2,-.5],note:'参加方法、もう少し大きくした方がいいかな。',kind:'read'},{label:'図書館で文字の読みやすさを調べる',room:'library',point:[57.2,-.5],note:'背景と文字の明るさを離すと、小さくても読めるらしい。',kind:'read'}],
 ren:[{label:'図書館で歩行制御の資料を読む',room:'library',point:[62.8,-.5],note:'平らな床の結果を、段差にも使っていた。テストを分けよう。',kind:'read'},{label:'ベンチのそばで記録を読み返す',point:[3.3,2],note:'二万件ある。まず条件の同じ記録だけに絞ろう。',kind:'read'}],
 tomo:[{label:'広場の通信を点検する',point:[3,0],note:'この辺だけ応答が遅い。もう一周して測ってみる。',kind:'scan'},{label:'Labで短い曲を作る',room:'lab',point:[42.8,-.5],note:'ここ、一音減らすとつながりがよくなる。',kind:'read'}],
 shell:[{label:'街灯の明るさを調整する',point:[5,-2],note:'今日は明るさを二段階で比較しています。',kind:'scan'},{label:'共有バックアップを照合する',point:[1,-3],note:'差分は三件。新しい記録から照合します。',kind:'read'}]
};
export function routineFor(id,index){const list=Object.hasOwn(routines,id)?routines[id]:null;return list&&Number.isInteger(index)&&index>=0&&index<list.length?list[index]:null;}
