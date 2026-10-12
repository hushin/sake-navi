---
name: tanstack-router
description: Use when adding, moving, or reviewing routes, page navigation, and route-level data loading in the React app. Covers TanStack Router file-based routing (files under src/react-app/routes, createFileRoute, routeTree.gen.ts regeneration), file-name nesting and the `_` escape, URL search params (validateSearch with a zod v4 schema / Route.useSearch / Link search), loaders with TanStack Query (router context wiring, queryClient.query, defaultPreloadStaleTime, when a loader is worth it), beforeLoad redirect guards, Link / useNavigate / useParams / useSearch type safety, automatic code splitting, and why Storybook stories cannot catch routing mistakes. Trigger when the user mentions TanStack Router, route, createFileRoute, routeTree, loader, preload, queryClient, page, ページ遷移, search params, validateSearch, beforeLoad, redirect, Link, useNavigate, Outlet, or asks to add or move a screen.
---

# TanStack Router — このリポジトリのルーティング

型は**すべて推論**される。`useSearch()` / `useParams()` の戻り値に注釈やキャストを付けない。
ルーターは**クライアントファースト**（loader は既定でクライアント実行。Server Component の API と混同しない）。
公式のエージェント向けスキルが `@tanstack/router-core` の `skills/router-core/` に同梱されている
（pnpm の isolated linker なので `node_modules/.pnpm/@tanstack+router-core@*/node_modules/@tanstack/router-core/skills/router-core/`。
search-params / path-params / navigation / data-loading / auth-and-guards / code-splitting /
not-found-and-errors / type-safety / ssr の各 `SKILL.md`）。深く知りたくなったらそちらを読む。

## 環境（設定が正）

- `vite.config.ts` の `tanstackRouter()` が `@vitejs/plugin-react` より前にあり、`autoCodeSplitting: true` /
  `routesDirectory: './src/react-app/routes'` / `generatedRouteTree: './src/react-app/routeTree.gen.ts'` /
  `routeFileIgnorePattern: '\\.(stories|mock)\\.'`（story・mock をルートにしない）で動いている
- `src/react-app/routeTree.gen.ts` は**生成物**。`pnpm dev` / `vite build` が更新する。手で編集しない（コミット対象）
- `src/react-app/app/bootstrap/router.ts` の `declare module` が `Link` / `useNavigate` の型を作る。消さない
- `createRouter` に渡しているのは `routeTree` だけ。`queryClient` はまだ router context に載っていない（loader の節）
- 画面本体は `pages/<slice>/ui/` に置き、route ファイルはそれを参照するだけ（`fsd` skill）

## ルートファイルを足す

```tsx
// src/react-app/routes/sakes_.$sakeId.tsx
import { createFileRoute } from '@tanstack/react-router';
import { SakeDetailPage } from '@/react-app/pages/sake-detail';

export const Route = createFileRoute('/sakes_/$sakeId')({
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
- route の値（search / params）は route ファイル内の非 export コンポーネントが読んで、画面へ **props** で渡す。
  画面（`pages/`）は named export して story から描く（`storybook-testing` skill）。route の値を画面が読まないので、
  story は props を渡すだけで済む
- 深い子コンポーネントで route の search / params が要るときも `pages/` で `Route` を import しない。
  `useSearch({ from: '/sakes' })` か `getRouteApi('/sakes')` を使う（公式の code splitting ガイドが
  `Route` の直接 import を避けろと言っている）

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
- `from` に渡すのは URL ではなく **route id**。`_` は id に残る（`sakes_.$sakeId.tsx` の id は `/sakes_/$sakeId`）

## search params（URL が状態を持つ）

フィルタや並び順は URL に置く。`/sakes` / `/reviews` / `/map` が実例。

```tsx
// 目標の形。いまの /reviews は手書きの正規化関数で、新規画面はこの形で書く
import { z } from 'zod';
import { reviewSortSchema } from '@/shared/schemas/sake';

export const Route = createFileRoute('/reviews')({
  // zod v4 はスキーマをそのまま渡せる（@tanstack/zod-adapter は zod v3 の話）
  // search params は JSON-first: ?mine=true は boolean、?page=2 は number で来る（z.coerce は不要）
  validateSearch: z.object({
    // JSON として読めない値は文字列のまま届くので、壊れた URL は .catch() で既定値に落とす
    sort: reviewSortSchema.catch('rating'),
    tags: z.string().min(1).optional().catch(undefined),
    // 真偽フラグは true だけを残す（false も壊れた値も URL から消える。JSON-first なので文字列 'true' は来ない）
    mine: z.literal(true).optional().catch(undefined),
  }),
});
```

- `validateSearch` は**必ず同じ形**を返す。不正値は既定値（`.catch('rating')`）か `undefined` に落とす。
  `undefined` にした値は URL から消える
- 手書きの正規化関数（`/sakes` / `/reviews` / `/map` / `/sign-in`）も考え方は同じ。新しい画面は上の zod の形で書き、
  触った画面から寄せていく
- 読むときは `Route.useSearch()`。`Route.useParams()` と同じく、注釈も `as` も付けない
- 必須キーが残る search へリンクするときは `search` を渡す（例: `/reviews` へは `search={{ sort: 'rating' }}`。
  渡さないと `MakeRequiredSearchParams` の型エラーになる）
- 書き換えは全置換の `search={{ ...search, sort: 'latest' }}`、既存を保つなら `search={(prev) => ({ ...prev, ... })}`。
  フィルタ更新は `navigate({ to, search, replace: true })`

## loader（未導入）と TanStack Query

loader はまだ 1 つも無い。データは画面の `useQuery` / `useInfiniteQuery` が取り、`isPending` で骨組みを出している。
loader に寄せられるのは**単票の詳細**（`/sakes_/$sakeId`、`/breweries/$breweryId`）で、遷移が始まった時点で
キャッシュが温まる。一覧系（`/sakes` / `/reviews` / `/timeline`）は cursor ページングの `useInfiniteQuery` なので、
同じことをするなら `queryClient.prefetchInfiniteQuery` が要る（`query` では温まらない）。
入れると決めたときの形だけ書く。

### 配線（先にこれが要る）

`createRootRoute` に context が無く、`queryClient` は `AppProviders.tsx` の中の const なので、
いま `context.queryClient` を読むと型エラーになる。先に次の 4 箇所を変える。

```tsx
// src/react-app/app/bootstrap/query-client.ts（新規）
export const queryClient = new QueryClient();

// src/react-app/routes/__root.tsx
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // 既存の beforeLoad（セッション + ニックネームのガード）はここに残す
  component: RootLayout,
});

// src/react-app/app/bootstrap/router.ts — declare module の Register もそのまま残す
export const router = createRouter({
  routeTree,
  context: { queryClient },
  // 既定 30 秒の preload キャッシュに、Query の鮮度判断を横取りさせない
  defaultPreloadStaleTime: 0,
});
```

`AppProviders.tsx` は同じ `queryClient`（`query-client.ts`）を `QueryClientProvider` に渡す。
別インスタンスを作ると loader と画面が別のキャッシュを見て二重取得になる。

### 正解の形

```tsx
// src/react-app/routes/sakes_.$sakeId.tsx
loader: ({ context, params }) =>
  context.queryClient.query({ ...sakeQuery(Number(params.sakeId)), staleTime: 'static' }),
component: SakeDetailRoute,
```

- `queryClient.query({ ...queryOptions, staleTime: 'static' })` が現行の形。`ensureQueryData` / `prefetchQuery` は
  TanStack Query v6 で消える非推奨（訓練データではこちらを書きがち）。`'static'` は「データが入っていれば常に新鮮、
  空なら取得」の意味
- loader と画面は**同じ `queryOptions`** を共有する（loader が温め、画面の `useQuery` が同じキーを購読する）。
  置き場は `pages/<slice>/api/`、`index.ts` から公開（切り出しの判断は `fsd` skill）
- search で内容が決まる route は `loaderDeps` にキャッシュキーへ入れる値だけを宣言する
  （`({ search }) => search` にすると無関係な変更でも再取得する）
- `validateSearch` / `loaderDeps` / `loader` は分割されず main bundle に残る。重い import を持ち込まない
- 先読みは既定では起きない。`defaultPreload: 'intent'` か `Link` の `preload="intent"` を書いて初めて hover で走る

### どこまで loader にするか

軸は「最初の描画にデータが要るか」。配線はグローバルでも loader は route 単位なので、必要な route にだけ入れてよい。

- loader に寄せる: URL の params / search で内容が決まる単票
- `useQuery` のままでよい: 操作のあとに初めて取るデータ、最初の描画に要らない補助データ（`isPending` の骨組みで足りる）
- 主要データを loader、補助データを `useQuery` という混在は普通の選択
- loader が落ちたあとの再試行は `router.invalidate()`。error boundary の `reset()` では loader が再実行されない

## beforeLoad のガード

- `routes/__root.tsx` の `beforeLoad` がセッションとニックネームを見る。
  **公開したい画面は `PUBLIC_PATHS`、ニックネーム登録前に開く画面は `NICKNAME_EXEMPT_PATHS` に足す**
- `throw redirect({ to: '/sign-in' })` で飛ばす。component 内でチェックすると保護画面が一瞬見える
- `beforeLoad` は React component ではない（hooks を呼べない）。`try/catch` で囲むなら
  `isRedirect(error)` を再 throw して redirect を握りつぶさない
- ガードは**画面の話**。API の保護は worker 側の `requireAuth` / `requireOwner` が担う（ガードを当てにしない）
- session を loader にも配るなら router context に載せる。`createRootRouteWithContext` に `auth` を足し、
  `createRouter` の context には初期値（live 値には `undefined!` の印）を置いて、live な値は
  `<RouterProvider router={router} context={{ auth }} />` から注入する（router は作り直さない）
- context が変わっただけでは loader は走り直さない。セッションが変わったら `router.invalidate()` を呼ぶ

## 型安全

- `to` にパラメータを文字列で埋め込まない。`to="/sakes/$sakeId" params={{ sakeId: String(id) }}` を使う
  （``to={`/sakes/${id}`}`` は型安全もエンコードも壊す）
- ルート外のコンポーネントからは `useSearch({ from: '/sakes' })` / `useParams({ from: '/sakes_/$sakeId' })`
- 画面をまたいで使うコンポーネントは `from` を union で受ける（`{ from: '/a/$id' | '/b/$id' }`）。
  `strict: false` は型が粗くなるので使わない

## 検証

- route を足したら、**先に `pnpm exec vite build`（または `pnpm dev` の起動）で `routeTree.gen.ts` を再生成する**。
  生成前に型チェックを走らせると「そんなルートは無い」で落ちる
- 生成が失敗しても `vite build` は exit 0 で終わり、`routeTree.gen.ts` が古いまま残ることがある（パス重複など）。
  生成物が実際に更新されたかも見る
- そのうえで `pnpm check`（型チェック・FSD 構造検査・format・`wrangler deploy --dry-run`）
- **story は実ルートを持たない**（`@storybook/tanstack-react` の合成ルーターに載る）ので、
  ネスト・遷移・search の反映・loader の発火は検出できない。`pnpm dev` で実際にクリックして確かめる
- 画面の見た目・操作は `pages/<slice>/ui/` に colocation した story で検証する（`storybook-testing` skill）
- ナビの active 表示は `Link` が付ける `data-status="active"` に乗っている（`Header.tsx` の
  `data-[status=active]:`）。自前のナビを作るときもこれに合わせる
