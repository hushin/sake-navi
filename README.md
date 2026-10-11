# 🍶 酒ナビ（sake-navi）

にいがた酒の陣で飲んだ日本酒のレビューを、友人グループで共有する Web アプリ。
会場の出品酒（酒蔵 82・銘柄 563）から選んで、星 5 段階＋タグ＋コメントで記録し、
タイムラインでみんなの投稿を追いかける。スマホ片手で使えることを前提にしている。

## できること（MVP）

- 🔐 **Google でサインイン**（許可リスト制。オーナーがアプリ内でメンバーを追加する）
- 🔍 **お酒の一覧・検索**（銘柄名・酒蔵名の部分一致、区分、限定品）
- ⭐ **レビューの投稿・編集・削除**（星 5 段階＋タグ＋コメント、1 人 1 銘柄 1 件）
- 🕒 **タイムライン**（新しい順。カーソルで続きを読む）
- 👥 **メンバー管理**（オーナーが Google アカウントを追加・削除）
- 🏪 **酒蔵・銘柄マスタ**（旧アプリの seed を移植。`pnpm db:seed:local` で投入）

## これから足すもの（旧アプリにあって未移植）

フロアマップ / ブックマーク / 酒蔵ノート / お酒の自由追加（ユーザー投稿の銘柄）/ Discord 通知 /
静的 HTML アーカイブ / レビュー一覧（並び替え・タグ絞り込み）/ 管理向けのマスタ編集

## 技術スタック

| カテゴリ       | 技術                                                                                    |
| -------------- | --------------------------------------------------------------------------------------- |
| フロントエンド | React 19, TypeScript, shadcn/ui（base UI）, Tailwind CSS v4                             |
| ルーティング   | TanStack Router（file-based routing）                                                   |
| フォーム       | TanStack Form                                                                           |
| データ取得     | TanStack Query                                                                          |
| バックエンド   | Hono 4（Workers 上で動作）, zod, @hono/zod-validator                                    |
| データベース   | Cloudflare D1, Drizzle ORM                                                              |
| 認証           | Better Auth（Google OAuth）                                                             |
| ビルドツール   | Vite 8, @cloudflare/vite-plugin, @tanstack/router-plugin                                |
| デプロイ       | Wrangler 4, Cloudflare Workers                                                          |
| Lint / Format  | oxlint, oxfmt, steiger（FSD 構造）, dependency-cruiser（依存の向き）                    |
| UI カタログ    | Storybook 10（@storybook/tanstack-react）, MSW                                          |
| テスト         | Vitest, @cloudflare/vitest-plugin, @storybook/addon-vitest（browser mode / Playwright） |
| Git hooks      | lefthook                                                                                |
| パッケージ管理 | pnpm / mise                                                                             |

## セットアップ

前提: **Node 24 / pnpm 12**（`mise install` で入る）、Cloudflare アカウント。

### 1. 依存を入れる

```bash
mise install
mise run setup          # pnpm install + lefthook install + Playwright の chromium
# すでに clone 済みなら
pnpm install
```

### 2. Google の OAuth クライアントを作る

1. [Google Cloud Console](https://console.cloud.google.com/apis/dashboard) でプロジェクトを作る
2. **APIs & Services → OAuth consent screen** を設定する（アプリ名・サポートメール。公開しなくてよい）
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** を選び、
   Application type を **Web application** にする
4. **Authorized redirect URIs** に次を登録する
   - ローカル: `http://localhost:5173/api/auth/callback/google`
   - 本番: `https://<Worker のドメイン>/api/auth/callback/google`
5. 表示された **Client ID** と **Client Secret** を控える

> リダイレクト URI は better-auth が `BETTER_AUTH_URL` + `/api/auth/callback/google` から組み立てる。
> `wrangler.json` の `vars.BETTER_AUTH_URL`（本番）と `.dev.vars` の `BETTER_AUTH_URL`（ローカル）を
> 実際の URL に合わせること。ここがズレると `redirect_uri_mismatch` になる。

### 3. D1 を作る

```bash
pnpm wrangler d1 create sake-navi-db
```

出力された `database_id` を `wrangler.json` の `d1_databases[0].database_id` に貼る。

> 旧アプリの `sake-navi-db` が残っている場合は、名前がぶつかる。旧 DB を消すか
> （`pnpm wrangler d1 delete sake-navi-db`）、`database_name` を `sake-navi-db-v2` などに変える
> （コードは binding 名 `DB` しか見ていないので、名前は自由）。

### 4. シークレットを書く

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` を埋める。

| 変数                   | 値                                                                     |
| ---------------------- | ---------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`   | `openssl rand -base64 32` などで生成した文字列                         |
| `BETTER_AUTH_URL`      | `http://localhost:5173`                                                |
| `GOOGLE_CLIENT_ID`     | 手順 2 の Client ID                                                    |
| `GOOGLE_CLIENT_SECRET` | 手順 2 の Client Secret                                                |
| `ALLOWED_EMAILS`       | **最初にサインインする自分の Google アドレス**（カンマ区切りで複数可） |

`ALLOWED_EMAILS` に載っているアカウントだけがサインインでき、**最初にサインインした人がオーナー**になる。

### 5. マイグレーションとマスタ投入

```bash
pnpm db:migrate:local   # drizzle/ の SQL をローカル D1 に適用
pnpm db:seed:local      # 酒蔵 82・銘柄 563 を投入
```

`worker-configuration.d.ts` を作り直したいときは（`.dev.vars` を埋めた状態で）:

```bash
pnpm cf-typegen
```

### 6. 起動する

```bash
pnpm dev                # http://localhost:5173
```

`http://localhost:5173` を開くとサインイン画面になる。**Google でサインイン** → お酒の一覧。

## デプロイ

```bash
# 1. 本番の URL を wrangler.json の vars.BETTER_AUTH_URL に書く
# 2. 本番 D1 にマイグレーションとマスタを入れる
pnpm db:migrate
pnpm db:seed

# 3. シークレットを登録する
pnpm wrangler secret put BETTER_AUTH_SECRET
pnpm wrangler secret put GOOGLE_CLIENT_ID
pnpm wrangler secret put GOOGLE_CLIENT_SECRET
pnpm wrangler secret put ALLOWED_EMAILS

# 4. デプロイ（Google 側に本番のリダイレクト URI を追加しておく）
pnpm build && pnpm deploy
```

## メンバーを増やす

2 人目以降はオーナーがアプリ内の **メンバー**（`/settings`）画面で Google アカウントの
メールアドレスを追加する。追加された人はそのままサインインできる。
取り消すと、次回のサインインから入れなくなる（すでに作成済みのユーザー行は残る）。

## コマンド

```bash
pnpm dev / build / check / test / lint / fmt / storybook
pnpm db:generate / db:migrate:local / db:seed:local / db:migrate / db:seed
```

一覧と開発の決まりごとは [AGENTS.md](./AGENTS.md) にまとめてある。

## ディレクトリ構造

```
src/
├── worker/            # Hono（Workers entrypoint は index.ts）
│   ├── auth/          # Better Auth（createAuth / middleware）
│   ├── db/            # Drizzle スキーマ（schema.ts / auth-schema.ts）
│   ├── repositories/  # データアクセス
│   └── routes/        # Hono route
├── react-app/         # React SPA（Feature-Sliced Design）
│   ├── app/           # bootstrap（provider・router）、layouts
│   ├── routes/        # TanStack Router の薄い route 定義
│   ├── pages/         # 画面本体（sakes / sake-detail / timeline / settings / sign-in）
│   └── shared/        # ui（shadcn/ui）、lib、api
└── shared/            # worker と react-app の共通コード（zod スキーマ・定数）
db/                    # マスタ投入用の seed SQL
drizzle/               # drizzle-kit が生成したマイグレーション（コミット対象）
```

## テスト

```bash
pnpm test    # worker（D1 込みの route テスト）と story（interaction test）をまとめて実行
```

- Hono route → `src/worker/**/*.test.ts`（本物の D1 をマイグレーション込みで使う）
- 画面の描画・操作 → `*.stories.tsx` の `play`（MSW でモック）
- 純粋な計算ロジック → 対象の隣の `*.test.ts`

## マスタデータ

`db/seed-breweries.sql`（酒蔵 82 件・ブース番号とマップのグリッド位置）と
`db/seed-sakes.sql`（銘柄 563 件）は旧アプリから移植したもの。
旧 `sakes.paid_tasting_price` は出典 PDF の値（NULL / 7）が金額として使えなかったため移行していない。
