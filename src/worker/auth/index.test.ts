import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { session as sessionTable, user as userTable, verification } from '../db/schema';
import { resetDatabase, testDb } from '../test/database';
import { createAuth } from './index';

/**
 * better-auth のスキーマ（user / session / verification）が D1 のマイグレーションと
 * 一致していることを、better-auth 自身の内部アダプタ経由で確認する。
 *
 * ユーザーの作成（validateUserInfo と databaseHooks）は endpoint context が要るため
 * ここでは扱わない。許可リストの判定は
 * `src/worker/repositories/allowed-emails.test.ts` で確認している。
 */
describe('better-auth のスキーマ', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('user テーブルを better-auth から読める（role 列を含む）', async () => {
    await testDb().insert(userTable).values({
      id: 'user-1',
      name: '新潟 花子',
      email: 'owner@example.com',
      emailVerified: true,
      role: 'owner',
    });

    const context = await createAuth(env).$context;
    const found = await context.internalAdapter.findUserByEmail('owner@example.com');

    expect(found?.user.id).toBe('user-1');
    expect(await context.internalAdapter.countTotalUsers()).toBe(1);

    // additionalFields の role も D1 に保存されている
    const [row] = await testDb()
      .select({ role: userTable.role })
      .from(userTable)
      .where(eq(userTable.id, 'user-1'));
    expect(row?.role).toBe('owner');
  });

  it('session テーブルをトークンで引ける', async () => {
    await testDb().insert(userTable).values({
      id: 'user-1',
      name: '新潟 花子',
      email: 'owner@example.com',
      emailVerified: true,
      role: 'owner',
    });
    await testDb()
      .insert(sessionTable)
      .values({
        id: 'session-1',
        token: 'session-token',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

    const context = await createAuth(env).$context;
    const found = await context.internalAdapter.findSession('session-token');

    expect(found?.session.id).toBe('session-1');
    expect(found?.user.email).toBe('owner@example.com');
  });

  it('Google のサインイン URL を発行して verification に状態を保存する', async () => {
    const result = await createAuth(env).api.signInSocial({
      body: { provider: 'google', callbackURL: '/sakes' },
    });

    expect(result.url).toContain('accounts.google.com');
    expect(result.url).toContain(encodeURIComponent('/api/auth/callback/google'));

    const rows = await testDb().select().from(verification);
    expect(rows).toHaveLength(1);
  });
});
