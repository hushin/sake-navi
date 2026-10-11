import { desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { breweryNotes, user } from '../db/schema';

export type BreweryNote = {
  id: number;
  userId: string;
  /** 表示名はニックネームを優先する（レビューと同じ `coalesce`） */
  userName: string;
  breweryId: number;
  comment: string;
  createdAt: Date;
};

const noteColumns = {
  id: breweryNotes.id,
  userId: breweryNotes.userId,
  userName: sql<string>`coalesce(${user.nickname}, ${user.name})`,
  breweryId: breweryNotes.breweryId,
  comment: breweryNotes.comment,
  createdAt: breweryNotes.createdAt,
};

/** 酒蔵のノート。新しい順（同一時刻の並びを安定させるため id も降順で見る） */
export async function listBreweryNotes(db: Db, breweryId: number): Promise<BreweryNote[]> {
  return db
    .select(noteColumns)
    .from(breweryNotes)
    .innerJoin(user, eq(user.id, breweryNotes.userId))
    .where(eq(breweryNotes.breweryId, breweryId))
    .orderBy(desc(breweryNotes.createdAt), desc(breweryNotes.id));
}

/** 1 件をユーザー名つきで引く（作成・更新のレスポンスに使う） */
async function findBreweryNote(db: Db, noteId: number): Promise<BreweryNote | null> {
  const [row] = await db
    .select(noteColumns)
    .from(breweryNotes)
    .innerJoin(user, eq(user.id, breweryNotes.userId))
    .where(eq(breweryNotes.id, noteId));

  return row ?? null;
}

/**
 * 編集・削除の権限チェック用。`breweryId` も返して URL の酒蔵と突き合わせる
 * （別の酒蔵のノートを URL 経由でいじれないようにする）。
 */
export async function findBreweryNoteOwner(
  db: Db,
  noteId: number,
): Promise<{ id: number; userId: string; breweryId: number } | null> {
  const [row] = await db
    .select({
      id: breweryNotes.id,
      userId: breweryNotes.userId,
      breweryId: breweryNotes.breweryId,
    })
    .from(breweryNotes)
    .where(eq(breweryNotes.id, noteId));

  return row ?? null;
}

export async function insertBreweryNote(
  db: Db,
  input: { userId: string; breweryId: number; comment: string },
): Promise<BreweryNote> {
  const [row] = await db.insert(breweryNotes).values(input).returning({ id: breweryNotes.id });

  // 挿入直後は必ず存在する（`.returning()` が空になるのは制約違反のときだけ）
  const note = await findBreweryNote(db, row.id);
  if (!note) {
    throw new Error('作成した酒蔵ノートを読み出せませんでした');
  }
  return note;
}

export async function updateBreweryNote(
  db: Db,
  noteId: number,
  comment: string,
): Promise<BreweryNote | null> {
  await db.update(breweryNotes).set({ comment }).where(eq(breweryNotes.id, noteId));
  return findBreweryNote(db, noteId);
}

export async function deleteBreweryNote(db: Db, noteId: number): Promise<boolean> {
  const rows = await db
    .delete(breweryNotes)
    .where(eq(breweryNotes.id, noteId))
    .returning({ id: breweryNotes.id });
  return rows.length > 0;
}
