import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import * as schema from "../db/schema";

type Bindings = {
  DB: D1Database;
  DISCORD_WEBHOOK_URL?: string;
};

type Variables = {
  db: ReturnType<typeof drizzle<typeof schema>>;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// リクエストボディのバリデーションスキーマ
const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5, "評価は1-5の範囲で指定してください"),
  tags: z.array(z.string()).default([]),
  comment: z.string().optional(),
});

// タグ一覧（バリデーション用）
const VALID_TAGS = [
  "甘口",
  "辛口",
  "濃醇",
  "淡麗",
  "にごり",
  "酸",
  "旨味",
  "熟成",
  "苦味",
  "発泡",
];

// GET /api/sakes/:id - お酒詳細
app.get("/:id", async (c) => {
  try {
    const db = c.get("db");
    const sakeId = parseInt(c.req.param("id"));

    if (isNaN(sakeId)) {
      return c.json({ error: "無効なお酒IDです" }, 400);
    }

    // お酒情報を取得
    const sake = await db
      .select()
      .from(schema.sakes)
      .where(eq(schema.sakes.sakeId, sakeId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!sake) {
      return c.json({ error: "お酒が見つかりません" }, 404);
    }

    // レビュー一覧を取得（新しい順、ユーザー名を含める）
    const reviewsData = await db
      .select({
        reviewId: schema.reviews.reviewId,
        rating: schema.reviews.rating,
        tags: schema.reviews.tags,
        comment: schema.reviews.comment,
        createdAt: schema.reviews.createdAt,
        userName: schema.users.name,
        userId: schema.users.userId,
      })
      .from(schema.reviews)
      .innerJoin(schema.users, eq(schema.reviews.userId, schema.users.userId))
      .where(eq(schema.reviews.sakeId, sakeId))
      .orderBy(desc(schema.reviews.createdAt));

    // 平均評価を計算
    const avgRatingResult = await db
      .select({
        avgRating: sql<number>`CAST(AVG(${schema.reviews.rating}) AS REAL)`,
      })
      .from(schema.reviews)
      .where(eq(schema.reviews.sakeId, sakeId));

    const avgRating = reviewsData.length > 0
      ? avgRatingResult[0]?.avgRating ?? null
      : null;

    // レスポンス（camelCaseに変換）
    return c.json({
      id: sake.sakeId,
      breweryId: sake.breweryId,
      name: sake.name,
      type: sake.type,
      isCustom: sake.isCustom,
      addedBy: sake.addedBy,
      createdAt: sake.createdAt,
      avgRating,
      reviews: reviewsData.map((r) => ({
        id: r.reviewId,
        rating: r.rating,
        tags: r.tags,
        comment: r.comment,
        createdAt: r.createdAt,
        user: {
          id: r.userId,
          name: r.userName,
        },
      })),
    });
  } catch (error) {
    console.error("お酒詳細取得エラー:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

// POST /api/sakes/:id/reviews - レビュー投稿
app.post("/:id/reviews", async (c) => {
  try {
    const db = c.get("db");
    const sakeId = parseInt(c.req.param("id"));
    const userId = c.req.header("X-User-Id");

    if (isNaN(sakeId)) {
      return c.json({ error: "無効なお酒IDです" }, 400);
    }

    if (!userId) {
      return c.json(
        { error: "ユーザーIDが指定されていません" },
        401
      );
    }

    const body = await c.req.json();

    // バリデーション
    const parseResult = createReviewSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        { error: parseResult.error.issues[0].message },
        400
      );
    }

    const { rating, tags, comment } = parseResult.data;

    // タグのバリデーション
    const invalidTags = tags.filter((tag) => !VALID_TAGS.includes(tag));
    if (invalidTags.length > 0) {
      return c.json(
        { error: `無効なタグが含まれています: ${invalidTags.join(", ")}` },
        400
      );
    }

    // ユーザーの存在確認
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.userId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      return c.json({ error: "ユーザーが見つかりません" }, 404);
    }

    // お酒の存在確認
    const sake = await db
      .select({
        sakeId: schema.sakes.sakeId,
        name: schema.sakes.name,
        breweryName: schema.breweries.name,
      })
      .from(schema.sakes)
      .innerJoin(
        schema.breweries,
        eq(schema.sakes.breweryId, schema.breweries.breweryId)
      )
      .where(eq(schema.sakes.sakeId, sakeId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!sake) {
      return c.json({ error: "お酒が見つかりません" }, 404);
    }

    // レビュー作成
    const newReview = await db
      .insert(schema.reviews)
      .values({
        userId,
        sakeId,
        rating,
        tags,
        comment: comment || null,
      })
      .returning();

    if (!newReview[0]) {
      return c.json(
        { error: "レビューの作成に失敗しました" },
        500
      );
    }

    // Discord通知（非同期）
    const webhookUrl = c.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      const discordMessage = {
        embeds: [
          {
            title: "🍶 新しいレビューが投稿されました",
            color: 0x3b82f6, // blue-500
            fields: [
              {
                name: "お酒",
                value: sake.name,
                inline: true,
              },
              {
                name: "酒蔵",
                value: sake.breweryName || "不明",
                inline: true,
              },
              {
                name: "評価",
                value: "⭐".repeat(rating),
                inline: false,
              },
              ...(tags.length > 0
                ? [
                    {
                      name: "タグ",
                      value: tags.join(", "),
                      inline: false,
                    },
                  ]
                : []),
              ...(comment
                ? [
                    {
                      name: "コメント",
                      value: comment,
                      inline: false,
                    },
                  ]
                : []),
              {
                name: "投稿者",
                value: user.name,
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      };

      // 非同期でDiscord通知を送信
      c.executionCtx.waitUntil(
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordMessage),
        }).catch((error) => {
          console.error("Discord通知エラー:", error);
        })
      );
    }

    // レスポンス（camelCaseに変換）
    return c.json(
      {
        id: newReview[0].reviewId,
        userId: newReview[0].userId,
        sakeId: newReview[0].sakeId,
        rating: newReview[0].rating,
        tags: newReview[0].tags,
        comment: newReview[0].comment,
        createdAt: newReview[0].createdAt,
      },
      201
    );
  } catch (error) {
    console.error("レビュー投稿エラー:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

export default app;
