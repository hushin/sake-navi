# データベース（D1 + Drizzle）

## コマンド

```bash
pnpm db:generate      # src/worker/db/schema.ts の差分から drizzle/ に SQL を生成
pnpm db:migrate:local # ローカル D1 に migration を適用
pnpm db:seed:local    # 酒蔵・銘柄のマスタをローカル D1 に入れる
pnpm db:migrate       # 本番 D1 に migration を適用（--remote）
pnpm db:seed          # 本番 D1 にマスタを入れる（--remote）
```

## スキーマ

- **`src/worker/db/schema.ts` がマイグレーションの source of truth**。生成物 `drizzle/` はコミット対象
- `drizzle/` の出力先（`drizzle.config.ts` の `out`）と `wrangler.json` の `migrations_dir` は必ず一致させる
- 時刻は `integer(..., { mode: 'timestamp_ms' })` で持つ（秒精度の text は同一秒内の並びが定まらない）
- `WHERE` / `ORDER BY` に使う列には `index()` を張る（D1 は読み取り行数で課金される）。一覧系には必ず `.limit()`

## データモデルの約束

- レビューは `UNIQUE(user_id, sake_id)` で 1 人 1 銘柄 1 件。重複投稿は 409 を返し、訂正は PUT で行う
- `reviews.rating` は `real`（REAL）型で、1〜5 を 0.25 刻み（`RATING_MIN` / `RATING_MAX` / `RATING_STEP`）。`4.25` のような小数になる
- タイムラインのカーソルは `<epoch ミリ秒>_<review id>` の複合（同一ミリ秒の取りこぼし防止）
- 評価順（`sort=rating`）のカーソルは `<rating>_<epoch ミリ秒>_<review id>`。rating は小数を取り得るので整数前提で解釈しない
- **マスタ（銘柄）の編集はサインインしていれば誰でもできる**（`PUT /api/sakes/:id`。身内で使うアプリなので権限を分けない）
- `sakes.paid_tasting_price` の意味は 3 つ。`null` = 有料試飲なし / `7` = **有料試飲あり（金額は未確認）** /
  それ以外 = その金額。`7` は出典 PDF で「有料試飲」とだけ書かれていたものに付いていた印で、金額ではない
  - 生の値をそのまま表示せず、必ず `parsePaidTasting`（`src/shared/schemas/sake.ts`）を通して解釈する。
    画面のバッジは `PaidTastingBadge`（`src/react-app/shared/ui`）に集約してある
  - 編集フォームは「有料試飲あり」のチェックと金額を分けて入力し、チェックだけなら `7` を保存する
    （`toSakeEditInput` / `toSakeUpdateInput`）
- マスタ（酒蔵 82・銘柄 563）は `db/seed-breweries.sql` / `db/seed-sakes.sql`

## ハマりどころ

- **db インスタンスをモジュールトップで作らない**。Workers の `env` はリクエストスコープなので、
  ハンドラの中で `createDb(c.env)` / `createAuth(c.env)` と都度生成する
