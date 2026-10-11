import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { breweryNoteInputSchema } from '@/shared/schemas/brewery-note';
import { type AuthEnv, requireAuth } from '../auth/middleware';
import { createDb } from '../db';
import {
  deleteBreweryNote,
  findBreweryNoteOwner,
  insertBreweryNote,
  listBreweryNotes,
  updateBreweryNote,
} from '../repositories/brewery-notes';
import { findBreweryById, listBreweries, listSakesForBrewery } from '../repositories/breweries';
import { parseIdParam } from './params';

/**
 * 酒蔵の一覧（フロアマップ用）と詳細（出品酒一覧）、酒蔵ノート。
 * `hasUserReviewed` / `myReviewId` のためにセッションを見るが、未サインインでも中身は返す。
 * ノートの投稿はサインインが必要で、編集・削除は本人だけ。
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
  })
  /** 酒蔵ノートの一覧。列の長さや混雑など、酒以外の一次情報を共有する */
  .get('/:id/notes', async (c) => {
    const breweryId = parseIdParam(c.req.param('id'));
    if (breweryId === null) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const db = createDb(c.env);
    if (!(await findBreweryById(db, breweryId))) {
      return c.json({ error: 'Not Found' }, 404);
    }

    return c.json({ items: await listBreweryNotes(db, breweryId) });
  })
  .post('/:id/notes', requireAuth, zValidator('json', breweryNoteInputSchema), async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const breweryId = parseIdParam(c.req.param('id'));
    if (breweryId === null) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const db = createDb(c.env);
    if (!(await findBreweryById(db, breweryId))) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const note = await insertBreweryNote(db, {
      userId: user.id,
      breweryId,
      comment: c.req.valid('json').comment,
    });
    return c.json(note, 201);
  })
  .put('/:id/notes/:noteId', requireAuth, zValidator('json', breweryNoteInputSchema), async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const breweryId = parseIdParam(c.req.param('id'));
    const noteId = parseIdParam(c.req.param('noteId'));
    if (breweryId === null || noteId === null) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const db = createDb(c.env);
    const note = await findBreweryNoteOwner(db, noteId);
    // 別の酒蔵のノートを URL 経由で編集できないようにする
    if (!note || note.breweryId !== breweryId) {
      return c.json({ error: 'Not Found' }, 404);
    }
    if (note.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const updated = await updateBreweryNote(db, noteId, c.req.valid('json').comment);
    if (!updated) {
      return c.json({ error: 'Not Found' }, 404);
    }

    return c.json(updated);
  })
  .delete('/:id/notes/:noteId', requireAuth, async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const breweryId = parseIdParam(c.req.param('id'));
    const noteId = parseIdParam(c.req.param('noteId'));
    if (breweryId === null || noteId === null) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const db = createDb(c.env);
    const note = await findBreweryNoteOwner(db, noteId);
    if (!note || note.breweryId !== breweryId) {
      return c.json({ error: 'Not Found' }, 404);
    }
    if (note.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await deleteBreweryNote(db, noteId);
    return c.json({ id: noteId });
  });

export default app;
