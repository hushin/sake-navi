import { Hono } from 'hono';
import { type AuthEnv } from '../auth/middleware';
import { createDb } from '../db';
import { listBreweries } from '../repositories/breweries';

/**
 * 酒蔵の一覧（フロアマップ用）。
 * `hasUserReviewed` のためにセッションを見るが、未サインインでも一覧自体は返す。
 */
const app = new Hono<AuthEnv>().get('/', async (c) => {
  const user = c.get('user');
  const items = await listBreweries(createDb(c.env), { userId: user?.id ?? null });
  return c.json({ items });
});

export default app;
