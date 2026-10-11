# 酒ナビ（sake-navi）

にいがた酒の陣で飲んだ日本酒のレビューを、友人グループで共有する Web アプリ。
会場の出品酒から銘柄を選び、星 5 段階＋タグ＋コメントで記録して、
タイムラインでみんなの投稿を追いかける。スマホ片手での利用が前提。

## 構成

- **worker** `src/worker/` — Hono 4 の API。entrypoint は `src/worker/index.ts`
- **react-app** `src/react-app/` — React 19 + Vite 8 の SPA。Feature-Sliced Design（app / pages / shared）
- **shared** `src/shared/` — worker と react-app が共有する zod スキーマと定数（FSD の shared レイヤーとは別物）
- スタック: TanStack Router・Form・Query / shadcn/ui（base UI）+ Tailwind v4 / zod / D1 + Drizzle ORM /
  Better Auth（Google）/ Vitest + Storybook 10 / oxlint + oxfmt

## 作業のルール

- パッケージマネージャは **pnpm**（npm ではない）。ツールは mise 管理（Node 24 / pnpm 12）
- **変更が一区切りしたら `pnpm check` と `pnpm test` を通す**（oxlint が型チェックも行うので型エラーまで拾える）
- lint / format は lefthook が pre-commit で回す。コミットメッセージは Conventional Commits
- 生成物（`worker-configuration.d.ts` / `routeTree.gen.ts` / `drizzle/`）は手で編集しない
- シークレットは `.dev.vars` / `wrangler secret put`（コミット禁止）。公開設定は `wrangler.json` の `vars`
- 開発サーバは `pnpm dev`（:5173）、Storybook は `pnpm storybook`（:6006）。他のコマンドは `package.json` を見る

## 詳細（その作業に関係するものだけ読む）

| 知りたいこと                                        | 参照先                   |
| --------------------------------------------------- | ------------------------ |
| API route の追加、依存の向き、生成物                | `docs/architecture.md`   |
| サインイン・許可リスト・ロール・ニックネーム        | `docs/auth.md`           |
| D1 / Drizzle / マイグレーション / seed              | `docs/database.md`       |
| Hono RPC の型（`InferResponseType` / `zValidator`） | `docs/hono-rpc-types.md` |
| セットアップ（D1・Google OAuth・デプロイ）          | `README.md`              |

画面・遷移・コンポーネント・テストの追加は skill に分けてある
（`fsd` / `tanstack-router` / `testing` / `storybook-testing` / `shadcn-ui`）。
