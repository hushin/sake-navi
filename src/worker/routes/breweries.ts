import { Hono } from 'hono';
import { type AuthEnv } from '../auth/middleware';
import { createDb } from '../db';
import { findBreweryById, listBreweries, listSakesForBrewery } from '../repositories/breweries';
import { parseIdParam } from './params';

/**
 * 酒蔵の一覧（フロアマップ用）と詳細（出品酒一覧）。
 * `hasUserReviewed` / `myReviewId` のためにセッションを見るが、未サインインでも中身は返す。
 */
const app = new Hono<AuthEnv>()
  .get('/', async (c) => {
    const user = c.get('user');
    const items = await listBreweries(createDb(c.env), { userId: user?.id ?? null });
    return c.json({ items });
  })
  .get('/:id', async (c) => {
    const breweryId = parseIdParam(c.req.param('id'));
    if (breweryId === null) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const db = createDb(c.env);
    const brewery = await findBreweryById(db, breweryId);
    if (!brewery) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const user = c.get('user');
    const sakes = await listSakesForBrewery(db, breweryId, { userId: user?.id ?? null });
    return c.json({ brewery, sakes });
  });

export default app;
