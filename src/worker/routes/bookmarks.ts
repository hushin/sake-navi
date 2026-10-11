import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { bookmarkInputSchema } from '@/shared/schemas/bookmark';
import { type AuthEnv, requireAuth } from '../auth/middleware';
import { createDb } from '../db';
import { deleteBookmark, insertBookmark, listBookmarks } from '../repositories/bookmarks';
import { sakeExists } from '../repositories/sakes';
import { parseIdParam } from './params';

/** ブックマークは自分専用なので、どの route も `requireAuth` で 401 にする */
const app = new Hono<AuthEnv>()
  .get('/', requireAuth, async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return c.json({ items: await listBookmarks(createDb(c.env), user.id) });
  })
  .post('/', requireAuth, zValidator('json', bookmarkInputSchema), async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = createDb(c.env);
    const { sakeId } = c.req.valid('json');
    // 未知の銘柄は外部キー違反で 500 にせず、先に 404 にする
    if (!(await sakeExists(db, sakeId))) {
      return c.json({ error: 'Not Found' }, 404);
    }

    // すでに登録済みなら 409（UI は解除ボタンに切り替わっているので通常は起きない）
    const bookmark = await insertBookmark(db, user.id, sakeId);
    if (!bookmark) {
      return c.json({ error: 'Conflict' }, 409);
    }

    return c.json(bookmark, 201);
  })
  // 解除は銘柄 id で行う（トグルボタンが銘柄しか持っていないため）
  .delete('/:sakeId', requireAuth, async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const sakeId = parseIdParam(c.req.param('sakeId'));
    if (sakeId === null) {
      return c.json({ error: 'Not Found' }, 404);
    }

    if (!(await deleteBookmark(createDb(c.env), user.id, sakeId))) {
      return c.json({ error: 'Not Found' }, 404);
    }

    return c.json({ sakeId });
  });

export default app;
