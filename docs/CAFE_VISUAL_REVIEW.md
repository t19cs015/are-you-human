# Cafe Visual Benchmark — review

## Scope

Cafe周辺の1区画だけを更新。探索は一人称のまま。Lab/Libraryや他の建物へのアセット展開は行っていない。AI、会話、噂、記憶、制作案件のサーバーロジックは変更していない。

比較: http://127.0.0.1:4173/cafe-review.html （After） / http://127.0.0.1:4173/cafe-review.html?before=1 （Before）。同じカメラ位置・高さ1.68m・FOV53度。比較ページではAI APIを呼ばず、住民やプレイヤーの保存データも変更しない。

## Assets and licenses

すべて無料公開版。公式LICENSE.txtを取得し、CC0および個人・教育・商用プロジェクト利用可の記載を確認。原本を docs/licenses に保存。ダウンロード元コミット・ファイル名・SHA-256を assets/cafe/manifest.json に記録。

| Pack | 今回の用途 | License / official source |
|---|---|---|
| Tiny Treats Homely House 1.0 | 家をカフェに改装、柵、荷物 | CC0-1.0 / https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Homely-House-1.0/blob/main/LICENSE.txt |
| Tiny Treats Pretty Park 1.0 | 石畳、街灯、ベンチ、木、低木、生垣、花、草 | CC0-1.0 / https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Pretty-Park-1.0/blob/main/LICENSE.txt |
| KayKit Furniture Bits 1.0 | テーブル、椅子、本、鉢植え | CC0-1.0 / https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0/blob/main/LICENSE.txt |
| KayKit City Builder Bits 1.0 | カフェ脇の箱 | CC0-1.0 / https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/blob/main/LICENSE.txt |

GLTFからGLBへ、形状を作り直さず画像・バッファを埋め込み。取得21モデルのうち、この区画では18モデルを読み込む。Blenderで新規制作は行っていない。庇・看板は既存の家への簡単な追加。Miaは既存ゲーム内モデルの改良であり、第三者のロボットアセットではない。

## Before / After

| Before | After |
|---|---|
| 箱型の建物と大きな単純な屋根 | 既製の家の窓枠・屋根・煙突・入口を使ったカフェ |
| 看板と1テーブル | 布の庇、看板、メニューボード、2席のテラス、本・鉢植え・カップ |
| 大きな均一タイル | 小さな石畳、草花、生垣、家具を組み合わせた密度 |
| 単純な球形の木 | 既製の樹木と植栽。ごく小さい揺れ |
| 固定の目と口 | Miaの7表情、瞬き、手振り、会話・歩行の動き |
| 静的なカフェ周辺 | 湯気、植栽の揺れ、街灯の微小な光量変化 |

## Files

- src/cafe-assets.js: GLB読み込み、複製、テクスチャ共有、カフェ配置、ローカル照明、環境の動き。
- src/mia-visual.js: 既存Miaの材質・表情・関節の動き。
- src/world.js: 旧カフェをまとまりとして扱い、差し替え対象を明示。
- src/game.js: 見た目の更新のみ接続。移動・AI社会の進行を維持。
- index.html / server.mjs: Three.js import map、限定したGLB・ローダー・比較ページの配信。
- cafe-review.html / src/cafe-review.js: 同一視点での比較と描画計測。
- scripts/import-cafe-assets.py / assets/cafe / docs/licenses: アセットと出典・ライセンス。
- tests/assets.test.mjs: GLB整合性・埋め込み参照・ハッシュ・ライセンス宣言の確認。

## Performance

21 GLB合計850,564 bytes（約0.85MB）。実際の読み込みは18モデル。各ファイル内に埋め込んだ同じ画像を、GPU上では3種類のアトラスに共有。石畳の反復はInstancedMesh。既存のシャドウマップを利用し、新しいローカル点光源は影を生成しない。

同じブラウザー・1280×720の表示領域・pixel ratio 1.7・カメラで、初期読み込み後の300フレームを計測。比較ページを同じタブで切り替えた測定。

| 指標 | Before | After |
|---|---:|---:|
| 平均フレーム時間 | 16.67 ms | 16.67 ms |
| p95フレーム時間 | 18.3 ms | 18.3 ms |
| Draw calls | 140 | 229 |
| Triangles | 22,278 | 77,531 |
| Geometries | 332 | 360 |
| Textures | 4 | 10 |

この環境では双方約60 FPS。描画呼び出しは約64%増、三角形数は約3.5倍なので、街全体へ単純に複製すると負荷は増す。全端末のFPS保証ではなく、初回読み込み時間・GPUメモリ総量・AI稼働中の通常ゲームの負荷はこの数値に含まない。

## Remaining gap

参考画像のような手描きの豊かな色・建物の多様性・統一された背景密度にはまだ差がある。今回はカフェだけなので隣のLibraryや外周建物との品質差が見える。Miaのシルエットは既存の単純形状を利用しており、専用の完成版キャラクターほど精緻ではない。骨格付き歩行クリップやリップシンクではなく、関節の簡単なアニメーション。素材もアトラス主体で、窓ガラスの表現・布の厚み・舗道と地面の境界には改善余地がある。

Steam掲載水準を達成したと断定せず、この1区画の方向性をレビューするための版として扱う。

## Estimate for expansion (not started)

Library/Lab/住宅の外観と地面の統一 6〜10時間、室内への家具展開 4〜7時間、残り3人の表情・動き 4〜6時間、照明・衝突・端末別負荷の調整 3〜5時間。合計17〜28時間を目安にし、カフェのレビュー後に見直す。街全体への展開はここで停止。

## Verification

- `npm test`: 19件すべて成功。既存の会話・記憶・制作案件テストに加え、アセット整合性と静的配信の許可範囲を確認。
- 通常ゲームの別セッションをDEMOにして、導入会話 → 人間の選択 → 一人称移動を確認。カフェ前のベンチを避けてカフェ脇まで通行でき、ブラウザーのerrorログは0件。
- 同一視点のBefore/Afterスクリーンショットを撮影。比較ページのUI非表示とEscによる復帰も確認。
- 実APIの応答品質は今回の見た目変更では再評価していない。キー設定ファイルは変更せず、Gitコミットも作成していない。
