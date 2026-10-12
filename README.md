# 🍶 酒ナビ（sake-navi）

にいがた酒の陣で飲んだ日本酒のレビューを、友人グループで共有する Web アプリ。
会場のフロアマップから酒蔵を探し、出品酒を星 5 段階（0.25 刻み）＋タグ＋コメントで記録して、
タイムラインでみんなの投稿を追いかける。スマホ片手で使えることを前提にしている。

## できること（MVP）

- 🔐 **Google でサインイン**（許可リスト制。オーナーがアプリ内でメンバーを追加する）
- 🏷️ **ニックネーム登録**（初回サインイン後に決める。以降の表示はこの名前）
- 🗺️ **フロアマップ**（会場のブース配置から酒蔵を探す。平均評価と自分がレビュー済みかを表示）
- 🔍 **お酒の一覧・検索**（銘柄名・酒蔵名の部分一致、区分、限定品、有料試飲あり、金額未入力）
- 🏪 **酒蔵詳細**（出品酒の一覧。お酒詳細とマップへの導線、当日の銘柄を追加できる）
- 📝 **酒蔵ノート**（列の長さ・売り切れ・混雑など、酒以外の一次情報を共有）
- ⭐ **レビューの投稿・編集・削除**（星 5 段階（0.25 刻み）＋タグ＋コメント、1 人 1 銘柄 1 件）
- ✏️ **銘柄の編集**（名前・種類・区分・限定・有料試飲の金額。身内で使うアプリなので誰でも編集できる）
- 🔖 **ブックマーク**（気になった銘柄を保存して、一覧・詳細・ブックマーク画面から見返す）
- 🕒 **タイムライン**（新しい順。カーソルで続きを読む）
- 📊 **レビュー一覧**（新着順／評価順の並び替え、タグの AND 絞り込み、自分のレビューだけ）
- 🔔 **Discord 通知**（レビューは既定 OFF、酒蔵ノートは既定 ON。Webhook を設定したときだけ送る）
- 👥 **メンバー管理**（オーナーが Google アカウントを追加・削除）
- 📚 **酒蔵・銘柄マスタ**（旧アプリの seed を移植。`pnpm db:seed:local` で投入）
- 📦 **静的 HTML アーカイブ**（イベント後にレビューを 1 枚の HTML に固めて共有）

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
| `DISCORD_WEBHOOK_URL`  | Discord の Webhook URL（未設定なら通知しない。任意）                   |

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

`http://localhost:5173` を開くとサインイン画面になる。
**Google でサインイン** → ニックネームを決める → 会場マップ（`/` はマップへリダイレクトする）。

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
# Discord に投稿を流す場合だけ（未設定なら通知しない）
pnpm wrangler secret put DISCORD_WEBHOOK_URL

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
pnpm archive / archive:dump / archive:generate
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
│   ├── pages/         # 画面本体（map / sakes / sake-detail / brewery-detail / timeline / bookmarks / settings / sign-in / welcome）
│   └── shared/        # ui（shadcn/ui）、lib、api
└── shared/            # worker と react-app の共通コード（zod スキーマ・定数）
db/                    # マスタ投入用の seed SQL
drizzle/               # drizzle-kit が生成したマイグレーション（コミット対象）
scripts/               # アーカイブ生成（node --experimental-strip-types で実行）
```

## テスト

```bash
pnpm test    # worker（D1 込みの route テスト）と story（interaction test）をまとめて実行
```

- Hono route → `src/worker/**/*.test.ts`（本物の D1 をマイグレーション込みで使う）
- 画面の描画・操作 → `*.stories.tsx` の `play`（MSW でモック）
- 純粋な計算ロジック → 対象の隣の `*.test.ts`

## マスタデータ

- `db/seed-breweries.sql`（酒蔵・ブース番号とマップのグリッド位置）
- `db/seed-sakes.sql`（銘柄）

有料試飲は `sakes.paid_tasting_price` で持つ。`NULL` = 有料試飲なし / `7` = **有料試飲あり（金額は未確認）** /
それ以外 = その金額。`7` は出典 PDF で金額が分からなかったものに付いていた印なので、`¥7` とは表示しない。
金額が分かったら、お酒の詳細画面の「編集」からその場で入力して直す。

## アーカイブ（静的 HTML）

イベント後にレビューを 1 枚の HTML に固めて共有する。マップ・酒蔵一覧（検索つき）・
タイムライン・ユーザー別レビュー・ランキング／統計が入った、サーバ不要の 1 ファイル。

```bash
pnpm archive               # ダンプ + 生成（本番 D1 を読むので Cloudflare の認証が要る）
pnpm archive:dump          # D1 → dist/archive/*.json
pnpm archive:generate      # JSON → dist/archive/{実行年}.html
pnpm archive:dump --local  # ローカルの D1 で試す
```

マップの配置計算は画面と共通の `src/react-app/shared/lib/map-layout.ts` を使う
（旧実装は画面とアーカイブに同じ計算をコピーしていて二重管理になっていた）。
出力先の `dist/` は gitignore 済み。

## Discord 通知

`DISCORD_WEBHOOK_URL` を設定すると、レビューと酒蔵ノートの投稿を Discord に流す。
投稿フォームの「Discord に通知する」で 1 件ごとに切り替えられる（レビューは既定 OFF、ノートは既定 ON）。
通知は `c.executionCtx.waitUntil()` で送るので、投稿のレスポンスは待たない（失敗しても投稿は成功扱い）。

Discord 側は チャンネル設定 → 連携サービス → ウェブフック から URL を作れる。
ローカルで試すときは `.dev.vars` に、本番は `wrangler secret put DISCORD_WEBHOOK_URL` で登録する。
