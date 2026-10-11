# 認証とアカウント（Better Auth + Google）

## サインインと許可リスト

- サインインは **Google だけ**。許可リストに載った Google アカウントしかサインインできない
- 許可リストは 2 段構え
  1. 環境変数 `ALLOWED_EMAILS`（カンマ区切り）— **最初の 1 アカウント（オーナー）を作るためのブートストラップ**
  2. D1 の `allowed_emails` テーブル — オーナーがアプリ内の「メンバー」画面から追加する分
- 最初にサインインしたユーザーが `user.role = 'owner'` になる。オーナーだけがメンバーを追加・削除できる
- 許可されていないアカウントは `user.validateUserInfo` が拒否し、`/sign-in?error=access_denied` に戻る
  （`src/worker/auth` の `ACCESS_DENIED_ERROR` と `pages/sign-in` の文言を揃える）
- オーナーは許可リストから外しても締め出されない（`findUserByEmail` の role を見て通す）

## route の保護

`src/worker/auth/middleware.ts` の `sessionMiddleware` → `requireAuth` / `requireOwner` の順に使う。

- middleware が返す 401 / 403 は Hono RPC の型に現れない。クライアントは `res.status` で分岐する
- 自分のロールはセッションの型に載せていないので、`GET /api/members` が返す `canManage` とメンバー一覧を使う

## ニックネーム

- 初回サインイン後は `/welcome` でニックネームを決める（`user.nickname`）。未登録のまま他の画面を開くと
  `routes/__root.tsx` の `beforeLoad` が `/welcome` に飛ばす
- アプリ内の表示名は **`nickname ?? name`**（worker 側は `coalesce(nickname, name)`）。Google の名前は表示に使わない
- 検証は `src/shared/schemas/profile.ts` の zod スキーマを、フォームと `additionalFields.nickname.validator` の
  両方で使う（`input: true` なので `authClient.updateUser` で設定できる）

## ハマりどころ

- **`createAuth` をモジュールトップで呼ぶと落ちる**。Workers ではモジュール評価時に `env` が無いので、
  ハンドラの中で `createAuth(c.env)` と都度生成する
- `better-auth/minimal` を使う（Drizzle adapter を使うので Kysely は不要。Worker のバンドルが小さくなる）
- better-auth を上げたら `src/worker/db/auth-schema.ts` と
  `node_modules/@better-auth/core/dist/db/get-tables.mjs` の差分を確認する（実行時にもスキーマ検証が走る）
