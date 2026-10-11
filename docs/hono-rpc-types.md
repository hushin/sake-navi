# Hono RPC の型安全ガイド

## レスポンス型は `InferResponseType` で導出する

ローカルに interface を書いて `as unknown as T` でキャストすると unsafe な型アサーションになる。
Hono route のレスポンス型から直接導出する。

```typescript
import type { InferResponseType } from 'hono/client';
import { client } from '@/react-app/shared/api';

// GET /api/sakes の 200 レスポンス
type SakesData = InferResponseType<(typeof client.api.sakes)['$get'], 200>;
// 配列・ネストしたフィールドの要素型
type Sake = SakesData['items'][number];

const res = await client.api.sakes.$get();
const data = await res.json(); // キャスト不要
```

- `c.json()` が複数ある route では第 2 引数にステータスコード（`200` など）を渡し、成功レスポンスだけを抜く
- `item.status` のようなリテラル型がそのまま伝わる（ローカル interface だと `string` に広がる）
- method chain（`.get().post()`）で定義した route でも正しく動く
- エラーレスポンスとのユニオンになる場合は単一の型アサーション（`as SakesData`）で narrow できる
  （`any` / `unknown` からのアサーションではないので lint 違反にならない）

## 型が壊れるときの原因

- **`.route()` の第 1 引数はリテラルで書く**。`string` 型の式（関数の戻り値・テンプレートリテラル）を渡すと
  パス型が `${string}` になり、別のルートの型に解決されることがある

  ```typescript
  // NG: 戻り値が string 型 → RPC 型解決が壊れる
  .route(`/${getApiPath('sakes')}`, sakesRoute)

  // OK
  .route('/sakes', sakesRoute)
  ```

- **method chain を切らない**。route も `.route()` でのマウントも繋げたまま書く
- **`:id` の param に `zValidator('param', z.coerce.number())` を使わない**。param 型が壊れるので、
  route 側で `c.req.param('id')` を数値に変換する
- 動的キー `client.api[path]` でエンドポイントを切り替えず、`switch` で明示的に呼び分ける

## リクエストは `@hono/zod-validator` で検証する

手動チェック + `as unknown as T` ではなく、zod スキーマをミドルウェアとして挿入する。

```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const postBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

app.post('/', zValidator('json', postBodySchema), (c) => {
  const body = c.req.valid('json'); // zod から推論された型
  // ...
});
```

- バリデーションルールと型定義が一元管理され、`hc` クライアントにもリクエストボディの型が伝播する
- zod の `.email()` / `.enum()` / `.refine()` などで詳細な検証ができる
- バリデーションエラー時は `{ success: false, error: { issues: [...] } }` 形式のレスポンスが自動で返る。
  フロントで詳細なエラーメッセージを出したい場合は別途対応が要る
