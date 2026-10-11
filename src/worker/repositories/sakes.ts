import { and, asc, eq, gt, or, sql } from 'drizzle-orm';
import type { SakeListQuery, SakeUpdateInput } from '@/shared/schemas/sake';
import type { Db } from '../db';
import { breweries, reviews, sakes } from '../db/schema';

/** LIKE のワイルドカードを打ち消す（ユーザー入力の `%` や `_` を文字として扱う） */
function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

const sakeListItemColumns = {
  id: sakes.id,
  name: sakes.name,
  type: sakes.type,
  category: sakes.category,
  isLimited: sakes.isLimited,
  paidTastingPrice: sakes.paidTastingPrice,
  breweryId: breweries.id,
  breweryName: breweries.name,
  reviewCount: sql<number>`count(${reviews.id})`,
  averageRating: sql<number | null>`avg(${reviews.rating})`,
};

export type SakeListItem = {
  id: number;
  name: string;
  type: string | null;
  category: string;
  isLimited: boolean;
  paidTastingPrice: number | null;
  breweryId: number;
  breweryName: string;
  reviewCount: number;
  averageRating: number | null;
};

/**
 * 銘柄の検索。`id` 昇順のキーセットページネーションで、`limit + 1` 件取って
 * 次ページの有無を判定する（OFFSET は使わない）。
 */
export async function listSakes(
  db: Db,
  query: SakeListQuery,
): Promise<{ items: SakeListItem[]; nextCursor: number | null }> {
  const conditions = [];
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(
      or(
        sql`${sakes.name} LIKE ${pattern} ESCAPE '\\'`,
        sql`${breweries.name} LIKE ${pattern} ESCAPE '\\'`,
      ),
    );
  }
  if (query.category) {
    conditions.push(eq(sakes.category, query.category));
  }
  if (query.isLimited) {
    conditions.push(eq(sakes.isLimited, query.isLimited === 'true'));
  }
  if (query.cursor !== undefined) {
    conditions.push(gt(sakes.id, query.cursor));
  }

  const rows = await db
    .select(sakeListItemColumns)
    .from(sakes)
    .innerJoin(breweries, eq(breweries.id, sakes.breweryId))
    .leftJoin(reviews, eq(reviews.sakeId, sakes.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(
      sakes.id,
      sakes.name,
      sakes.type,
      sakes.category,
      sakes.isLimited,
      sakes.paidTastingPrice,
      breweries.id,
      breweries.name,
    )
    .orderBy(asc(sakes.id))
    .limit(query.limit + 1);

  const items = rows.slice(0, query.limit);
  const nextCursor = rows.length > query.limit ? (items.at(-1)?.id ?? null) : null;

  return { items, nextCursor };
}

/** 酒蔵詳細で見せる酒蔵の情報 */
export type Brewery = {
  id: number;
  name: string;
  mapColumn: number;
  mapRow: number;
  area: string | null;
};

export type SakeDetail = {
  id: number;
  name: string;
  type: string | null;
  category: string;
  isLimited: boolean;
  paidTastingPrice: number | null;
  brewery: Brewery;
  reviewCount: number;
  averageRating: number | null;
};

export async function findSakeById(db: Db, sakeId: number): Promise<SakeDetail | null> {
  const [row] = await db
    .select({
      id: sakes.id,
      name: sakes.name,
      type: sakes.type,
      category: sakes.category,
      isLimited: sakes.isLimited,
      paidTastingPrice: sakes.paidTastingPrice,
      breweryId: breweries.id,
      breweryName: breweries.name,
      breweryMapColumn: breweries.mapColumn,
      breweryMapRow: breweries.mapRow,
      breweryArea: breweries.area,
      reviewCount: sql<number>`count(${reviews.id})`,
      averageRating: sql<number | null>`avg(${reviews.rating})`,
    })
    .from(sakes)
    .innerJoin(breweries, eq(breweries.id, sakes.breweryId))
    .leftJoin(reviews, eq(reviews.sakeId, sakes.id))
    .where(eq(sakes.id, sakeId))
    .groupBy(
      sakes.id,
      sakes.name,
      sakes.type,
      sakes.category,
      sakes.isLimited,
      sakes.paidTastingPrice,
      breweries.id,
      breweries.name,
      breweries.mapColumn,
      breweries.mapRow,
      breweries.area,
    );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    category: row.category,
    isLimited: row.isLimited,
    paidTastingPrice: row.paidTastingPrice,
    brewery: {
      id: row.breweryId,
      name: row.breweryName,
      mapColumn: row.breweryMapColumn,
      mapRow: row.breweryMapRow,
      area: row.breweryArea,
    },
    reviewCount: row.reviewCount,
    averageRating: row.averageRating,
  };
}

/**
 * 銘柄マスタの更新。身内で使うアプリなので、サインインしていれば誰でも編集できる
 * （`is_custom` のような追加者限定の区別はしない）。
 */
export async function updateSake(db: Db, sakeId: number, input: SakeUpdateInput): Promise<boolean> {
  const rows = await db
    .update(sakes)
    .set({
      name: input.name,
      type: input.type,
      category: input.category,
      isLimited: input.isLimited,
      paidTastingPrice: input.paidTastingPrice,
    })
    .where(eq(sakes.id, sakeId))
    .returning({ id: sakes.id });

  return rows.length > 0;
}
