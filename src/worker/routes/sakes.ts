import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { reviewInputSchema, sakeListQuerySchema } from '@/shared/schemas/sake';
import { type AuthEnv, requireAuth } from '../auth/middleware';
import { createDb } from '../db';
import * as reviewsRepository from '../repositories/reviews';
import { findSakeById, listSakes } from '../repositories/sakes';

/** `:id` は数値のみ。Hono RPC の param 型を壊さないよう validator は使わずここで変換する */
function parseSakeId(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  return Number(value);
}

const app = new Hono<AuthEnv>()
  .get('/', zValidator('query', sakeListQuerySchema), async (c) => {
    const page = await listSakes(createDb(c.env), c.req.valid('query'));
    return c.json(page);
  })
  .get('/:id', async (c) => {
    const sakeId = parseSakeId(c.req.param('id'));
    if (sakeId === null) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const db = createDb(c.env);
    const sake = await findSakeById(db, sakeId);
    if (!sake) {
      return c.json({ error: 'Not Found' }, 404);
    }

    return c.json({ ...sake, reviews: await reviewsRepository.listReviewsForSake(db, sakeId) });
  })
  .post('/:id/reviews', requireAuth, zValidator('json', reviewInputSchema), async (c) => {
    const user = c.get('user');
    const sakeId = parseSakeId(c.req.param('id'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (sakeId === null) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const db = createDb(c.env);
    if (!(await findSakeById(db, sakeId))) {
      return c.json({ error: 'Not Found' }, 404);
    }

    // 1 人 1 銘柄 1 件。すでに投稿済みなら 409（UI は編集に誘導する）
    const review = await reviewsRepository.insertReview(db, user.id, sakeId, c.req.valid('json'));
    if (!review) {
      return c.json({ error: 'Conflict' }, 409);
    }

    return c.json(review, 201);
  });

export default app;
