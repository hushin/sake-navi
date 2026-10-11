import { asc } from 'drizzle-orm';
import type { Db } from '../db';
import { user } from '../db/schema';

export type Member = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  createdAt: Date;
};

/** サインイン済みのユーザー一覧。オーナーが「誰が参加しているか」を確認するために使う */
export async function listMembers(db: Db): Promise<Member[]> {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.createdAt));
}
