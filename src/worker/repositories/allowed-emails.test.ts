import { allowedEmails, user as userTable } from '../db/schema';
import { resetDatabase, testDb } from '../test/database';
import {
  countUsers,
  deleteAllowedEmail,
  findUserByEmail,
  insertAllowedEmail,
  isEmailAllowed,
  listAllowedEmails,
  normalizeEmail,
  parseAllowedEmails,
} from './allowed-emails';

describe('parseAllowedEmails', () => {
  it('カンマ区切りを正規化して配列にする', () => {
    expect(parseAllowedEmails(' Owner@Example.com , friend@example.com ,')).toEqual([
      'owner@example.com',
      'friend@example.com',
    ]);
  });

  it('未設定なら空配列', () => {
    expect(parseAllowedEmails(undefined)).toEqual([]);
    expect(parseAllowedEmails('')).toEqual([]);
  });
});

describe('normalizeEmail', () => {
  it('前後の空白を落として小文字にする', () => {
    expect(normalizeEmail('  Owner@Example.COM ')).toBe('owner@example.com');
  });
});

describe('許可リストの判定', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('環境変数のブートストラップに載っていれば許可する', async () => {
    const allowed = await isEmailAllowed(testDb(), 'Owner@Example.com', ['owner@example.com']);
    expect(allowed).toBe(true);
  });

  it('DB に追加されたメールは許可する', async () => {
    await testDb().insert(allowedEmails).values({ email: 'friend@example.com' });

    expect(await isEmailAllowed(testDb(), 'friend@example.com', [])).toBe(true);
    expect(await isEmailAllowed(testDb(), 'stranger@example.com', [])).toBe(false);
  });

  it('insertAllowedEmail は重複を null で返す', async () => {
    await testDb().insert(userTable).values({
      id: 'user-1',
      name: '新潟 花子',
      email: 'owner@example.com',
      emailVerified: true,
      role: 'owner',
    });

    const created = await insertAllowedEmail(testDb(), 'Friend@Example.com', 'user-1');
    expect(created).toMatchObject({ email: 'friend@example.com', invitedByUserId: 'user-1' });

    expect(await insertAllowedEmail(testDb(), 'friend@example.com', 'user-1')).toBeNull();
    expect(await listAllowedEmails(testDb())).toHaveLength(1);
  });

  it('deleteAllowedEmail は消せたときだけ true を返す', async () => {
    await insertAllowedEmail(testDb(), 'friend@example.com', null);

    expect(await deleteAllowedEmail(testDb(), 'friend@example.com')).toBe(true);
    expect(await deleteAllowedEmail(testDb(), 'friend@example.com')).toBe(false);
  });

  it('ユーザーの件数とロールを読める（オーナー判定に使う）', async () => {
    expect(await countUsers(testDb())).toBe(0);
    expect(await findUserByEmail(testDb(), 'owner@example.com')).toBeNull();

    await testDb().insert(userTable).values({
      id: 'user-1',
      name: '新潟 花子',
      email: 'owner@example.com',
      emailVerified: true,
      role: 'owner',
    });

    expect(await countUsers(testDb())).toBe(1);
    expect(await findUserByEmail(testDb(), 'Owner@Example.com')).toEqual({
      id: 'user-1',
      role: 'owner',
    });
  });
});
