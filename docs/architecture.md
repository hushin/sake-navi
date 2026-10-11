# アーキテクチャ — 配置と依存の向き

Workers 1 つに Hono API と React SPA を同居させている。`src/` は 3 つに分かれる。

- `src/worker/` — Hono API。entrypoint は `src/worker/index.ts`（`wrangler.json` の `main`）
- `src/react-app/` — React SPA。Feature-Sliced Design の app / pages / shared レイヤー
- `src/shared/` — worker と react-app が共有する zod スキーマと定数。**FSD の shared レイヤーとは別概念**

## 何をどこに置くか

- 新しい API route → `src/worker/routes/` に追加し、`src/worker/index.ts` に `.route()` でマウントする
- SQL（データアクセス） → `src/worker/repositories/` に閉じ込める
- 新しい画面 → `src/react-app/pages/<slice>/ui/` に実装し、`src/react-app/routes/` に薄い route 定義を足す（詳細は `fsd` skill）
- UI キット・共通ユーティリティ・API クライアント → `src/react-app/shared/` に置き、`index.ts`（public API）経由で import する
- タグ（`REVIEW_TAGS`）や区分（`SAKE_CATEGORIES`） → `src/shared/schemas/sake.ts` **だけ**に定義する（旧実装は 3 箇所に散ってドリフトしていた）
- story / MSW モック → 画面本体の隣（`pages/<slice>/ui/`）に `*.stories.tsx` / `*.mock.ts`

## worker のディレクトリ

- `src/worker/auth/` — Better Auth。`options`（共通設定）/ `index`（`createAuth`）/ `middleware`（session・requireAuth・requireOwner）
- `src/worker/db/` — Drizzle。`schema.ts`（アプリのテーブル）/ `auth-schema.ts`（better-auth のテーブル）

## 依存の向き（`.dependency-cruiser.mjs` が機械的に検査）

| 禁止する向き                         | 理由                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `src/shared` → `src/worker`          | shared は両方から読まれる土台。DTO と定数だけに保つ                                               |
| `src/shared` → `src/react-app`       | shared は UI を知らない                                                                           |
| `src/worker` → `src/react-app`       | Workers のバンドルに React が入る                                                                 |
| `src/react-app` → `src/worker`       | **`import type` だけ許可**（Hono RPC の型）。値を import すると worker の実装がクライアントに入る |
| `src/worker/repositories` → `routes` | データアクセスが HTTP 層を知ってはいけない                                                        |
| 循環依存                             | 共通部分を切り出して一方向にする                                                                  |

## 生成物（手で編集しない）

- `routeTree.gen.ts` — TanStack Router の自動生成だが**コミット対象**。route を足したら一度 build して再生成する
- `worker-configuration.d.ts` — `pnpm cf-typegen` の生成物。**`.dev.vars` を揃えてから実行する**。
  無いと `Env` からシークレットが消え、コミット済みの内容を壊す

## Hono route を足すとき

RPC の型が壊れる典型的な原因（method chain / `.route()` のパス / `:id` の param）と型の導出方法は
[`docs/hono-rpc-types.md`](./hono-rpc-types.md) にまとめてある。
