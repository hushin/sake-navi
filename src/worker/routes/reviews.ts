import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { reviewInputSchema, reviewListQuerySchema } from '@/shared/schemas/sake';
import { type AuthEnv, requireAuth } from '../auth/middleware';
import { createDb } from '../db';
import { deleteReview, findReviewById, listReviews, updateReview } from '../repositories/reviews';

/**
 * レビューの横断検索（並び替え・タグ絞り込み）と、既存レビューの編集・削除。
 * 一覧は誰でも見られる。編集・削除は自分のレビュー以外を 403 にする。
 * 投稿（作成）は銘柄に紐づくので `sakes` route 側にある。
 */
const app = new Hono<AuthEnv>()
  .get('/', zValidator('query', reviewListQuerySchema), async (c) => {
    const page = await listReviews(createDb(c.env), c.req.valid('query'));
    return c.json(page);
  })
  .put('/:id', requireAuth, zValidator('json', reviewInputSchema), async (c) => {
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
  .delete('/:id', requireAuth, async (c) => {
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
