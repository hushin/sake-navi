import { and, asc, eq, gt, isNotNull, or, sql } from 'drizzle-orm';
import {
  PAID_TASTING_PRICE_UNDETERMINED,
  type SakeListQuery,
  type SakeUpdateInput,
} from '@/shared/schemas/sake';
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
  if (query.hasPaidTasting === 'true') {
    conditions.push(isNotNull(sakes.paidTastingPrice));
  }
  if (query.needsPrice === 'true') {
    // 「7」は有料試飲とだけ分かっていて金額が未入力の印（詳細は `parsePaidTasting`）
    conditions.push(eq(sakes.paidTastingPrice, PAID_TASTING_PRICE_UNDETERMINED));
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
 * 銘柄が存在するかだけを見る。ブックマークの登録前チェックのように、
 * 集計（レビュー件数・平均評価）が要らない用途で使う。
 */
export async function sakeExists(db: Db, sakeId: number): Promise<boolean> {
  const [row] = await db.select({ id: sakes.id }).from(sakes).where(eq(sakes.id, sakeId));
  return row !== undefined;
}

/**
 * マスタの seed に無い銘柄をユーザーが会場で追加する（当日の限定酒など）。
 * `is_custom` を立てて追加者を残す。削除は作らない（必要になったらレビューごと消すか確認する）。
 *
 * 追加した銘柄の id を返す。呼び出し側が詳細（`findSakeById`）を取り直して 201 を返す。
 */
export async function insertSake(
  db: Db,
  input: { breweryId: number; addedBy: string; sake: SakeUpdateInput },
): Promise<number> {
  const rows = await db
    .insert(sakes)
    .values({
      breweryId: input.breweryId,
      name: input.sake.name,
      type: input.sake.type,
      category: input.sake.category,
      isLimited: input.sake.isLimited,
      paidTastingPrice: input.sake.paidTastingPrice,
      isCustom: true,
      addedBy: input.addedBy,
    })
    .returning({ id: sakes.id });

  const created = rows[0];
  if (!created) {
    throw new Error('追加した銘柄の id を取得できませんでした');
  }
  return created.id;
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
