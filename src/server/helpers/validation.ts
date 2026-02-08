import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import type { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

/**
 * ユーザーを取得し、見つからなければ404エラーをスロー
 */
export async function findUserOrThrow(db: DB, userId: string): Promise<schema.User> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.userId, userId),
  });

  if (!user) {
    throw new HTTPException(404, { message: 'ユーザーが見つかりません' });
  }

  return user;
}

/**
 * 酒蔵を取得し、見つからなければ404エラーをスロー
 */
export async function findBreweryOrThrow(db: DB, breweryId: number): Promise<schema.Brewery> {
  const brewery = await db.query.breweries.findFirst({
    where: eq(schema.breweries.breweryId, breweryId),
  });

  if (!brewery) {
    throw new HTTPException(404, { message: '酒蔵が見つかりません' });
  }

  return brewery;
}

/**
 * お酒を取得し、見つからなければ404エラーをスロー
 */
export async function findSakeOrThrow(db: DB, sakeId: number): Promise<schema.Sake> {
  const sake = await db.query.sakes.findFirst({
    where: eq(schema.sakes.sakeId, sakeId),
  });

  if (!sake) {
    throw new HTTPException(404, { message: 'お酒が見つかりません' });
  }

  return sake;
}
