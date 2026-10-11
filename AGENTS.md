# 酒ナビ（sake-navi）

にいがた酒の陣で飲んだ日本酒のレビューを、友人グループで共有する Web アプリ。
会場の出品酒（酒蔵 82・銘柄 563）から銘柄を選び、星 5 段階＋タグ＋コメントで記録して、
タイムラインでみんなの投稿を追いかける。

Cloudflare Workers / Hono 4 / React 19 + Vite 8 / TanStack Router・Form・Query /
shadcn/ui（base UI）+ Tailwind v4 / zod / D1 + Drizzle ORM / Better Auth（Google）/
Vitest + Storybook 10 / oxlint + oxfmt

## 作業のルール

- パッケージマネージャは **pnpm**（npm ではない）。ツールは mise 管理（Node 24 / pnpm 12）
- **変更が一区切りしたら `pnpm check` と `pnpm test` を通す**（oxlint が型チェックも行うので、これで型エラーまで拾える）
- `worker-configuration.d.ts` は `pnpm cf-typegen` の生成物（手編集禁止）
- lint / format は lefthook が pre-commit で自動実行するので、整形のために手を入れない
- コミットメッセージは Conventional Commits
- シークレットは `.dev.vars` / `wrangler secret put`（コミット禁止）。公開設定は `wrangler.json` の `vars`

## コマンド

```bash
pnpm dev              # Vite dev server（localhost:5173）
pnpm check            # lint（型チェック込み）+ fmt:check + vite build + deploy --dry-run
pnpm test             # vitest run（worker + storybook）
pnpm lint             # oxlint（型エラーも出る）+ steiger（FSD の構造）+ depcruise（依存の向き）
pnpm build            # tsc -b + vite build
pnpm build && pnpm deploy   # デプロイ
pnpm cf-typegen       # worker-configuration.d.ts 再生成（.dev.vars を用意してから実行する）
pnpm storybook        # Storybook UI（localhost:6006）

pnpm db:generate      # src/worker/db/schema.ts の差分から drizzle/ に SQL を生成
pnpm db:migrate:local # ローカル D1 に migration を適用
pnpm db:seed:local    # 酒蔵・銘柄のマスタをローカル D1 に入れる
pnpm db:migrate       # 本番 D1 に migration を適用（--remote）
pnpm db:seed          # 本番 D1 にマスタを入れる（--remote）
```

## 構造

```
src/
├── worker/            # Hono（Workers entrypoint は index.ts、wrangler.json の main）
│   ├── auth/          # Better Auth。options（共通設定）/ index（createAuth）/ middleware（session・requireAuth・requireOwner）
│   ├── db/            # Drizzle。schema.ts（アプリのテーブル）/ auth-schema.ts（better-auth のテーブル）
│   ├── repositories/  # データアクセス（SQL はここに閉じ込める）
│   └── routes/        # 機能ごとの route。index.ts に .route() でマウント
├── react-app/         # React SPA（build 出力 ./dist/client、SPA mode）Feature-Sliced Design 採用
│   ├── app/           # FSD app レイヤー：bootstrap（provider・router 初期化）、layouts（RootLayout, Header）
│   ├── routes/        # TanStack Router file-based routes（route 定義のみの薄いファイル。app/pages を参照）
│   ├── pages/         # FSD pages レイヤー（画面本体、URL セグメント単位のスライス）
│   └── shared/        # FSD shared レイヤー：ui（shadcn/ui）、lib（cn, msw ヘルパー, 日時）, api（hc・auth クライアント）
└── shared/            # worker/react-app 共通コード（FSD の shared レイヤーとは別概念。混同注意）
    └── schemas/       # zod スキーマと定数（タグ・区分の単一の定義元）
```

- 新規 API route → `src/worker/routes/` に追加し `src/worker/index.ts` に `.route()` でマウント
- 新規ページ → `src/react-app/pages/<page-name>/ui/` に画面本体を実装し、`src/react-app/routes/` に薄い route 定義ファイルを追加して参照する（詳細は `fsd` skill）
- `pages/<slice>/` の構成は FSD に従い、`steiger`（`pnpm lint` に含む）が構造違反を検出する
- story / MSW モックは画面本体ファイルの隣（`pages/<slice>/ui/`）に `*.stories.tsx` / `*.mock.ts`
- UI キット・共通ユーティリティ・API クライアントは `src/react-app/shared/` に置き、`index.ts`（public API）経由で import する
- タグ（`REVIEW_TAGS`）や区分（`SAKE_CATEGORIES`）は `src/shared/schemas/sake.ts` だけに定義する（旧実装は 3 箇所に散ってドリフトしていた）

### レイヤー規約（`.dependency-cruiser.mjs` で機械的に検査）

| 禁止する向き                         | 理由                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `src/shared` → `src/worker`          | shared は両方から読まれる土台。DTO と定数だけに保つ                                               |
| `src/shared` → `src/react-app`       | shared は UI を知らない                                                                           |
| `src/worker` → `src/react-app`       | Workers のバンドルに React が入る                                                                 |
| `src/react-app` → `src/worker`       | **`import type` だけ許可**（Hono RPC の型）。値を import すると worker の実装がクライアントに入る |
| `src/worker/repositories` → `routes` | データアクセスが HTTP 層を知ってはいけない                                                        |
| 循環依存                             | 共通部分を切り出して一方向にする                                                                  |

## 認証とアカウント（Better Auth + Google）

- サインインは **Google だけ**。許可リストに載った Google アカウントしかサインインできない
- 許可リストは 2 段構え
  1. 環境変数 `ALLOWED_EMAILS`（カンマ区切り）— **最初の 1 アカウント（オーナー）を作るためのブートストラップ**
  2. D1 の `allowed_emails` テーブル — オーナーがアプリ内の「メンバー」画面から追加する分
- 最初にサインインしたユーザーが `user.role = 'owner'` になる。オーナーだけがメンバーを追加・削除できる
- 許可されていないアカウントは `user.validateUserInfo` が拒否し、`/sign-in?error=access_denied` に戻る
  （`worker/` の `ACCESS_DENIED_ERROR` と `pages/sign-in` の文言を揃える）
- オーナーは許可リストから外しても締め出されない（`findUserByEmail` の role を見て通す）
- route の保護は `src/worker/auth/middleware.ts` の `sessionMiddleware` → `requireAuth` / `requireOwner`
  - middleware が返す 401 / 403 は Hono RPC の型に現れない。クライアントは `res.status` で分岐する
- 自分のロールはセッションの型に載せていないので、`GET /api/members` が返す `canManage` とメンバー一覧を使う
- 初回サインイン後は `/welcome` でニックネームを決める（`user.nickname`）。未登録のまま他の画面を開くと
  `routes/__root.tsx` の `beforeLoad` が `/welcome` に飛ばす
- アプリ内の表示名は **`nickname ?? name`**（worker 側は `coalesce(nickname, name)`）。Google の名前は表示に使わない
- ニックネームの検証は `src/shared/schemas/profile.ts` の zod スキーマを、フォームと
  `additionalFields.nickname.validator` の両方で使う（`input: true` なので `authClient.updateUser` で設定できる）

## データベース（D1 + Drizzle）

- **`src/worker/db/schema.ts` がマイグレーションの source of truth**。`drizzle/` はコミット対象
- `drizzle/` の出力先（`drizzle.config.ts` の `out`）と `wrangler.json` の `migrations_dir` は必ず一致させる
- `src/worker/db/auth-schema.ts` は better-auth のテーブル定義。better-auth を上げたら
  `node_modules/@better-auth/core/dist/db/get-tables.mjs` と差分を確認する（実行時にもスキーマ検証が走る）
- **db インスタンスをモジュールトップで作らない**。Workers の `env` はリクエストスコープなので、
  ハンドラの中で `createDb(c.env)` / `createAuth(c.env)` と都度生成する
- 時刻は `integer(..., { mode: 'timestamp_ms' })` で持つ（秒精度の text は同一秒内の並びが定まらない）
- `WHERE` / `ORDER BY` に使う列には `index()` を張る（D1 は読み取り行数で課金される）。一覧系には必ず `.limit()`
- レビューは `UNIQUE(user_id, sake_id)` で 1 人 1 銘柄 1 件。重複投稿は 409 を返し、訂正は PUT で行う
- タイムラインのカーソルは `<epoch ミリ秒>_<review id>` の複合（同一ミリ秒の取りこぼし防止）
- **マスタ（銘柄）の編集はサインインしていれば誰でもできる**（`PUT /api/sakes/:id`。身内で使うアプリなので権限を分けない）
- `sakes.paid_tasting_price` は会場で手入力する前提の nullable。未入力は `null`（「無料」とは区別しない）
- マスタ（酒蔵 82・銘柄 563）は `db/seed-breweries.sql` / `db/seed-sakes.sql`。旧アプリの seed を移植したもので、
  `paid_tasting_price` の値（NULL / 7）は金額として使えなかったため取り込んでいない

## テストの書き分け

| 対象                                            | 書き方                    |
| ----------------------------------------------- | ------------------------- |
| Hono route                                      | `src/worker/**/*.test.ts` |
| コンポーネント・ページの描画 / 操作 / 状態分岐  | `*.stories.tsx` の `play` |
| util 関数・複雑な計算ロジック（DOM に触らない） | 対象の隣に `*.test.ts`    |

- UI のために `render()` する専用テストファイルは作らず story にする
- `src/react-app/**/*.test.ts` は Workers runtime で実行される（`tsconfig.test.json` が型を付ける）
- worker テストの DB は `src/worker/test/database.ts` の `resetDatabase()` / `insertTestUser()` を使う。
  セッションが要る route は `withSession(user)` で middleware を通す（Cookie 署名は通さない）
- story でセッションが要るときは `@/react-app/shared/lib` の `sessionHandlers` と
  `loaders: [refetchSession]` を使う（詳細は `storybook-testing` skill）

## ハマりどころ

- **Hono の method chain を切ると RPC の型が失われる**。route も `.route()` でのマウントも繋げたまま書く
- `:id` のようなパスパラメータに `zValidator('param', z.coerce.number())` を使うと Hono RPC の
  param 型が壊れる。route 側で `c.req.param('id')` を数値に変換する
- `routeTree.gen.ts` は自動生成だが**コミット対象**（手編集はしない）。route を足したら一度 build して再生成する
- `createAuth` をモジュールトップで呼ぶと落ちる（Workers ではモジュール評価時に `env` が無い）
- `better-auth/minimal` を使う（Drizzle adapter を使うので Kysely は不要。Worker のバンドルが小さくなる）
- `cf-typegen` は **`.dev.vars` が揃った状態で実行する**。無いと `Env` からシークレットが消え、コミット済みの
  `worker-configuration.d.ts` を壊す
- story 間で better-auth のセッションが持ち越される（`useSession` の nanostore キャッシュ）。
  `loaders: [refetchSession]` で捨てる。セッション待ちの UI は `findBy*` で待つ（`getBy*` だとフレーキーになる）
- `*.test.ts` は `tsconfig.app.json` の `exclude` に入れてある（vitest の型は `tsconfig.worker` /
  `tsconfig.test` 側で付ける）。`src/shared` にテストを足すときも同じ扱い

## 詳細情報

| 知りたいこと                                            | 参照先                                       |
| ------------------------------------------------------- | -------------------------------------------- |
| Hono RPC の型付け（`InferResponseType` / `zValidator`） | `docs/hono-rpc-types.md`                     |
| Worker のテスト                                         | `testing` skill                              |
| story / interaction test / MSW                          | `storybook-testing` skill                    |
| react-app のレイヤー構成（Feature-Sliced Design）       | `fsd` skill                                  |
| UI コンポーネント追加                                   | `shadcn-ui` skill, `docs/shadcn-ui-setup.md` |
| セットアップ（D1・Google OAuth・デプロイ）              | `README.md`                                  |
| 残タスクの移行計画（新しいセッションで着手する）        | `ai-out/plans.md`                            |
