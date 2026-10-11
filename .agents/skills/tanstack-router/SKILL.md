---
name: tanstack-router
description: Use when adding, moving, or reviewing routes and page navigation in the React app. Covers TanStack Router file-based routing (files under src/react-app/routes, createFileRoute, routeTree.gen.ts regeneration), file-name nesting and the `_` escape, URL search params (validateSearch / Route.useSearch / Link search), beforeLoad redirect guards, Link / useNavigate / useParams / useSearch type safety, automatic code splitting, and why Storybook stories cannot catch routing mistakes. Trigger when the user mentions TanStack Router, route, createFileRoute, routeTree, page, ページ遷移, search params, validateSearch, beforeLoad, redirect, Link, useNavigate, Outlet, 404, or asks to add or move a screen.
---

# TanStack Router — このリポジトリのルーティング

型は**すべて推論**される。`useSearch()` / `useParams()` の戻り値に注釈やキャストを付けない。
ルーターは**クライアントファースト**（loader は既定でクライアント実行。Server Component の API と混同しない）。
公式のエージェント向けスキルが `TanStack/router` リポジトリの `packages/router-core/skills/` にある
（search-params / path-params / navigation / data-loading / auth-and-guards / code-splitting /
not-found-and-errors / type-safety）。深く知りたくなったらそちらを読む。

## 環境（設定が正）

- `vite.config.ts` の `tanstackRouter()` が `@vitejs/plugin-react` より前にあり、`autoCodeSplitting: true` /
  `routesDirectory: './src/react-app/routes'` / `generatedRouteTree: './src/react-app/routeTree.gen.ts'` /
  `routeFileIgnorePattern: '\\.(stories|mock)\\.'`（story・mock をルートにしない）で動いている
- `src/react-app/routeTree.gen.ts` は**生成物**。`pnpm dev` / `vite build` が更新する。手で編集しない（コミット対象）
- `src/react-app/app/bootstrap/router.ts` の `declare module` が `Link` / `useNavigate` の型を作る。消さない
- 画面本体は `pages/<slice>/ui/` に置き、route ファイルはそれを参照するだけ（`fsd` skill）

## ルートファイルを足す

```tsx
// src/react-app/routes/sakes_.$sakeId.tsx
import { createFileRoute } from '@tanstack/react-router';
import { SakeDetailPage } from '@/react-app/pages/sake-detail';

export const Route = createFileRoute('/sakes/$sakeId')({
  component: SakeDetailRoute,
});

function SakeDetailRoute() {
  const { sakeId } = Route.useParams();
  return <SakeDetailPage sakeId={Number(sakeId)} />;
}
```

- `createFileRoute` のパス文字列は**ファイルの位置と一致**させる。文字列はプラグインが管理するので手で書き換えない
- route ファイルから export してよいのは `Route` だけ。component を export すると code splitting が効かなくなる
  （`pnpm dev` の URL に付く `?tsr-split=component` は自動分割の印で、異常ではない）

### ファイル名 → URL（ネストが罠）

| ファイル                        | URL                     | 補足                                                        |
| ------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `__root.tsx`                    | —                       | `app/layouts/RootLayout` が `<Outlet />` を持つ             |
| `index.tsx`                     | `/`                     |                                                             |
| `sakes.tsx`                     | `/sakes`                |                                                             |
| `sakes_.$sakeId.tsx`            | `/sakes/$sakeId`        | `_` で `/sakes` の**子にしない**（独立した画面はこちら）    |
| `sakes.$sakeId.tsx`             | `/sakes/$sakeId`        | `/sakes` の**子ルート**。親の `<Outlet />` 経由でしか出ない |
| `breweries.$breweryId.tsx`      | `/breweries/$breweryId` | 親ファイルが無いので独立                                    |
| `_layout.tsx` + `_layout/x.tsx` | `/x`                    | pathless layout（このリポジトリでは未使用）                 |

- 一覧と詳細のように並列の画面は **`_` を付けてネストを外す**。`sakes.$sakeId.tsx` のままだと
  `/sakes` の `<Outlet />` が無いので詳細が描画されず、URL だけ変わって一覧が残る（実際に起きた）
- レイアウト（ヘッダーやサイドバー）を挟みたいときだけ子ルートにする

## search params（URL が状態を持つ）

フィルタや並び順は URL に置く。`/sakes` / `/reviews` / `/map` が実例。

```tsx
export const Route = createFileRoute('/reviews')({
  validateSearch: (search: Record<string, unknown>): ReviewListSearch => ({
    sort: reviewSortSchema.safeParse(search.sort).success ? ... : 'rating',
    tags: typeof search.tags === 'string' && search.tags.length > 0 ? search.tags : undefined,
    mine: search.mine === 'true' || search.mine === true || undefined,
  }),
});
```

- `validateSearch` は必ず**同じ形**を返す。空文字や不正値は `undefined` に正規化する（URL から消したい値は `undefined`）
- 読むときは `Route.useSearch()`。`Route.useParams()` と同じく、注釈も `as` も付けない
- 必須キーが残る search へリンクするときは `search` を渡す（例: `/reviews` へは `search={{ sort: 'rating' }}`。
  渡さないと `MakeRequiredSearchParams` の型エラーになる）
- 書き換えは全置換の `search={{ ...search, sort: 'latest' }}`、既存を保つなら `search={(prev) => ({ ...prev, ... })}`。
  フィルタ更新は `navigate({ to, search, replace: true })`
- zod v4 なので `.catch()` が使える（`@tanstack/zod-adapter` の `fallback()` は zod v3 の話）

## beforeLoad のガード

- `routes/__root.tsx` の `beforeLoad` がセッションとニックネームを見る。
  **公開したい画面は `PUBLIC_PATHS`、ニックネーム登録前に開く画面は `NICKNAME_EXEMPT_PATHS` に足す**
- `throw redirect({ to: '/sign-in' })` で飛ばす。component 内でチェックすると保護画面が一瞬見える
- `beforeLoad` は React component ではない（hooks を呼べない）。`try/catch` で囲むなら
  `isRedirect(error)` を再 throw して redirect を握りつぶさない
- ガードは**画面の話**。API の保護は worker 側の `requireAuth` / `requireOwner` が担う（ガードを当てにしない）

## 型安全

- `to` にパラメータを文字列で埋め込まない。`to="/sakes/$sakeId" params={{ sakeId: String(id) }}` を使う
  （``to={`/sakes/${id}`}`` は型安全もエンコードも壊す）
- ルート外のコンポーネントからは `useSearch({ from: '/sakes' })` / `useParams({ from: '/sakes/$sakeId' })`
- 画面をまたいで使うコンポーネントは `from` を union で受ける（`{ from: '/a/$id' | '/b/$id' }`）。
  `strict: false` は型が粗くなるので使わない

## 検証

- route を足したら、**先に `pnpm exec vite build`（または `pnpm dev` の起動）で `routeTree.gen.ts` を再生成する**。
  生成前に型チェックを走らせると「そんなルートは無い」で落ちる
- そのうえで `pnpm check`（型チェック・FSD 構造検査・format・`wrangler deploy --dry-run`）
- **story は実ルートを持たない**（`@storybook/tanstack-react` の合成ルーターに載る）ので、
  ネスト・遷移・search の反映は検出できない。`pnpm dev` で実際にクリックして確かめる
- 画面の見た目・操作は `pages/<slice>/ui/` に colocation した story で検証する（`storybook-testing` skill）
