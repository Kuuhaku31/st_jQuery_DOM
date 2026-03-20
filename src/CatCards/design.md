# CatCards 設計

## アプリ名：CatCards（ネコ戦争）

- ブラウザで動作するシングルページのカードバトル。
- プレイヤーはカードを引き、出撃カードを選び、相手カードと戦闘する。
- ログ、並び替え、フィルタ、状態保存（localStorage）を備える。

## 本体配列：playerCards

- 保持場所：`gameState.playerCards`
- 役割：プレイヤーが所持するカード一覧（UIの主データソース）
- 主要操作
  - 追加：プレイヤードロー時、敵撃破時の獲得
  - 削除：破棄時（`removeCardById`）
  - 参照：出撃選択、描画、並び替え、フィルタ

補助状態（`gameState`）

- `cardID`: 一意ID採番用カウンタ
- `selectedCardId`: 現在の出撃カードID
- `enemyCard`: 相手側の現在カード
- `round`: ラウンド数
- `log`: ゲームログ配列
- `sortBy`, `sortOrder`: 並び替え設定
- `filterAliveOnly`: HP>0フィルタのON/OFF

## 1件分のデータ：Card

`Card` は以下の構造を持つ。

```js
{
  id:       string, // 例: "card-1"
  imageUrl: string, // 猫画像URL
  name:     string, // 猫の名前
  attack:   number, // 攻撃力
  defense:  number, // 防御力
  life:     number, // 現在HP
  maxLife:  number  // 最大HP（初期値）
}
```

- `id` は `card-{number}` 形式で採番。
- `life` は戦闘で変化し、`maxLife` は初期最大HPとして固定。
- API取得直後はプレースホルダ状態から実データに更新される。

## renderで表示するもの

`render()` で更新する主なUI要素

- ステータス
  - `#round-text`: 現在ラウンド
  - `#card-count`: 所持数/上限
- 制御UI
  - `#battle-btn` 有効/無効
  - `#restart-game` 有効/無効
  - 並び替え・フィルタ入力値の同期
- ログ
  - `#game-log` に `gameState.log` を新しい順で描画
- プレイヤーデッキ
  - `#player-cards` にカード一覧を描画
  - 条件により空表示メッセージを表示
- 対戦エリア
  - `#selected-card`: 自分の出撃カード
  - `#enemy-card`: 相手カード

備考

- `render()` の末尾で `saveGameState()` を呼び、最新状態を保存する。

## sortについて

対象：`getDisplayedPlayerCards()`

- 入力設定
  - `sortBy`: `none | life | attack | defense | maxLife`
  - `sortOrder`: `asc | desc`
- 仕様
  - `playerCards` のコピーに対してソート（元配列は破壊しない）
  - `sortBy === none` の場合は順序変更なし
  - 昇順/降順は `orderFactor` で切替

## filterについて

対象：`getDisplayedPlayerCards()`

- 設定値：`filterAliveOnly`（チェックボックス `#filter-alive`）
- 条件：`card.life > 0`
- 適用順
  1. フィルタ
  2. ソート
- フィルタ後に0件の場合は「表示できるカードがありません。」を表示

## saveについて

保存方式：`localStorage`

- キー：`cat-cards-game-state`
- 保存タイミング：`render()` のたびに JSON 文字列として保存
- 読み込みタイミング：初期化時
  - `loadGameState()` が成功すれば保存データを採用
  - 失敗時は `initialState(gameState)` で新規開始

保存対象

- `gameState` 全体（カード一覧、選択状態、ログ、並び替え条件など）

## APIについて

使用API

- 猫画像API
  - `https://api.thecatapi.com/v1/images/search`
  - 役割：カード画像URL取得
- ユーザー情報API
  - `https://randomuser.me/api/?results=3&nat=jp`
  - 役割：名前・年齢・住所番号を取得し、カード能力値を生成

処理フロー

1. 猫画像を取得
2. ユーザー情報を取得
3. 取得データから `attack / defense / life / maxLife` を計算
4. カードに反映して再描画

エラー時

- 取得失敗時は `console.error` を出力し、UIは次回操作で回復可能な状態を維持する。

## 開発プロセスにおけるAIツールの利用について

1. このアプリケーションのUI（具体的にはCSS部分）は、AIツールを使用して生成したもの。ゲームの要件に合わせて微調整をした。
2. アプリケーションのテキスト（ゲームの説明やUIの文言など）は、AIツールを使用して中国語から翻訳したもの。
3. 他に開発途中で分からない点があった際には、AIツールを使用して質問し、回答をちゃんと理解した上で実装した。
