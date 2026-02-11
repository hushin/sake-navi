# 🍶 酒ナビ（Sake Navi）

にいがた酒の陣で友人とお酒のレビュー・情報を共有するWebアプリ

## 特徴

- 📍 **フロアマップ連携** - 会場マップから酒蔵をタップして直接アクセス
- ⭐ **簡単レビュー** - 星5評価 + タグ + コメントで手軽に記録
- 👥 **リアルタイム共有** - 友人のレビューをタイムラインで即確認
- 🔔 **Discord通知** - 投稿があるとDiscordチャンネルに自動通知
- 📱 **スマホ最適化** - 会場を歩きながら片手で操作

## 技術スタック

- Next.js (App Router) + TypeScript
- Hono (API)
- Cloudflare Workers + D1
- OpenNext (`@opennextjs/cloudflare`)
- Drizzle ORM

## セットアップ

### 前提条件

- Node.js >= 20
- pnpm
- Cloudflare アカウント
- Wrangler CLI (`pnpm add -g wrangler`)

### インストール

```bash
git clone <repository-url>
cd sake-navi
pnpm install
```

### ローカル開発

```bash
# .dev.vars.example を参考に .dev.vars を作成

# マイグレーション適用
pnpm db:migrate:local

# 初期データ投入（酒蔵・お酒マスタ）
pnpm db:seed:local
# デモ用ダミーデータ投入
pnpm db:seed-demo:local

# 開発サーバー起動
pnpm dev
```

### デプロイ

```bash
# D1データベース作成（初回のみ）
wrangler d1 create sake-navi-db

# wrangler.toml の database_id を更新

# リモートD1にマイグレーション適用
pnpm db:migrate:remote

# 初期データ投入
pnpm db:seed:remote

# Discord Webhook設定
wrangler secret put DISCORD_WEBHOOK_URL
# BASE_URL 設定 例: https://sake-navi.example.workers.dev
wrangler secret put BASE_URL

# デプロイ
pnpm run deploy
```

## 使い方

1. サイトにアクセスし、名前を入力
2. フロアマップから酒蔵をタップ
3. お酒を選んでレビューを投稿
4. タイムラインで友人のレビューを確認

## メモ

### データを消す

```
# すべてのテーブルを削除
pnpm wrangler d1 execute sake-navi-db --remote --command="DROP TABLE IF EXISTS reviews; DROP TABLE IF EXISTS brewery_notes; DROP TABLE IF EXISTS sakes; DROP TABLE
IF EXISTS breweries; DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS _drizzle_migrations;"
```
