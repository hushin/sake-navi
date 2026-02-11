# 酒ナビ（Sake Navi） - 設計書

## 1. プロジェクト概要

**にいがた酒の陣**向けの、友人間でお酒のレビュー・情報を共有するWebアプリ。
会場フロアマップから酒蔵を選び、出品酒に対してレビュー・ノートを投稿し、リアルタイムに共有する。

### 1.1 コンセプト

- 会場を歩きながらスマホで手軽にレビュー投稿
- 友人が「どこで何を飲んだか」「おすすめは何か」をリアルタイムに把握
- イベント後の振り返りにも使える記録ツール

### 1.2 想定利用者

- 友人グループ 5名以下
- パスワード不要、名前のみで識別

---

## 2. 機能一覧

| #    | 機能                     | 概要                                                                                 |
| ---- | ------------------------ | ------------------------------------------------------------------------------------ |
| F-01 | ユーザー登録             | 初回アクセス時に名前を入力。ユニーク制約あり。localStorage でセッション維持          |
| F-02 | フロアマップ表示         | 会場マップ画像を横スクロール可能に表示。酒蔵位置にクリッカブルなホットスポットを配置 |
| F-03 | 酒蔵詳細                 | 酒蔵をタップすると出品酒一覧・酒蔵ノートを表示                                       |
| F-04 | レビュー投稿             | お酒に対して星5評価 + タグ + フリーテキストを投稿                                    |
| F-05 | 酒蔵ノート               | 酒蔵に対してフリーテキストのノートを投稿                                             |
| F-06 | 自由入力酒               | 事前登録にないお酒をユーザーが自由入力で追加                                         |
| F-07 | 投稿履歴（タイムライン） | 全ユーザーの投稿をタイムライン形式で表示                                             |
| F-08 | Discord通知              | 投稿時にWebhookでDiscordチャンネルに通知                                             |

---

## 3. 画面設計

### 3.1 画面遷移

```
[名前入力] → [フロアマップ（トップ）]
                ├→ [酒蔵詳細]
                │    ├→ [お酒レビュー投稿]
                │    ├→ [酒蔵ノート投稿]
                │    └→ [自由入力酒追加]
                └→ [タイムライン]
```

### 3.2 各画面の詳細

#### 3.2.1 名前入力画面（`/`）

- テキスト入力 + 送信ボタン
- ユニーク制約チェック → 重複時はエラー表示
- 登録成功後、`userId` と `userName` を localStorage に保存
- 次回以降は自動でフロアマップへ遷移

#### 3.2.2 フロアマップ画面（`/map`）

- 会場マップ画像を `overflow-x: auto` で横スクロール可能に配置
- 画像上に酒蔵の位置を示すクリッカブルなオーバーレイ（座標はDB管理）
- 酒蔵タップで酒蔵詳細画面へ遷移
- ヘッダーにタイムラインへのリンク
- 酒蔵にレビューがある場合、平均評価をバッジ表示

#### 3.2.3 酒蔵詳細画面（`/brewery/:id`）

- 酒蔵名・ブース番号
- 出品酒一覧（各酒に平均星評価・レビュー数を表示）
- 酒蔵ノート一覧（投稿者名・投稿時刻つき）
- 「お酒を追加」ボタン（自由入力）
- 「酒蔵ノートを書く」ボタン

#### 3.2.4 レビュー投稿画面（`/brewery/:breweryId/sake/:sakeId/review`）

- お酒名（読み取り専用）
- 星5評価（必須）：タップで選択
- タグ選択（複数選択可、オプション）：
  - 甘口 / 辛口 / 濃醇 / 淡麗 / にごり / 酸 / 旨味 / 熟成 / 苦味 / 発泡
- フリーテキスト（オプション）
- 送信ボタン

#### 3.2.5 タイムライン画面（`/timeline`）

- 全投稿を新しい順に表示
- カード形式：投稿者名、酒蔵名、お酒名、星評価、タグ、コメント、投稿時刻
- 投稿種別アイコン（レビュー / 酒蔵ノート）

---

## 4. データベース設計（Cloudflare D1）

### 4.1 ER図

```
users 1──N reviews
users 1──N brewery_notes
breweries 1──N sakes
breweries 1──N brewery_notes
sakes 1──N reviews

breweries (酒蔵)
  ├── brewery_id (PK)
  ├── name
  ├── booth_number
  ├── map_position_x
  ├── map_position_y
  └── area (エリア区分)

sakes (お酒)
  ├── sake_id (PK)
  ├── brewery_id (FK)
  ├── name
  ├── type (種別: 大吟醸, 純米, etc.)
  ├── is_custom (ユーザー追加か)
  └── added_by (ユーザー追加時のuser_id)

users (ユーザー)
  ├── user_id (PK)
  ├── name (UNIQUE)
  └── created_at

reviews (レビュー)
  ├── review_id (PK)
  ├── user_id (FK)
  ├── sake_id (FK)
  ├── rating (1-5)
  ├── tags (JSON配列)
  ├── comment
  └── created_at

brewery_notes (酒蔵ノート)
  ├── note_id (PK)
  ├── user_id (FK)
  ├── brewery_id (FK)
  ├── comment
  └── created_at
```

### 4.2 DDL

```sql
-- ユーザー
CREATE TABLE users (
  user_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 酒蔵
CREATE TABLE breweries (
  brewery_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  booth_number INTEGER,
  map_position_x REAL NOT NULL DEFAULT 0,
  map_position_y REAL NOT NULL DEFAULT 0,
  area TEXT
);

-- お酒
CREATE TABLE sakes (
  sake_id INTEGER PRIMARY KEY AUTOINCREMENT,
  brewery_id INTEGER NOT NULL REFERENCES breweries(brewery_id),
  name TEXT NOT NULL,
  type TEXT,
  is_custom INTEGER NOT NULL DEFAULT 0,
  added_by TEXT REFERENCES users(user_id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- レビュー
CREATE TABLE reviews (
  review_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  sake_id INTEGER NOT NULL REFERENCES sakes(sake_id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags TEXT DEFAULT '[]',
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 酒蔵ノート
CREATE TABLE brewery_notes (
  note_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  brewery_id INTEGER NOT NULL REFERENCES breweries(brewery_id),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- インデックス
CREATE INDEX idx_reviews_sake ON reviews(sake_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);
CREATE INDEX idx_brewery_notes_brewery ON brewery_notes(brewery_id);
CREATE INDEX idx_brewery_notes_created ON brewery_notes(created_at DESC);
CREATE INDEX idx_sakes_brewery ON sakes(brewery_id);
```

---

## 5. API設計

### 5.1 エンドポイント一覧

Base path: `/api`

| Method | Path                   | 概要                       |
| ------ | ---------------------- | -------------------------- |
| POST   | `/users`               | ユーザー登録               |
| GET    | `/users/:id`           | ユーザー情報取得           |
| GET    | `/breweries`           | 酒蔵一覧（マップ座標含む） |
| GET    | `/breweries/:id`       | 酒蔵詳細 + 出品酒一覧      |
| GET    | `/breweries/:id/notes` | 酒蔵ノート一覧             |
| POST   | `/breweries/:id/notes` | 酒蔵ノート投稿             |
| POST   | `/breweries/:id/sakes` | お酒追加（自由入力）       |
| GET    | `/sakes/:id`           | お酒詳細 + レビュー一覧    |
| POST   | `/sakes/:id/reviews`   | レビュー投稿               |
| GET    | `/timeline`            | タイムライン（全投稿）     |

### 5.2 リクエスト / レスポンス詳細

#### POST `/api/users`

```json
// Request
{ "name": "たかし" }

// Response 201
{ "userId": "a1b2c3d4e5f6g7h8", "name": "たかし" }

// Response 409
{ "error": "この名前は既に使われています" }
```

#### GET `/api/breweries`

```json
// Response 200
{
  "breweries": [
    {
      "breweryId": 1,
      "name": "北雪酒造",
      "boothNumber": 82,
      "mapPositionX": 5.2,
      "mapPositionY": 10.5,
      "avgRating": 4.2,
      "reviewCount": 3
    }
  ]
}
```

#### GET `/api/breweries/:id`

```json
// Response 200
{
  "brewery": {
    "breweryId": 1,
    "name": "北雪酒造",
    "boothNumber": 82
  },
  "sakes": [
    {
      "sakeId": 1,
      "name": "北雪 大吟醸",
      "type": "大吟醸",
      "avgRating": 4.5,
      "reviewCount": 2,
      "isCustom": false
    }
  ]
}
```

#### POST `/api/sakes/:id/reviews`

```json
// Request
{
  "userId": "a1b2c3d4e5f6g7h8",
  "rating": 4,
  "tags": ["甘口", "濃醇"],
  "comment": "フルーティーで飲みやすい！"
}

// Response 201
{ "reviewId": 1 }
```

#### POST `/api/breweries/:id/notes`

```json
// Request
{
  "userId": "a1b2c3d4e5f6g7h8",
  "comment": "ブースの雰囲気が良い。スタッフが親切。"
}

// Response 201
{ "noteId": 1 }
```

#### POST `/api/breweries/:id/sakes`

```json
// Request
{
  "userId": "a1b2c3d4e5f6g7h8",
  "name": "限定 しぼりたて生原酒",
  "type": "生原酒"
}

// Response 201
{ "sakeId": 101 }
```

#### GET `/api/timeline`

```json
// Response 200
{
  "items": [
    {
      "type": "review",
      "reviewId": 5,
      "userName": "たかし",
      "breweryName": "北雪酒造",
      "sakeName": "北雪 大吟醸",
      "rating": 4,
      "tags": ["甘口"],
      "comment": "フルーティー！",
      "createdAt": "2025-03-15T14:30:00Z"
    },
    {
      "type": "brewery_note",
      "noteId": 3,
      "userName": "たけし",
      "breweryName": "八海醸造",
      "comment": "試飲の列が長い",
      "createdAt": "2025-03-15T14:25:00Z"
    }
  ]
}
```

---

## 6. Discord Webhook 通知

### 6.1 通知タイミング

- レビュー投稿時
- 酒蔵ノート投稿時

### 6.2 通知フォーマット

```
🍶 レビュー投稿
たかし が 北雪酒造「北雪 大吟醸」を評価しました
⭐⭐⭐⭐☆ (4/5)
🏷️ 甘口, 濃醇
💬 フルーティーで飲みやすい！
```

```
📝 酒蔵ノート
たけし が 八海醸造 にノートを投稿しました
💬 試飲の列が長い
```

### 6.3 実装

Webhook URLは環境変数 `DISCORD_WEBHOOK_URL` で管理。投稿APIの処理内で `ctx.executionCtx.waitUntil()` を使い、非同期でfetchする。

---

## 7. 技術構成

### 7.1 スタック

| レイヤー        | 技術                                |
| --------------- | ----------------------------------- |
| フロントエンド  | Next.js (App Router)                |
| バックエンドAPI | Hono (Cloudflare Workers)           |
| デプロイ        | OpenNext → Cloudflare Workers/Pages |
| データベース    | Cloudflare D1 (SQLite)              |
| 通知            | Discord Webhook                     |

### 7.2 ディレクトリ構成

```
sake-navi/
├── CLAUDE.md
├── DESIGN.md
├── README.md
├── package.json
├── wrangler.toml
├── open-next.config.ts
├── next.config.ts
├── tsconfig.json
├── drizzle.config.ts
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx             # 名前入力
│   │   ├── map/
│   │   │   └── page.tsx         # フロアマップ
│   │   ├── brewery/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # 酒蔵詳細
│   │   ├── review/
│   │   │   └── [sakeId]/
│   │   │       └── page.tsx     # レビュー投稿
│   │   └── timeline/
│   │       └── page.tsx         # タイムライン
│   ├── components/
│   │   ├── FloorMap.tsx         # 横スクロール対応マップ
│   │   ├── StarRating.tsx       # 星評価コンポーネント
│   │   ├── TagSelector.tsx      # タグ選択
│   │   ├── ReviewCard.tsx       # レビュー表示カード
│   │   └── BreweryBadge.tsx     # マップ上の酒蔵バッジ
│   ├── lib/
│   │   ├── api.ts               # APIクライアント
│   │   └── auth.ts              # localStorage認証ヘルパー
│   ├── server/
│   │   ├── index.ts             # Hono アプリケーション
│   │   ├── routes/
│   │   │   ├── users.ts
│   │   │   ├── breweries.ts
│   │   │   ├── sakes.ts
│   │   │   ├── reviews.ts
│   │   │   └── timeline.ts
│   │   ├── db/
│   │   │   ├── schema.ts        # Drizzle ORMスキーマ
│   │   │   └── seed.ts          # 初期データ投入
│   │   └── services/
│   │       └── discord.ts       # Discord Webhook通知
│   └── data/
│       ├── breweries.json       # 酒蔵マスタ（座標含む）
│       └── sakes.json           # 出品酒マスタ
├── db/
│   └── migrations/
│       └── 0001_initial.sql
└── scripts/
    └── seed.ts                  # DBシードスクリプト
```

### 7.3 主要ライブラリ

| パッケージ               | 用途                                  |
| ------------------------ | ------------------------------------- |
| `next`                   | フロントエンドフレームワーク          |
| `hono`                   | バックエンドAPIフレームワーク         |
| `@opennextjs/cloudflare` | Next.js → Cloudflare Workers デプロイ |
| `drizzle-orm`            | D1 用 ORM                             |
| `drizzle-kit`            | マイグレーション管理                  |

---

## 8. フロアマップ実装

### 8.1 マップオーバーレイ方式

画像を `position: relative` のコンテナに配置し、各酒蔵の位置に `position: absolute` のクリッカブル要素を重ねる。

```tsx
// 概念コード
<div className="overflow-x-auto">
  <div className="relative" style={{ width: MAP_WIDTH }}>
    {breweries.map((b) => (
      <Link
        key={b.breweryId}
        href={`/brewery/${b.breweryId}`}
        className="absolute"
        style={{
          left: `${b.mapPositionX}%`,
          top: `${b.mapPositionY}%`,
        }}
      >
        <BreweryBadge name={b.name} avgRating={b.avgRating} />
      </Link>
    ))}
  </div>
</div>
```

### 8.2 座標データ

マップ画像に対する相対位置（パーセンテージ）をDBに保持。実装時にマップ画像と照らし合わせて座標を調整する。

---

## 9. 非機能要件

| 項目           | 要件                                                          |
| -------------- | ------------------------------------------------------------- |
| パフォーマンス | D1の無料枠で十分。5ユーザー・数百レビュー想定                 |
| セキュリティ   | パスワード不要のため最小限。userId をリクエストヘッダーで送信 |
| 可用性         | Cloudflare Workersのエッジ配信で十分                          |
| データ保持     | イベント終了後もデータ保持（振り返り用）                      |
| スマホ対応     | モバイルファーストUI。フロアマップは横スクロール対応          |
