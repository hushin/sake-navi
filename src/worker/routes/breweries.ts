import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { breweryNoteInputSchema } from '@/shared/schemas/brewery-note';
import { sakeCreateSchema } from '@/shared/schemas/sake';
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
import { findSakeById, insertSake } from '../repositories/sakes';
import { sendBreweryNoteNotification } from '../services/discord';
import { parseIdParam } from './params';

/**
 * 酒蔵の一覧（フロアマップ用）と詳細（出品酒一覧）、酒蔵ノート、銘柄の追加。
 * `hasUserReviewed` / `myReviewId` のためにセッションを見るが、未サインインでも中身は返す。
 * ノートの投稿と銘柄の追加はサインインが必要で、ノートの編集・削除は本人だけ。
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
    const brewery = await findBreweryById(db, breweryId);
    if (!brewery) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const input = c.req.valid('json');
    const note = await insertBreweryNote(db, {
      userId: user.id,
      breweryId,
      comment: input.comment,
    });

    // Discord 通知はレスポンスを待たせない（`waitUntil` の中で失敗しても投稿は成功扱い）
    if (input.notifyDiscord) {
      c.executionCtx.waitUntil(
        sendBreweryNoteNotification(c.env, {
          breweryId: brewery.id,
          breweryName: brewery.name,
          comment: note.comment,
          userName: user.nickname ?? user.name,
        }),
      );
    }

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
  })
  /**
   * マスタに無い銘柄をその場で追加する（当日の限定酒など）。
   * 身内で使うアプリなのでサインインしていれば誰でも追加でき、`is_custom` を立てる。
   */
  .post('/:id/sakes', requireAuth, zValidator('json', sakeCreateSchema), async (c) => {
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

    const sakeId = await insertSake(db, {
      breweryId,
      addedBy: user.id,
      sake: c.req.valid('json'),
    });

    const sake = await findSakeById(db, sakeId);
    if (!sake) {
      return c.json({ error: 'Not Found' }, 404);
    }

    return c.json(sake, 201);
  });

export default app;
