import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "../db/schema";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

// リクエストボディのバリデーションスキーマ
const createUserSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
});

// POST /api/users - ユーザー登録
app.post("/", async (c) => {
  try {
    const db = c.get("db");
    const body = await c.req.json();

    // バリデーション
    const parseResult = createUserSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0].message },
        400
      );
    }

    const { name } = parseResult.data;

    // ユニーク制約チェック（重複確認）
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.name, name),
    });

    if (existingUser) {
      return c.json(
        { error: "この名前は既に使用されています" },
        409
      );
    }

    // ユーザー作成
    const newUser = await db
      .insert(schema.users)
      .values({ name })
      .returning();

    if (!newUser[0]) {
      return c.json(
        { error: "ユーザーの作成に失敗しました" },
        500
      );
    }

    // レスポンス（camelCaseに変換）
    return c.json(
      {
        id: newUser[0].userId,
        name: newUser[0].name,
        createdAt: newUser[0].createdAt,
      },
      201
    );
  } catch (error) {
    console.error("ユーザー登録エラー:", error);
    return c.json(
      { error: "サーバーエラーが発生しました" },
      500
    );
  }
});

export default app;
