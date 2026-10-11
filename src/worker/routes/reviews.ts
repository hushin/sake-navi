import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { reviewInputSchema } from '@/shared/schemas/sake';
import { type AuthEnv, requireAuth } from '../auth/middleware';
import { createDb } from '../db';
import { deleteReview, findReviewById, updateReview } from '../repositories/reviews';

/**
 * 既存レビューの編集・削除。自分のレビュー以外は 403。
 * 投稿（作成）は銘柄に紐づくので `sakes` route 側にある。
 */
const app = new Hono<AuthEnv>()
  .use('*', requireAuth)
  .put('/:id', zValidator('json', reviewInputSchema), async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = createDb(c.env);
    const review = await findReviewById(db, c.req.param('id'));
    if (!review) {
      return c.json({ error: 'Not Found' }, 404);
    }
    if (review.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const updated = await updateReview(db, review.id, c.req.valid('json'));
    if (!updated) {
      return c.json({ error: 'Not Found' }, 404);
    }

    return c.json(updated);
  })
  .delete('/:id', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = createDb(c.env);
    const review = await findReviewById(db, c.req.param('id'));
    if (!review) {
      return c.json({ error: 'Not Found' }, 404);
    }
    if (review.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await deleteReview(db, review.id);
    return c.json({ id: review.id });
  });

export default app;
