# CLAUDE.md - 酒ナビ（Sake Navi）

## プロジェクト概要

にいがた酒の陣向けの、友人間でお酒のレビュー・情報共有Webアプリ。
会場フロアマップから酒蔵を選び、出品酒にレビューを投稿し、リアルタイムに共有する。

## 技術スタック

- **フロントエンド**: Next.js (App Router) + TypeScript
- **バックエンドAPI**: Hono on Cloudflare Workers
- **DB**: Cloudflare D1 (SQLite) + Drizzle ORM
- **デプロイ**: OpenNext (`@opennextjs/cloudflare`)
- **通知**: Discord Webhook

## コマンド

```bash
# 開発
pnpm install
pnpm dev                    # Next.js 開発サーバー

# DB操作
pnpm db:generate            # Drizzle マイグレーション生成
pnpm db:migrate:local       # ローカルD1にマイグレーション適用
pnpm db:migrate:remote      # リモートD1にマイグレーション適用
pnpm db:seed:local          # ローカルD1に初期データ投入
pnpm db:seed:remote         # リモートD1に初期データ投入

# デプロイ
pnpm build                  # Next.js ビルド
pnpm run deploy                 # Cloudflare Workers にデプロイ

# リント・フォーマット
pnpm lint
pnpm typecheck
```

## ディレクトリ構成

```
src/
├── app/                     # Next.js App Router (ページ)
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # / - 名前入力
│   ├── map/page.tsx         # /map - フロアマップ
│   ├── brewery/[id]/page.tsx  # /brewery/:id - 酒蔵詳細
│   ├── review/[sakeId]/page.tsx # /review/:sakeId - レビュー投稿
│   └── timeline/page.tsx    # /timeline - タイムライン
├── components/              # UIコンポーネント
├── lib/                     # クライアントユーティリティ
├── server/                  # Hono API (バックエンド)
│   ├── index.ts             # Honoアプリ エントリポイント
│   ├── routes/              # APIルート
│   ├── db/                  # Drizzle スキーマ・シード
│   └── services/            # Discord通知など
└── data/                    # マスタデータJSON
```

## アーキテクチャ上の判断

### 認証

- パスワード不要。名前入力のみ（ユニーク制約）
- `userId` を localStorage に保持
- APIリクエスト時は `X-User-Id` ヘッダーで送信
- セキュリティは最小限（友人5人の閉じた利用を想定）

### フロアマップ

- 会場マップ画像を横スクロール可能なコンテナに配置
- 各酒蔵の位置を `position: absolute` のクリッカブル要素でオーバーレイ
- 座標はDBに保持（マップ画像に対するパーセンテージ）
- 酒蔵バッジに平均評価を表示

### API構成

- Next.js の API Routes ではなく Hono を使用
- Hono は `src/server/index.ts` でアプリを定義
- OpenNext 経由で Cloudflare Workers にデプロイ時、Hono を統合
- D1バインディングは Hono の `c.var.db` で参照

### Discord通知

- 環境変数 `DISCORD_WEBHOOK_URL` でWebhook URLを管理
- 投稿処理後に `ctx.executionCtx.waitUntil()` で非同期送信
- レビュー投稿・酒蔵ノート投稿の2種類のフォーマット

## DB スキーマ概要

| テーブル        | 概要                                                                  |
| --------------- | --------------------------------------------------------------------- |
| `users`         | ユーザー。name はUNIQUE                                               |
| `breweries`     | 酒蔵マスタ。マップ座標を保持                                          |
| `sakes`         | お酒マスタ。brewery_id で酒蔵に紐づく。is_custom でユーザー追加を識別 |
| `reviews`       | お酒レビュー。rating(1-5), tags(JSON), comment                        |
| `brewery_notes` | 酒蔵ノート。フリーテキスト                                            |

## API エンドポイント

| Method | Path                       | 概要                 |
| ------ | -------------------------- | -------------------- |
| POST   | `/api/users`               | ユーザー登録         |
| GET    | `/api/breweries`           | 酒蔵一覧（マップ用） |
| GET    | `/api/breweries/:id`       | 酒蔵詳細＋出品酒     |
| POST   | `/api/breweries/:id/notes` | 酒蔵ノート投稿       |
| POST   | `/api/breweries/:id/sakes` | お酒追加（自由入力） |
| POST   | `/api/sakes/:id/reviews`   | レビュー投稿         |
| GET    | `/api/timeline`            | タイムライン         |

## レビューのタグ一覧

`甘口` `辛口` `濃醇` `淡麗` `にごり` `酸` `旨味` `熟成` `苦味` `発泡`

## コーディング規約

- TypeScript strict mode
- コンポーネントは関数コンポーネント + hooks
- API レスポンスは camelCase
- DBカラムは snake_case
- 日本語コメントOK（ユーザー向けの文字列は日本語）
- エラーハンドリング: API は適切な HTTP ステータスコードと日本語エラーメッセージを返す

## 環境変数

| 変数名                | 説明                                       | 設定場所                                               |
| --------------------- | ------------------------------------------ | ------------------------------------------------------ |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL                        | wrangler.toml (vars) or Cloudflare Dashboard (secrets) |
| `BASE_URL`            | アプリのベースURL（Discord通知のリンク用） | wrangler.jsonc (vars) or Cloudflare Dashboard          |

## 注意点

- D1 は SQLite ベースのため、JSON関数 (`json_each` 等) が使える
- `tags` カラムは JSON 文字列で格納 (例: `'["甘口","濃醇"]'`)
- マップ座標の調整は実際のマップ画像と照合しながら行う必要がある
- OpenNext + Cloudflare の構成は変化が早いため、公式ドキュメントを都度確認すること
- フロアマップ画像は `public/floor-map.png` に配置
