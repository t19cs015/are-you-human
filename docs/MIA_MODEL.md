# Mia — オリジナルモデル

Blender 5.2.1 LTS で作成した Mia。街で使用している CC0 建築アセットとは別の、この作品用のオリジナルモデルです。

- 編集元: `art/characters/mia.blend`
- ゲーム用: `assets/characters/mia.glb`
- 再生成: `scripts/build-mia.py`
- 既定の表情: `art/characters/mia-face.png`（ゲームの表情キャンバスから保存。GLBとBlenderファイルにも同梱）

## 今回整えた形

顔は頭の丸みに沿う曲面とし、薄い縁・ガスケット・画面を重ねています。平面の四角い板が頭から浮く構造をなくしました。
マフラーは首に沿う帯、結び目、厚みのある垂れ、縫い目で構成。肩・手首・足首には接続部を作り、手袋、靴底、耳のパーツも揃えています。

## ゲームとの接続

`src/mia-visual.js` が GLB を読み込み、既存の Mia の位置・移動・会話・作業道具を維持したまま表示を交換します。ロードに失敗した場合は既存モデルを表示します。
`FaceScreen` の UV にゲームの表情テクスチャを適用し、7つの表情、まばたき、手振り、歩行、首の傾きを切り替えます。

`Head` / `Arm.L` / `Arm.R` / `Foot.L` / `Foot.R` はオブジェクトの回転支点です。骨のスキニングやベイク済みのアニメーションクリップは未作成です。

## 再生成

プロジェクトのルートで実行:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/build-mia.py
```

スクリプトは編集元の `.blend` と `.glb` を上書きします。Blenderで手作業の変更を加えた場合は、先に別名で保存してください。

確認画面: `http://127.0.0.1:4173/cafe-review.html`（表情と手振りを確認可能）。ゲーム本編にも同じモデルを使用しています。
