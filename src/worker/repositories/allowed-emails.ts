import { count, eq } from 'drizzle-orm';
import type { Db } from '../db';
import { allowedEmails, user } from '../db/schema';

export type AllowedEmail = {
  email: string;
  invitedByUserId: string | null;
  createdAt: Date;
};

/** 比較・保存は大文字小文字を区別しないので小文字に寄せる */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * 環境変数 `ALLOWED_EMAILS`（カンマ区切り）を配列にする。
 * 初回（オーナー）のサインインを許可するための、デプロイ単位の設定。
 */
export function parseAllowedEmails(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(normalizeEmail)
    .filter((email) => email.length > 0);
}

/** オーナー判定（最初のユーザーか）に使う */
export async function countUsers(db: Db): Promise<number> {
  const [row] = await db.select({ value: count() }).from(user);
  return row?.value ?? 0;
}

export async function findUserByEmail(
  db: Db,
  email: string,
): Promise<{ id: string; role: string } | null> {
  const [row] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.email, normalizeEmail(email)));

  return row ?? null;
}

/**
 * サインインを許可するメールアドレスかどうか。
 * 環境変数のブートストラップ（オーナー）と、アプリ内で追加した許可リストの両方を見る。
 */
export async function isEmailAllowed(
  db: Db,
  email: string,
  bootstrapEmails: readonly string[],
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (bootstrapEmails.includes(normalized)) {
    return true;
  }

  const row = await db.query.allowedEmails.findFirst({
    where: eq(allowedEmails.email, normalized),
  });
  return row !== undefined;
}

export async function listAllowedEmails(db: Db): Promise<AllowedEmail[]> {
  return db
    .select({
      email: allowedEmails.email,
      invitedByUserId: allowedEmails.invitedByUserId,
      createdAt: allowedEmails.createdAt,
    })
    .from(allowedEmails)
    .orderBy(allowedEmails.createdAt);
}

/** すでに許可済みなら null を返す（UNIQUE 制約違反を 500 にしない） */
export async function insertAllowedEmail(
  db: Db,
  email: string,
  invitedByUserId: string | null,
): Promise<AllowedEmail | null> {
  const rows = await db
    .insert(allowedEmails)
    .values({ email: normalizeEmail(email), invitedByUserId })
    .onConflictDoNothing()
    .returning();

  return rows[0] ?? null;
}

export async function deleteAllowedEmail(db: Db, email: string): Promise<boolean> {
  const rows = await db
    .delete(allowedEmails)
    .where(eq(allowedEmails.email, normalizeEmail(email)))
    .returning();

  return rows.length > 0;
}
