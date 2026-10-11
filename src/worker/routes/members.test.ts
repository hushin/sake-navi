import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { type AuthUser } from '../auth';
import { type AuthEnv } from '../auth/middleware';
import { allowedEmails } from '../db/schema';
import { insertTestUser, resetDatabase, testDb, withSession } from '../test/database';
import membersRoute from './members';

const membersSchema = z.object({
  canManage: z.boolean(),
  members: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
    }),
  ),
  invitations: z.array(z.object({ email: z.string(), invitedByUserId: z.string().nullable() })),
});

const invitationSchema = z.object({
  email: z.string(),
  invitedByUserId: z.string().nullable(),
});

function authedApp(user: AuthUser | null) {
  return new Hono<AuthEnv>().use('*', withSession(user)).route('/members', membersRoute);
}

describe('members route', () => {
  let owner: AuthUser;
  let member: AuthUser;

  beforeEach(async () => {
    await resetDatabase();
    const db = testDb();
    owner = await insertTestUser(db, {
      id: 'user-owner',
      name: '新潟 花子',
      email: 'owner@example.com',
      role: 'owner',
    });
    member = await insertTestUser(db, {
      id: 'user-member',
      name: '長岡 太郎',
      email: 'taro@example.com',
    });
    await db.insert(allowedEmails).values({ email: 'jiro@example.com', invitedByUserId: owner.id });
  });

  it('GET /api/members は誰でも見られるが canManage はオーナーだけ true', async () => {
    const asOwner = membersSchema.parse(
      await (await authedApp(owner).request('/members', {}, env)).json(),
    );
    expect(asOwner.canManage).toBe(true);
    expect(asOwner.members.map((item) => item.email)).toEqual([
      'owner@example.com',
      'taro@example.com',
    ]);
    expect(asOwner.invitations.map((item) => item.email)).toEqual(['jiro@example.com']);

    const asMember = membersSchema.parse(
      await (await authedApp(member).request('/members', {}, env)).json(),
    );
    expect(asMember.canManage).toBe(false);
  });

  it('GET /api/members は未ログインなら 401', async () => {
    expect((await authedApp(null).request('/members', {}, env)).status).toBe(401);
  });

  it('POST /api/members はオーナーだけが追加できる', async () => {
    const forbidden = await authedApp(member).request(
      '/members',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sato@example.com' }),
      },
      env,
    );
    expect(forbidden.status).toBe(403);

    const created = await authedApp(owner).request(
      '/members',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'Sato@Example.com ' }),
      },
      env,
    );
    expect(created.status).toBe(201);
    // 大文字と前後の空白は正規化して保存する
    expect(invitationSchema.parse(await created.json())).toMatchObject({
      email: 'sato@example.com',
      invitedByUserId: owner.id,
    });

    const duplicate = await authedApp(owner).request(
      '/members',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sato@example.com' }),
      },
      env,
    );
    expect(duplicate.status).toBe(409);
  });

  it('POST /api/members はメールアドレスを検証する', async () => {
    const invalid = await authedApp(owner).request(
      '/members',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      },
      env,
    );
    expect(invalid.status).toBe(400);
  });

  it('DELETE /api/members/:email はオーナーだけが取り消せる', async () => {
    const forbidden = await authedApp(member).request(
      '/members/jiro@example.com',
      { method: 'DELETE' },
      env,
    );
    expect(forbidden.status).toBe(403);

    const deleted = await authedApp(owner).request(
      '/members/jiro@example.com',
      { method: 'DELETE' },
      env,
    );
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ email: 'jiro@example.com' });

    const notFound = await authedApp(owner).request(
      '/members/jiro@example.com',
      { method: 'DELETE' },
      env,
    );
    expect(notFound.status).toBe(404);
  });
});
