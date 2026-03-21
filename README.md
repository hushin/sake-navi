# 🍶 酒ナビ（Sake Navi）

にいがた酒の陣で友人とお酒のレビュー・情報を共有するWebアプリ

## 特徴

- 📍 **フロアマップ連携** - 会場マップから酒蔵をタップして直接アクセス
- ⭐ **簡単レビュー** - 星5評価 + タグ + コメントで手軽に記録
- 👥 **リアルタイム共有** - 友人のレビューをタイムラインで即確認
- 📌 **ブックマーク機能** - お気に入りのお酒を保存して後で確認
- 🔔 **Discord通知** - 投稿があるとDiscordチャンネルに自動通知
- 🔍 **お酒検索** - 酒名・酒蔵名で検索、カテゴリや限定品でフィルタ
- 📱 **スマホ最適化** - 会場を歩きながら片手で操作

## 技術スタック

- Next.js (App Router) + TypeScript
- Hono (API)
- Cloudflare Workers + D1
- OpenNext (`@opennextjs/cloudflare`)
- Drizzle ORM

## セットアップ

### 前提条件

- Node.js >= 22
- pnpm
- Cloudflare アカウント

### インストール

```bash
pnpm install
```

### ローカル開発

```bash
# .dev.vars.example を参考に .dev.vars を作成
cp .dev.vars.example .dev.vars

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
pnpm wrangler d1 create sake-navi-db
# 質問されるので wrangler.toml の database_id を更新する

# リモートD1にマイグレーション適用
pnpm db:migrate:remote

# 初期データ投入
pnpm db:seed:remote

# Discord Webhook設定
pnpm wrangler secret put DISCORD_WEBHOOK_URL
# BASE_URL 設定 例: https://sake-navi.example.workers.dev
pnpm wrangler secret put BASE_URL

# デプロイ
pnpm run deploy
```

## 使い方

1. サイトにアクセスし、名前を入力
2. フロアマップから酒蔵をタップ
3. お酒を選んでレビューを投稿
4. タイムラインで友人のレビューを確認

## 開発メモ

### データを消す

```bash
# local
rm -rf .wrangler/
```

```bash
# remote すべてのテーブルを削除
pnpm wrangler d1 execute sake-navi-db --remote --command "DROP TABLE IF EXISTS reviews; DROP TABLE IF EXISTS bookmarks; DROP TABLE IF EXISTS brewery_notes; DROP TABLE IF EXISTS sakes; DROP TABLE IF EXISTS breweries; DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS d1_migrations;"
```

### データアーカイブ

イベント終了後、レビューデータを静的HTMLとしてアーカイブできます。

```bash
# リモートD1からデータダンプ + HTML生成（一括）
pnpm archive

# 個別実行
pnpm archive:dump      # D1 → dist/archive/*.json
pnpm archive:generate  # JSON → dist/archive/index.html
```

`dist/archive/index.html` をブラウザで開くと、フロアマップ・酒蔵一覧・タイムライン・ユーザー別レビュー・ランキングを閲覧できます。

## License

[MIT](LICENSE)
