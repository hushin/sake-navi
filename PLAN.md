# 酒ナビ 実装計画

## 完了済み

### 技術スタック構築
- [x] Next.js 16 + TypeScript セットアップ
- [x] Hono バックエンドAPI エントリポイント作成
- [x] Drizzle ORM スキーマ定義（5テーブル）
- [x] Cloudflare D1 マイグレーション生成・適用
- [x] wrangler.jsonc D1バインディング設定
- [x] 既存ファイル移動（floor-map.png, breweries.json）

### Phase 1: バックエンドAPI実装

#### 1.1 APIルート実装
- [x] `src/server/routes/users.ts` - ユーザー登録API
  - POST /api/users - 名前でユーザー作成
- [x] `src/server/routes/breweries.ts` - 酒蔵API
  - GET /api/breweries - 酒蔵一覧（マップ座標・平均評価付き）
  - GET /api/breweries/:id - 酒蔵詳細＋出品酒一覧
  - GET /api/breweries/:id/notes - 酒蔵ノート一覧
  - POST /api/breweries/:id/notes - 酒蔵ノート投稿
  - POST /api/breweries/:id/sakes - お酒追加（自由入力）
- [x] `src/server/routes/sakes.ts` - お酒API
  - GET /api/sakes/:id - お酒詳細＋レビュー一覧
  - POST /api/sakes/:id/reviews - レビュー投稿
- [x] `src/server/routes/timeline.ts` - タイムラインAPI
  - GET /api/timeline - 全投稿を新しい順に取得

#### 1.2 Discord通知
- [x] `src/server/services/discord.ts` - Webhook通知サービス
  - レビュー投稿通知
  - 酒蔵ノート投稿通知

#### 1.3 シードデータ
- [x] `db/seed.sql` - 酒蔵マスタデータ投入
  - breweries.jsonから88蔵元を投入

### Phase 2: フロントエンド実装

#### 2.1 共通コンポーネント
- [x] `src/lib/api.ts` - APIクライアント
- [x] `src/lib/auth.ts` - localStorage認証ヘルパー
- [x] `src/components/StarRating.tsx` - 星評価コンポーネント
- [x] `src/components/TagSelector.tsx` - タグ選択コンポーネント

#### 2.2 ページ実装
- [x] `/` (page.tsx) - 名前入力画面
  - 名前入力フォーム
  - ユーザー登録API呼び出し
  - localStorage保存 → /map へ遷移
- [x] `/map` - フロアマップ画面
  - 横スクロール対応マップ
  - 酒蔵バッジ（平均評価付き）
  - タイムラインへのリンク
- [x] `/brewery/[id]` - 酒蔵詳細画面
  - 出品酒一覧
  - 酒蔵ノート一覧
  - 酒追加・ノート投稿ボタン
- [x] `/brewery/[id]/sake/[sakeId]/review` - レビュー投稿画面
  - 星評価（1-5）
  - タグ選択
  - コメント入力
- [x] `/timeline` - タイムライン画面
  - レビュー・ノートのカード表示

---

## 次のステップ

### Phase 3: デプロイ準備

- [ ] Cloudflare D1データベース作成
  ```bash
  wrangler d1 create sake-navi-db
  ```
- [ ] wrangler.jsonc の database_id 設定
- [ ] リモートD1にマイグレーション適用
- [ ] Discord Webhook URL設定
- [ ] デプロイ実行
  ```bash
  pnpm deploy
  ```

---

## 主要ファイルパス

| ファイル | 概要 |
|---------|------|
| `src/server/index.ts` | Honoアプリ エントリポイント |
| `src/server/db/schema.ts` | Drizzle ORMスキーマ |
| `src/data/breweries.json` | 酒蔵マスタデータ（88蔵元） |
| `public/floor-map.png` | 会場フロアマップ画像 |
| `DESIGN.md` | 詳細設計書（API仕様、画面設計） |
| `CLAUDE.md` | プロジェクト概要・コマンド |

---

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# TypeScriptチェック
pnpm typecheck

# マイグレーション生成
pnpm db:generate

# ローカルD1にマイグレーション適用
pnpm db:migrate:local

# ローカルD1にシードデータ投入
pnpm db:seed:local
```
