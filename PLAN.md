# 酒ナビ機能拡張 実装計画

各フェーズで並列で作業できるものはサブエージェント(モデルは Sonnet 4.5)で実行する

## 実装順序

| フェーズ                  | タスク                         | 状態 |
| ------------------------- | ------------------------------ | ---- |
| **Phase 1: スキーマ変更** |                                |      |
| 1-1                       | 酒に項目追加                   | [x]  |
| 1-2                       | ブックマーク機能(スキーマのみ) | [x]  |
| **Phase 2: CRUD完成**     |                                |      |
| 2-1                       | レビュー編集・削除             | [x]  |
| 2-2                       | 酒蔵ノート編集・削除           | [x]  |
| **Phase 3: 表示拡張**     |                                |      |
| 3-1                       | お酒追加入力拡張               | [x]  |
| 3-2                       | レビュー単体URL                | [x]  |
| 3-3                       | ブックマーク機能(UI)           | [x]  |
| **Phase 4: 一覧・検索**   |                                |      |
| 4-1                       | タイムラインpagination         | [x]  |
| 4-2                       | レビュー一覧ページ             | [x]  |
| **Phase 5: データ**       |                                |      |
| 5-1                       | demo用seed                     | [x]  |

---

## Phase 1: スキーマ変更

### 1-1. 酒に項目追加

**目的**: sakes テーブルに限定酒フラグ、有料試飲価格、区分を追加

**変更箇所:**

1. `src/server/db/schema.ts` - sakes テーブル拡張:

```typescript
export const sakes = sqliteTable(
  'sakes',
  {
    // ...既存フィールド
    isLimited: integer('is_limited', { mode: 'boolean' }).notNull().default(false),
    paidTastingPrice: integer('paid_tasting_price'), // null = 無料
    category: text('category').default('清酒'), // '清酒' | 'リキュール' | 'みりん' | 'その他'
  },
  // ...
);
```

2. `src/server/routes/breweries.ts` - GET /:id のレスポンスに新フィールド追加

3. `src/lib/api.ts` - Sake 型を更新:

```typescript
interface Sake {
  // ...既存
  isLimited: boolean;
  paidTastingPrice: number | null;
  category: string;
}
```

4. `src/app/brewery/[id]/page.tsx` - お酒カードに表示追加:
   - 限定酒バッジ（isLimited が true の場合）
   - 有料試飲価格（paidTastingPrice が null でない場合）
   - 区分表示

5. マイグレーション実行: `pnpm db:generate && pnpm db:migrate:local`

### 1-2. ブックマーク機能（スキーマのみ）

**目的**: bookmarks テーブルを追加

**変更箇所:**

1. `src/server/db/schema.ts` - bookmarks テーブル追加:

```typescript
export const bookmarks = sqliteTable(
  'bookmarks',
  {
    bookmarkId: integer('bookmark_id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.userId),
    sakeId: integer('sake_id')
      .notNull()
      .references(() => sakes.sakeId),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_bookmarks_user').on(table.userId),
    uniqueIndex('idx_bookmarks_unique').on(table.userId, table.sakeId),
  ],
);
```

2. マイグレーション実行: `pnpm db:generate && pnpm db:migrate:local`

---

## Phase 2: CRUD完成

### 2-1. レビュー編集・削除

**目的**: 自分のレビューを編集・削除可能にする

**変更箇所:**

1. `src/server/routes/sakes.ts` - エンドポイント追加:

```typescript
// PUT /api/sakes/:id/reviews/:reviewId - レビュー編集
sakesApp.put('/:id/reviews/:reviewId', async (c) => {
  const userId = c.req.header('X-User-Id');
  const reviewId = parseInt(c.get('reviewId'), 10);
  // レビューの所有者確認
  // 更新処理
});

// DELETE /api/sakes/:id/reviews/:reviewId - レビュー削除
sakesApp.delete('/:id/reviews/:reviewId', async (c) => {
  const userId = c.req.header('X-User-Id');
  const reviewId = parseInt(c.get('reviewId'), 10);
  // レビューの所有者確認
  // 削除処理
});
```

2. `src/lib/api.ts` - API関数追加:

```typescript
export async function updateReview(
  sakeId: number,
  reviewId: number,
  data: { rating: number; tags: string[]; comment?: string },
): Promise<void>;

export async function deleteReview(sakeId: number, reviewId: number): Promise<void>;
```

3. `src/app/brewery/[id]/page.tsx`:
   - 自分のレビューに編集・削除ボタン追加
   - 編集モーダル実装（StarRating, TagSelector を再利用）
   - 削除確認ダイアログ

### 2-2. 酒蔵ノート編集・削除

**目的**: 自分の酒蔵ノートを編集・削除可能にする

**変更箇所:**

1. `src/server/routes/breweries.ts` - エンドポイント追加:

```typescript
// PUT /api/breweries/:id/notes/:noteId
// DELETE /api/breweries/:id/notes/:noteId
```

2. `src/lib/api.ts` - API関数追加:

```typescript
export async function updateBreweryNote(
  breweryId: number,
  noteId: number,
  content: string,
): Promise<void>;
export async function deleteBreweryNote(breweryId: number, noteId: number): Promise<void>;
```

3. `src/app/brewery/[id]/page.tsx`:
   - 自分のノートに編集・削除ボタン追加
   - 編集モーダル
   - 削除確認ダイアログ

---

## Phase 3: 表示拡張

### 3-1. お酒追加入力拡張

**目的**: お酒追加時に名前以外の項目も入力可能に

**変更箇所:**

1. `src/server/routes/breweries.ts` - POST /:id/sakes のスキーマ拡張:

```typescript
const createSakeSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  isLimited: z.boolean().optional().default(false),
  paidTastingPrice: z.number().int().positive().optional(),
  category: z.enum(['清酒', 'リキュール', 'みりん', 'その他']).optional().default('清酒'),
});
```

2. `src/lib/api.ts` - addCustomSake のパラメータ拡張

3. `src/app/brewery/[id]/page.tsx` - お酒追加モーダルにフィールド追加:
   - 種類(type): テキスト入力
   - 限定酒(isLimited): チェックボックス
   - 有料試飲価格: 数値入力（任意）
   - 区分(category): セレクトボックス

### 3-2. レビュー単体URL

**目的**: レビュー単体に飛べるURLを作り、timelineから飛べるようにする

**変更箇所:**

1. `src/server/routes/sakes.ts` または新規 `src/server/routes/reviews.ts` - エンドポイント追加:

```typescript
// GET /api/reviews/:reviewId - レビュー単体取得
```

2. 新規 `src/app/review/[id]/page.tsx` - レビュー詳細ページ:
   - レビュー内容表示
   - お酒情報、酒蔵情報表示
   - 酒蔵ページへのリンク

3. `src/lib/api.ts` - getReviewById 追加

4. `src/app/timeline/page.tsx` - ReviewCard にリンク追加:

```tsx
<Link href={`/review/${item.reviewId}`}>詳細を見る</Link>
```

### 3-3. ブックマーク機能（UI）

**目的**: ブックマークのUI実装

**変更箇所:**

1. 新規 `src/server/routes/bookmarks.ts`:

```typescript
// GET /api/bookmarks - ブックマーク一覧（お酒情報付き）
// POST /api/bookmarks - ブックマーク追加 { sakeId: number }
// DELETE /api/bookmarks/:sakeId - ブックマーク削除
```

2. `src/server/index.ts` - bookmarks route 追加

3. `src/lib/api.ts` - ブックマーク関連関数:

```typescript
export async function getBookmarks(): Promise<BookmarkedSake[]>;
export async function addBookmark(sakeId: number): Promise<void>;
export async function removeBookmark(sakeId: number): Promise<void>;
```

4. 新規 `src/app/bookmarks/page.tsx` - ブックマーク一覧ページ

5. `src/app/brewery/[id]/page.tsx` - お酒カードにブックマークボタン追加

6. `src/components/UserMenu.tsx` - 「ブックマーク」リンク追加

---

## Phase 4: 一覧・検索

### 4-1. タイムラインpagination

**目的**: 1ページ20件、無限スクロール対応

**変更箇所:**

1. `src/server/routes/timeline.ts` - ページネーション対応:

```typescript
// GET /api/timeline?cursor=<createdAt>&limit=20
// レスポンス: { items: [...], nextCursor: string | null }
```

2. `src/lib/api.ts` - getTimeline 拡張:

```typescript
export async function getTimeline(
  cursor?: string,
  limit?: number,
): Promise<{
  items: TimelineItem[];
  nextCursor: string | null;
}>;
```

3. `src/app/timeline/page.tsx` - 無限スクロール実装:
   - Intersection Observer で「もっと読む」検知
   - ローディング状態管理
   - アイテム追加読み込み

### 4-2. レビュー一覧（検索）ページ

**目的**: レビュー検索・フィルタリング機能

**変更箇所:**

1. 新規 `src/server/routes/reviews.ts`:

```typescript
// GET /api/reviews?sort=rating&tags=甘口,辛口&userId=xxx&cursor=&limit=20
```

2. `src/server/index.ts` - reviews route 追加

3. `src/lib/api.ts` - searchReviews 追加

4. 新規 `src/app/reviews/page.tsx` - レビュー一覧ページ:
   - ソート切り替え（評価高い順 / 新しい順）
   - タグフィルタ（TagSelector 再利用）
   - ユーザーフィルタ
   - 無限スクロール

5. `src/components/UserMenu.tsx` - 「レビュー一覧」リンク追加

---

## Phase 5: データ

### 5-1. demo用seed

**目的**: 動作確認用のデモデータ

**変更箇所:**

1. 新規 `db/seed-demo.sql`:

```sql
-- ユーザー3人
INSERT INTO users (user_id, name) VALUES
  ('demo_user_001', 'たろう'),
  ('demo_user_002', 'はなこ'),
  ('demo_user_003', 'じろう');

-- brewery_id 1-4 に各3種類の酒（計12件）
-- type は 大吟醸、純米吟醸、純米酒、普通酒、原酒 など
INSERT INTO sakes (brewery_id, name, type, is_limited, paid_tasting_price, category) VALUES
  (1, '○○ 純米大吟醸', '純米大吟醸', 0, NULL, '清酒'),
  (1, '○○ 限定しぼりたて', '純米', 1, NULL, '清酒'),
  (1, '○○ 梅酒', NULL, 0, 300, 'リキュール'),
  -- ... 残り9件

-- レビュー20件
INSERT INTO reviews (user_id, sake_id, rating, tags, comment) VALUES
  ('demo_user_001', 1, 5, '["甘口","濃醇"]', 'とても美味しい！'),
  ('demo_user_002', 1, 4, '["辛口","淡麗"]', 'すっきりしていて飲みやすい'),
  -- ... 残り18件


-- 酒蔵ノート5件
```

2. `package.json` - スクリプト追加:

```json
{
  "scripts": {
    "db:seed-demo:local": "wrangler d1 execute sake-navi-db --local --file=./db/seed-demo.sql",
    "db:seed-demo:remote": "wrangler d1 execute sake-navi-db --remote --file=./db/seed-demo.sql"
  }
}
```

---

## 検証方法

各タスク完了後 サブエージェント(モデルは Sonnet 4.5)で実行する

メインセッションで`pnpm dev` でサーバーを起動しておく

1. `pnpm typecheck` - 型エラーなし確認
2. `pnpm lint` - リントエラーなし確認
3. ブラウザで該当機能の手動テスト http://localhost:3000/
4. git commit

全タスク完了後:

1. `pnpm db:migrate:local && pnpm db:seed-demo:local`

---

## 新規ファイル一覧

| ファイルパス                     | 目的                   |
| -------------------------------- | ---------------------- |
| `src/server/routes/bookmarks.ts` | ブックマークAPI        |
| `src/server/routes/reviews.ts`   | レビュー検索API        |
| `src/app/bookmarks/page.tsx`     | ブックマーク一覧ページ |
| `src/app/review/[id]/page.tsx`   | レビュー詳細ページ     |
| `src/app/reviews/page.tsx`       | レビュー一覧ページ     |
| `db/seed-demo.sql`               | デモ用シードデータ     |

## API エンドポイント一覧（追加分）

| Method | Path                               | 概要             |
| ------ | ---------------------------------- | ---------------- |
| PUT    | `/api/sakes/:id/reviews/:reviewId` | レビュー編集     |
| DELETE | `/api/sakes/:id/reviews/:reviewId` | レビュー削除     |
| PUT    | `/api/breweries/:id/notes/:noteId` | 酒蔵ノート編集   |
| DELETE | `/api/breweries/:id/notes/:noteId` | 酒蔵ノート削除   |
| GET    | `/api/bookmarks`                   | ブックマーク一覧 |
| POST   | `/api/bookmarks`                   | ブックマーク追加 |
| DELETE | `/api/bookmarks/:sakeId`           | ブックマーク削除 |
| GET    | `/api/reviews/:id`                 | レビュー単体取得 |
| GET    | `/api/reviews`                     | レビュー検索     |
