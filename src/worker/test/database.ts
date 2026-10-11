import { createMiddleware } from 'hono/factory';
import { env } from 'cloudflare:test';
import type { AuthUser } from '../auth';
import { type AuthEnv } from '../auth/middleware';
import { createDb, type Db } from '../db';
import { user as userTable } from '../db/schema';

export function testDb(): Db {
  return createDb(env);
}

/**
 * テストごとにテーブルを空にする。外部キーがあるので子から消す
 * （`env.DB.exec` は maintenance / one-shot 用途なのでテストの後片付けには適切）。
 */
export async function resetDatabase(): Promise<void> {
  await env.DB.exec(
    [
      'DELETE FROM brewery_notes',
      'DELETE FROM bookmarks',
      'DELETE FROM reviews',
      'DELETE FROM sakes',
      'DELETE FROM breweries',
      'DELETE FROM allowed_emails',
      'DELETE FROM session',
      'DELETE FROM account',
      'DELETE FROM "user"',
    ].join('\n'),
  );
}

const fixedDate = new Date('2026-01-01T00:00:00.000Z');

/**
 * ユーザーを 1 件作り、セッション middleware に渡せる形で返す。
 * レビューの `user_id` などは外部キーなので、行が実在している必要がある。
 */
export async function insertTestUser(
  db: Db,
  input: { id: string; name: string; email: string; role?: string },
): Promise<AuthUser> {
  const role = input.role ?? 'member';
  await db
    .insert(userTable)
    .values({ id: input.id, name: input.name, email: input.email, emailVerified: true, role });

  return {
    id: input.id,
    name: input.name,
    email: input.email,
    emailVerified: true,
    image: null,
    role,
    createdAt: fixedDate,
    updatedAt: fixedDate,
  };
}

/**
 * セッションを解決済みの状態にする middleware。
 * 実際の Cookie 署名を通さずに、認証が要る route の振る舞いだけをテストする。
 */
export function withSession(user: AuthUser | null) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    c.set('user', user);
    c.set('session', null);
    await next();
  });
}
