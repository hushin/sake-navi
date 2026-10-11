import { asc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { breweries, reviews, sakes } from '../db/schema';

/** フロアマップの 1 件。酒蔵ごとの平均評価と、自分がレビュー済みかを持つ */
export type BreweryListItem = {
  id: number;
  name: string;
  mapColumn: number;
  mapRow: number;
  area: string | null;
  reviewCount: number;
  averageRating: number | null;
  hasUserReviewed: boolean;
};

/**
 * マップに出す酒蔵の一覧（ブース番号順）。
 *
 * `hasUserReviewed` は「その酒蔵の出品酒のどれかを自分がレビューしたか」。
 * `userId` が null（未サインイン）なら常に false になる。
 */
export async function listBreweries(
  db: Db,
  options: { userId: string | null },
): Promise<BreweryListItem[]> {
  const rows = await db
    .select({
      id: breweries.id,
      name: breweries.name,
      mapColumn: breweries.mapColumn,
      mapRow: breweries.mapRow,
      area: breweries.area,
      reviewCount: sql<number>`count(${reviews.id})`,
      averageRating: sql<number | null>`avg(${reviews.rating})`,
      // 自分のレビューだけを数える。未サインイン（null）は 1 件も一致しない
      myReviewCount: sql<number>`count(${reviews.id}) filter (where ${reviews.userId} = ${options.userId})`,
    })
    .from(breweries)
    .leftJoin(sakes, eq(sakes.breweryId, breweries.id))
    .leftJoin(reviews, eq(reviews.sakeId, sakes.id))
    .groupBy(breweries.id, breweries.name, breweries.mapColumn, breweries.mapRow, breweries.area)
    .orderBy(asc(breweries.id));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mapColumn: row.mapColumn,
    mapRow: row.mapRow,
    area: row.area,
    reviewCount: row.reviewCount,
    averageRating: row.averageRating,
    hasUserReviewed: row.myReviewCount > 0,
  }));
}

export type BreweryDetail = {
  id: number;
  name: string;
  mapColumn: number;
  mapRow: number;
  area: string | null;
};

/** 酒蔵詳細に並べる出品酒の 1 件 */
export type BrewerySakeItem = {
  id: number;
  name: string;
  type: string | null;
  category: string;
  isLimited: boolean;
  paidTastingPrice: number | null;
  reviewCount: number;
  averageRating: number | null;
  /** 自分が書いたレビューの id（未レビューなら null）。詳細への導線に使う */
  myReviewId: string | null;
};

export async function findBreweryById(db: Db, breweryId: number): Promise<BreweryDetail | null> {
  const [row] = await db
    .select({
      id: breweries.id,
      name: breweries.name,
      mapColumn: breweries.mapColumn,
      mapRow: breweries.mapRow,
      area: breweries.area,
    })
    .from(breweries)
    .where(eq(breweries.id, breweryId));

  return row ?? null;
}

/**
 * 酒蔵の出品酒（銘柄）の一覧。レビュー件数・平均評価と、自分のレビューの有無を付ける。
 *
 * `myReviewId` は「1 人 1 銘柄 1 件」なので `max` でも実質その 1 件になる。
 * `userId` が null（未サインイン）なら常に null。
 */
export async function listSakesForBrewery(
  db: Db,
  breweryId: number,
  options: { userId: string | null },
): Promise<BrewerySakeItem[]> {
  const rows = await db
    .select({
      id: sakes.id,
      name: sakes.name,
      type: sakes.type,
      category: sakes.category,
      isLimited: sakes.isLimited,
      paidTastingPrice: sakes.paidTastingPrice,
      reviewCount: sql<number>`count(${reviews.id})`,
      averageRating: sql<number | null>`avg(${reviews.rating})`,
      myReviewId: sql<
        string | null
      >`max(case when ${reviews.userId} = ${options.userId} then ${reviews.id} end)`,
    })
    .from(sakes)
    .leftJoin(reviews, eq(reviews.sakeId, sakes.id))
    .where(eq(sakes.breweryId, breweryId))
    .groupBy(
      sakes.id,
      sakes.name,
      sakes.type,
      sakes.category,
      sakes.isLimited,
      sakes.paidTastingPrice,
    )
    .orderBy(asc(sakes.id));

  return rows;
}
