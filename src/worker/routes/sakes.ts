import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { reviewInputSchema, sakeListQuerySchema, sakeUpdateSchema } from '@/shared/schemas/sake';
import { type AuthEnv, requireAuth } from '../auth/middleware';
import { createDb } from '../db';
import * as reviewsRepository from '../repositories/reviews';
import { findSakeById, listSakes, updateSake } from '../repositories/sakes';
import { sendReviewNotification } from '../services/discord';
import { parseIdParam } from './params';

const app = new Hono<AuthEnv>()
  .get('/', zValidator('query', sakeListQuerySchema), async (c) => {
    const page = await listSakes(createDb(c.env), c.req.valid('query'));
    return c.json(page);
  })
  .get('/:id', async (c) => {
    const sakeId = parseIdParam(c.req.param('id'));
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
  /**
   * 銘柄マスタの編集。身内で使うアプリなので、サインインしていれば誰でも編集できる
   * （有料試飲の価格を会場で手入力して直す用途を想定）。
   */
  .put('/:id', requireAuth, zValidator('json', sakeUpdateSchema), async (c) => {
    const sakeId = parseIdParam(c.req.param('id'));
    if (sakeId === null) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const db = createDb(c.env);
    if (!(await updateSake(db, sakeId, c.req.valid('json')))) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const sake = await findSakeById(db, sakeId);
    if (!sake) {
      return c.json({ error: 'Not Found' }, 404);
    }

    return c.json({ ...sake, reviews: await reviewsRepository.listReviewsForSake(db, sakeId) });
  })
  .post('/:id/reviews', requireAuth, zValidator('json', reviewInputSchema), async (c) => {
    const user = c.get('user');
    const sakeId = parseIdParam(c.req.param('id'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (sakeId === null) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const db = createDb(c.env);
    const sake = await findSakeById(db, sakeId);
    if (!sake) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const input = c.req.valid('json');
    // 1 人 1 銘柄 1 件。すでに投稿済みなら 409（UI は編集に誘導する）
    const review = await reviewsRepository.insertReview(db, user.id, sakeId, input);
    if (!review) {
      return c.json({ error: 'Conflict' }, 409);
    }

    // Discord 通知はレスポンスを待たせない（`waitUntil` の中で失敗しても投稿は成功扱い）
    if (input.notifyDiscord) {
      c.executionCtx.waitUntil(
        sendReviewNotification(c.env, {
          sakeName: sake.name,
          breweryId: sake.brewery.id,
          breweryName: sake.brewery.name,
          rating: review.rating,
          tags: review.tags,
          comment: review.comment,
          userName: user.nickname ?? user.name,
        }),
      );
    }

    return c.json(review, 201);
  });

export default app;
