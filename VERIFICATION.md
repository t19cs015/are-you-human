# 動作確認 — 一人称・夜の街版（2026-09-13）

## 自動テスト

`npm test` の5件成功（外部APIは模擬応答）。

- 10秒以内の人間確認、主役4人。
- 住民の個別記憶の分離、Mia→Ren→Tomoの伝播、情報源、重複防止。
- SYSTEM UPDATEで記憶保持、更新後の返答の変化、会話処理の競合制御。
- Responses APIのリクエスト形式とテキスト抽出、失敗時のフォールバック。
- タブ別セッション分離、キーがレスポンスに含まれないこと、内部ファイル非公開、入力検証、自律会話の間隔制限。

## ブラウザで確認

- 俯瞰から一人称への導入、Miaの最初の問い。
- デモで「人間は毎日8時間眠るんだよ。」を自由入力し、Miaの返答を確認。
- WASDの移動入力、住民同士の立ち話（Ren/Tomo）、住民の巡回。
- 「住民のこと」からSYSTEM UPDATEを実行し、更新画面と街への復帰を確認。
- 初回フレームの負の時間差による巡回エラーを修正。Eで会話を開いた際の文字混入も修正。

## 限界

実APIキー未設定につき、本物のLLMの返答品質・遅延・利用料金は未測定。UI設定と通信処理は実装済み。
噂の最後までの経路は自動テストで確認。初見ユーザーの5分試遊、全ブラウザ・低性能端末の検証は別途必要。
生活行動はルールベース、各住民の会話はキー設定時に個別のLLM文脈で生成。記憶は一時保存のみ。

## 追加修正：移動と接続保持

- 日本語IMEの `Process` / かな入力やShift中でも、物理キーコードからWASDを判定するテスト成功。
- 左下の移動ボタンを追加。ブラウザで後退ボタンを5回押し、視点が後退して住民との会話距離から離れることを確認。
- 移動ボタンは会話を閉じて操作フォーカスをゲームへ戻す。
- APIキーではなくタブのセッションIDだけを保持するよう修正。別タブのキー未設定セッションでモデル設定を変更し、再読み込み後も同じ設定が復元されることを確認。
- ユーザーの画面に「DEMO・キー未設定」が表示されていたため、単調さの評価前に実API生成へ接続する必要がある。実キーへのアクセス・実API送信・サーバー再起動はこの追加修正では実施していない。

### 社会変化版
- 9 automated tests passed: private rumor provenance, asymmetric relationships, bounded assessments, repeat protection, local rest/wake witnesses, GPT-5.5 structured response parsing, HTTP session isolation and existing controls/update regressions.
- Live API tested with a mocked Responses endpoint only; real GPT-5.5 generation quality and latency not asserted.

### Lab・Library・長期記憶版
- Automated: 18 tests passed, including HTTP restart restoration, private recall, correction history, draft/review/publish/hold transitions, and revision-bound human feedback.
- Real GPT-5.5: one poster draft returned live structured data, passed artifact validation and entered review, without warning.
- Browser QA in separate demo session: entered Library and read all three work documents; exited and entered Lab; viewed poster/music monitors and enlarged artifacts; exercised play/stop without browser errors; reloaded and resumed the saved town; observed both demo projects published; submitted poster feedback and saw confirmation that it was stored in the author's memory.
- Fixed global canvas CSS that would otherwise expand artifact previews to the entire viewport.
- Room assets are procedural prototype geometry. Real generated music quality, long-running emergent outcomes, and every NPC travel path have not been exhaustively evaluated.
