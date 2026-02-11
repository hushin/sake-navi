import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../db/schema';
import type { AppEnv } from '../types';

// リクエストボディのバリデーションスキーマ
const createUserSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
});

const app = new Hono<AppEnv>()
  // GET /api/users - ユーザー一覧取得
  .get('/', async (c) => {
    const db = c.var.db;

    const allUsers = await db.query.users.findMany({
      orderBy: (users, { asc }) => [asc(users.name)],
    });

    return c.json(
      allUsers.map((user) => ({
        id: user.userId,
        name: user.name,
        createdAt: user.createdAt,
      })),
    );
  })
  // POST /api/users - ユーザー登録
  .post('/', async (c) => {
    const db = c.var.db;
    const body = await c.req.json();

    // バリデーション
    const parseResult = createUserSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({ error: parseResult.error.issues[0].message }, 400);
    }

    const { name } = parseResult.data;

    // 既存ユーザーの確認
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.name, name),
    });

    if (existingUser) {
      // 既存ユーザーがあればその情報を返す
      return c.json(
        {
          id: existingUser.userId,
          name: existingUser.name,
          createdAt: existingUser.createdAt,
        },
        200,
      );
    }

    // 新規ユーザー作成
    const newUser = await db.insert(schema.users).values({ name }).returning();

    if (!newUser[0]) {
      return c.json({ error: 'ユーザーの作成に失敗しました' }, 500);
    }

    // レスポンス（camelCaseに変換）
    return c.json(
      {
        id: newUser[0].userId,
        name: newUser[0].name,
        createdAt: newUser[0].createdAt,
      },
      201,
    );
  });

export default app;
