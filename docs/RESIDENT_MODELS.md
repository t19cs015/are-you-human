# オリジナル住民モデル

Miaの曲面の顔と柔らかい外装を共通の基準に、Ren・Tomo・ShellをBlenderで制作しました。

| 住民 | 見分ける特徴 | 会話時の動き |
| --- | --- | --- |
| Mia | ピーチ色、布のマフラー、丸いバッジ | 大きめの手振り |
| Ren | 青灰色、メガネ、紺のベスト、胸ポケット | 控えめな手の動き |
| Tomo | 白と水色、猫耳、しっぽ、道具ポーチ、スニーカー | 大きな身振り、しっぽの揺れ |
| Shell | 緑、二枚の葉、丸い外装、背面の記録パック | ゆっくりした動き |

![Mia、Ren、Tomo、Shell](images/resident-lineup.png)

## 編集と再生成

- 編集用: `art/characters/{mia,ren,tomo,shell}.blend`
- 配信用: `assets/characters/{mia,ren,tomo,shell}.glb`
- 表情の原画: `art/characters/*-face.png`。GLBとBlenderファイルにも同梱。
- Miaの生成: `scripts/build-mia.py`
- 残り3人の生成: `scripts/build-residents.py`

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/build-residents.py
```

後者は承認済みの `mia.blend` を読み、共通構造を引き継いで3人それぞれの独立したファイルを出力します。Miaの元ファイルは上書きしません。生成スクリプトを再実行すると出力先の3人のファイルは上書きするため、手作業で修正したモデルは先に別名保存してください。

すべてこの作品用のオリジナルモデルです。街の建物などのCC0アセットとは別です。

## ゲームへの接続

`src/resident-visual.js` が4人の読み込みと表情・動作を共通管理し、`src/game.js` から会話、作業、警戒、バグなどの状態を渡します。SYSTEM UPDATE中はこのアニメーションも停止します。既存の住民ID、記憶、会話、移動、作業道具を保持します。

表情は7種類。まばたきのタイミングと目の形・色、動作の大きさは住民ごとに異なります。`src/mia-visual.js` は既存の確認画面向けの互換入口です。

`Head`、`Arm.L/R`、`Foot.L/R`、Tomoの `Tail` を回転支点として動かしています。スキニングした骨格やベイク済みのモーションクリップはまだありません。

読み込みに失敗した住民は従来モデルを表示します。GLBは各約0.52〜0.63MB。ゲーム本編と `/character-review.html` で同じモデルを使用します。確認画面はAPIを使いません。

## 確認

- GLBの回転支点・曲面の顔・UV・同梱リソースとHTTP公開範囲を自動検証。
- ブラウザで正面・側面・表情・手振り、390px幅の確認画面を確認。
- デモでオープニング、一人称移動、Lab/Library入退室、制作モニター・資料閲覧を確認。
