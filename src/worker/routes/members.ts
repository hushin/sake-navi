import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { memberEmailSchema } from '@/shared/schemas/member';
import { type AuthEnv, requireAuth, requireOwner } from '../auth/middleware';
import { createDb } from '../db';
import {
  deleteAllowedEmail,
  insertAllowedEmail,
  listAllowedEmails,
  normalizeEmail,
} from '../repositories/allowed-emails';
import { listMembers } from '../repositories/members';

/**
 * メンバー（サインインを許可する Google アカウント）の管理。
 * 一覧はサインイン済みなら誰でも見られるが、追加・削除はオーナーだけ。
 */
const app = new Hono<AuthEnv>()
  .use('*', requireAuth)
  .get('/', async (c) => {
    const db = createDb(c.env);
    const [members, invitations] = await Promise.all([listMembers(db), listAllowedEmails(db)]);

    return c.json({
      canManage: c.get('user')?.role === 'owner',
      members,
      invitations,
    });
  })
  .post('/', requireOwner, zValidator('json', memberEmailSchema), async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { email } = c.req.valid('json');
    const invitation = await insertAllowedEmail(createDb(c.env), email, user.id);
    if (!invitation) {
      return c.json({ error: 'Conflict' }, 409);
    }

    return c.json(invitation, 201);
  })
  .delete('/:email', requireOwner, async (c) => {
    const email = normalizeEmail(c.req.param('email'));
    const deleted = await deleteAllowedEmail(createDb(c.env), email);
    if (!deleted) {
      return c.json({ error: 'Not Found' }, 404);
    }

    return c.json({ email });
  });

export default app;
