import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { ReviewTag } from '@/shared/schemas/sake';
import { user } from './auth-schema';

/** SQLite でミリ秒精度の現在時刻を得る式（better-auth 生成の auth-schema と揃えている） */
const currentTimestampMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

/**
 * 酒蔵。`id` は会場のブース番号そのもの（`No.14` のように欠番がある）。
 */
export const breweries = sqliteTable('breweries', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  /** 会場マップのグリッド列（1 始まり）。パーセントではない */
  mapColumn: integer('map_column').notNull().default(0),
  /** 会場マップのグリッド行（1 始まり） */
  mapRow: integer('map_row').notNull().default(0),
});

/**
 * 出品酒。銘柄は酒蔵ごとに 1 行。
 */
export const sakes = sqliteTable(
  'sakes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    breweryId: integer('brewery_id')
      .notNull()
      .references(() => breweries.id),
    name: text('name').notNull(),
    /** 「純米大吟醸」「セット売り」など自由記述の区分 */
    type: text('type'),
    category: text('category').notNull().default('清酒'),
    isLimited: integer('is_limited', { mode: 'boolean' }).notNull().default(false),
    /**
     * 有料試飲の価格（円）。会場に行くまで分からないので未入力は null にしておき、
     * 会場で手入力して直す。
     */
    paidTastingPrice: integer('paid_tasting_price'),
    /** マスタの seed に無く、ユーザーが会場で追加した銘柄（当日の限定酒など） */
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    /** 追加したユーザー。削除しても銘柄は残すので `set null` */
    addedBy: text('added_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(currentTimestampMs),
  },
  (table) => [
    // 酒蔵詳細・検索の絞り込みで必ず使う
    index('sakes_brewery_id_idx').on(table.breweryId),
  ],
);

/**
 * レビュー。1 人 1 銘柄 1 件に制約する。訂正は編集（PUT）で行う。
 */
export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sakeId: integer('sake_id')
      .notNull()
      .references(() => sakes.id, { onDelete: 'cascade' }),
    /** 星 5 段階を 0.25 刻みで付ける（`RATING_STEP`）。REAL にしないと型が実態とズレる */
    rating: real('rating').notNull(),
    // API の zod スキーマで `REVIEW_TAGS` に制限しているので、その型で扱う
    tags: text('tags', { mode: 'json' }).$type<ReviewTag[]>().notNull().default([]),
    comment: text('comment'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(currentTimestampMs),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(currentTimestampMs)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('reviews_user_id_sake_id_unique').on(table.userId, table.sakeId),
    index('reviews_sake_id_idx').on(table.sakeId),
    // タイムラインは created_at の降順 + id の降順で辿る
    index('reviews_created_at_id_idx').on(table.createdAt, table.id),
  ],
);

/**
 * 気になった銘柄の保存（あとで見返す用）。1 人 1 銘柄 1 件。
 * 酒蔵ではなく銘柄に紐づける（同じ酒蔵でも銘柄ごとに興味が分かれるため）。
 */
export const bookmarks = sqliteTable(
  'bookmarks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sakeId: integer('sake_id')
      .notNull()
      .references(() => sakes.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(currentTimestampMs),
  },
  (table) => [
    // 一覧の `WHERE user_id = ?` はこの index の左端で効くので、user_id 単独の index は張らない
    uniqueIndex('bookmarks_user_id_sake_id_unique').on(table.userId, table.sakeId),
  ],
);

/**
 * 酒蔵ノート。列の長さ・売り切れ・混雑など、酒以外の一次情報を共有する。
 * 誰でも投稿でき、編集・削除は本人だけ（route 側で 403 にする）。
 */
export const breweryNotes = sqliteTable(
  'brewery_notes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    breweryId: integer('brewery_id')
      .notNull()
      .references(() => breweries.id, { onDelete: 'cascade' }),
    comment: text('comment').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(currentTimestampMs),
  },
  (table) => [
    // 酒蔵詳細は `WHERE brewery_id = ?` + `ORDER BY created_at DESC` で引く
    index('brewery_notes_brewery_id_created_at_idx').on(table.breweryId, table.createdAt),
  ],
);

/**
 * サインインを許可する Google アカウント。
 * 初回（オーナー）は環境変数 `ALLOWED_EMAILS` で入れ、以降はアプリ内から追加する。
 */
export const allowedEmails = sqliteTable('allowed_emails', {
  email: text('email').primaryKey(),
  invitedByUserId: text('invited_by_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(currentTimestampMs),
});

export * from './auth-schema';
