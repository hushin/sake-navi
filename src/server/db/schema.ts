import { sql, relations } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// ユーザー
export const users = sqliteTable('users', {
  userId: text('user_id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID().replace(/-/g, '').slice(0, 16)),
  name: text('name').notNull().unique(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// 酒蔵
export const breweries = sqliteTable('breweries', {
  breweryId: integer('brewery_id').primaryKey(),
  name: text('name').notNull(),
  mapPositionX: real('map_position_x').notNull().default(0),
  mapPositionY: real('map_position_y').notNull().default(0),
  area: text('area'),
});

// お酒
export const sakes = sqliteTable(
  'sakes',
  {
    sakeId: integer('sake_id').primaryKey({ autoIncrement: true }),
    breweryId: integer('brewery_id')
      .notNull()
      .references(() => breweries.breweryId),
    name: text('name').notNull(),
    type: text('type'),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    addedBy: text('added_by').references(() => users.userId),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index('idx_sakes_brewery').on(table.breweryId)],
);

// レビュー
export const reviews = sqliteTable(
  'reviews',
  {
    reviewId: integer('review_id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.userId),
    sakeId: integer('sake_id')
      .notNull()
      .references(() => sakes.sakeId),
    rating: integer('rating').notNull(),
    tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
    comment: text('comment'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_reviews_sake').on(table.sakeId),
    index('idx_reviews_user').on(table.userId),
    index('idx_reviews_created').on(table.createdAt),
  ],
);

// 酒蔵ノート
export const breweryNotes = sqliteTable(
  'brewery_notes',
  {
    noteId: integer('note_id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.userId),
    breweryId: integer('brewery_id')
      .notNull()
      .references(() => breweries.breweryId),
    comment: text('comment').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_brewery_notes_brewery').on(table.breweryId),
    index('idx_brewery_notes_created').on(table.createdAt),
  ],
);

// リレーション定義
export const usersRelations = relations(users, ({ many }) => ({
  sakes: many(sakes),
  reviews: many(reviews),
  breweryNotes: many(breweryNotes),
}));

export const breweriesRelations = relations(breweries, ({ many }) => ({
  sakes: many(sakes),
  breweryNotes: many(breweryNotes),
}));

export const sakesRelations = relations(sakes, ({ one, many }) => ({
  brewery: one(breweries, {
    fields: [sakes.breweryId],
    references: [breweries.breweryId],
  }),
  addedByUser: one(users, {
    fields: [sakes.addedBy],
    references: [users.userId],
  }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.userId],
  }),
  sake: one(sakes, {
    fields: [reviews.sakeId],
    references: [sakes.sakeId],
  }),
}));

export const breweryNotesRelations = relations(breweryNotes, ({ one }) => ({
  user: one(users, {
    fields: [breweryNotes.userId],
    references: [users.userId],
  }),
  brewery: one(breweries, {
    fields: [breweryNotes.breweryId],
    references: [breweries.breweryId],
  }),
}));

// 型エクスポート
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Brewery = typeof breweries.$inferSelect;
export type NewBrewery = typeof breweries.$inferInsert;
export type Sake = typeof sakes.$inferSelect;
export type NewSake = typeof sakes.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type BreweryNote = typeof breweryNotes.$inferSelect;
export type NewBreweryNote = typeof breweryNotes.$inferInsert;
