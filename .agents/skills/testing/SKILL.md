---
name: testing
description: Use when writing or modifying vitest tests for Cloudflare Workers + Hono routes. Covers @cloudflare/vitest-plugin setup, app.request() pattern, env from cloudflare:test, zod response validation, module state reset for test isolation, and tsconfig type setup. Trigger when the user asks to write/add tests, add testing, or mentions vitest/sakes.test.ts patterns.
---

# Testing Skill — Cloudflare Workers + Hono + Vitest

このプロジェクトでのテストの書き方・設定の規約。

`*.test.ts` は置き場所にかかわらずこの worker プロジェクト（Workers runtime）で実行される。
Hono route のテストに加えて、**DOM に触らない util 関数や計算ロジック**（`src/react-app/` 配下の
ものを含む）もここに書く。DOM を伴う UI のテストは story として書く（`storybook-testing` skill）。

## 構成

```
vitest.config.ts                  # Cloudflare Workers pool 設定
src/worker/routes/*.test.ts      # テストファイル（route と同階層）
tsconfig.worker.json             # vitest/globals, cloudflare:test の型を追加済
```

## vitest.config.ts（雛形）

テストはすべて `@cloudflare/vitest-plugin` の `cloudflareTest` プラグイン経由で Workers runtime 上で実行される。`@/` エイリアス解決のため `resolve.alias` も必須。

```ts
import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.json' },
    }),
  ],
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
```

`globals: true` により `describe` / `it` / `expect` / `beforeEach` は import 不要。

## テストファイルの基本形

```ts
import { env } from 'cloudflare:test';
import app from './sakes';

describe('sakes routes', () => {
  it('GET / returns 200', async () => {
    const res = await app.request('/', {}, env);
    expect(res.status).toBe(200);
  });
});
```

- `env` は `cloudflare:test` から import し、`app.request()` の第3引数に必ず渡す
- route の Hono app は default export されている前提（`export default app`）
- テスト対象の route app を直接 import してテストする（`/api` prefix は付かない）

## レスポンスのバリデーション

`res.json()` の戻り値は `unknown` のため、zod スキーマでパースして型安全に扱う。

```ts
import { z } from 'zod';

const todoSchema = z.object({ id: z.string(), title: z.string() });
const todosSchema = z.array(todoSchema);

const todo = todoSchema.parse(await res.json()); // 単体
const todos = todosSchema.parse(await res.json()); // 配列
```

`as` による型アサーションは使わない（oxlint `no-unsafe-type-assertion` エラーになる）。

## テスト間の状態分離

このアプリの状態は D1 に載っているので、`beforeEach` でテーブルを空にする。
リセットは `src/worker/test/database.ts` の `resetDatabase()` にまとめてある（子テーブルから消す）。

```ts
import { resetDatabase, testDb, insertTestUser } from '../test/database';

describe('sakes routes', () => {
  beforeEach(async () => {
    await resetDatabase();
    await testDb().insert(breweries).values({ id: 1, name: '関原酒造', mapColumn: 14, mapRow: 6 });
    await testDb().insert(sakes).values({ id: 1, breweryId: 1, name: '雪中貯蔵 純米生原酒' });
  });
  // ...
});
```

- API 経由で DELETE をループしてクリアする方式は避ける（テストが API の正常動作に依存してしまう）
- テーブルを増やしたら `resetDatabase()` の削除対象にも追加する（消し忘れは他テストへの汚染になる）

## 認証が要る route のテスト

セッション Cookie の署名は通さず、middleware を差し替えて「サインイン済み」の状態を作る。
実際のセッション解決（401 の判定）は `src/worker/auth/middleware.test.ts` で確認している。

```ts
import { Hono } from 'hono';
import { type AuthEnv } from '../auth/middleware';
import { insertTestUser, withSession } from '../test/database';

const user = await insertTestUser(testDb(), {
  id: 'user-owner',
  name: '新潟 花子',
  email: 'owner@example.com',
  role: 'owner',
});

const app = new Hono<AuthEnv>().use('*', withSession(user)).route('/sakes', sakesRoute);
await app.request('/sakes/1/reviews', { method: 'POST', ... }, env);
```

外部キー（`reviews.user_id` など）があるので、ユーザー行は必ず作ってから使う。

## D1 を使う route のテスト

```ts
import { env } from 'cloudflare:test';

beforeEach(async () => {
  await env.DB.exec('DELETE FROM reviews\nDELETE FROM sakes\nDELETE FROM breweries');
});
```

- マイグレーションの適用は各テストではなく `setupFiles`（`src/worker/test/apply-migrations.ts`）で
  一度だけ行う。テスト本体に migration を書かない
- `env.DB.exec()` は複数文を `\n` 区切りで受け取れるが、prepared statement を使わないため
  **maintenance / one-shot 用**（公式ドキュメント）。テストの後片付けはこの用途に当たるので `exec` で問題ない
- テスト用のバインディング（`TEST_MIGRATIONS` や better-auth のシークレット）は
  `vitest.config.ts` の `miniflare.bindings` で渡す。`.dev.vars` に依存させない（CI には無い）

## tsconfig

`tsconfig.worker.json` の `types` に以下2つが追加済であること：

```json
"types": [
  "vitest/globals",
  "@cloudflare/vitest-plugin/types"
]
```

- `vitest/globals` → `describe` / `it` / `expect` 等のグローバル型
- `@cloudflare/vitest-plugin/types` → `cloudflare:test` モジュールの型

## 実行

```bash
pnpm test          # vitest run（CI / 1回実行）
```

watch モードは使わない。
