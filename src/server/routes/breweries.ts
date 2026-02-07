import { Hono } from "hono";
import { eq, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { breweries, sakes, reviews, breweryNotes } from "../db/schema";

type Bindings = {
  DB: D1Database;
  DISCORD_WEBHOOK_URL?: string;
};

type Variables = {
  db: ReturnType<typeof drizzle<typeof schema>>;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/breweries - 酒蔵一覧（マップ表示用）
app.get("/", async (c) => {
  const db = c.get("db");

  // 各酒蔵の平均評価を計算するため、サブクエリを使用
  const result = await db
    .select({
      breweryId: breweries.breweryId,
      name: breweries.name,
      mapPositionX: breweries.mapPositionX,
      mapPositionY: breweries.mapPositionY,
      averageRating: sql<number | null>`(
        SELECT AVG(CAST(${reviews.rating} AS REAL))
        FROM ${reviews}
        INNER JOIN ${sakes} ON ${sakes.sakeId} = ${reviews.sakeId}
        WHERE ${sakes.breweryId} = ${breweries.breweryId}
      )`,
    })
    .from(breweries);

  return c.json(
    result.map((row) => ({
      breweryId: row.breweryId,
      name: row.name,
      mapPositionX: row.mapPositionX,
      mapPositionY: row.mapPositionY,
      averageRating: row.averageRating ?? null,
    }))
  );
});

// GET /api/breweries/:id - 酒蔵詳細
app.get("/:id", async (c) => {
  const db = c.get("db");
  const breweryId = parseInt(c.req.param("id"), 10);

  if (isNaN(breweryId)) {
    return c.json({ error: "無効な酒蔵IDです" }, 400);
  }

  // 酒蔵情報取得
  const brewery = await db.query.breweries.findFirst({
    where: eq(breweries.breweryId, breweryId),
  });

  if (!brewery) {
    return c.json({ error: "酒蔵が見つかりません" }, 404);
  }

  // 出品酒一覧と各酒の平均評価を取得
  const sakesWithRatings = await db
    .select({
      sakeId: sakes.sakeId,
      name: sakes.name,
      type: sakes.type,
      isCustom: sakes.isCustom,
      addedBy: sakes.addedBy,
      createdAt: sakes.createdAt,
      averageRating: sql<number | null>`(
        SELECT AVG(CAST(${reviews.rating} AS REAL))
        FROM ${reviews}
        WHERE ${reviews.sakeId} = ${sakes.sakeId}
      )`,
    })
    .from(sakes)
    .where(eq(sakes.breweryId, breweryId));

  return c.json({
    brewery: {
      breweryId: brewery.breweryId,
      name: brewery.name,
      boothNumber: brewery.boothNumber,
      mapPositionX: brewery.mapPositionX,
      mapPositionY: brewery.mapPositionY,
      area: brewery.area,
    },
    sakes: sakesWithRatings.map((sake) => ({
      sakeId: sake.sakeId,
      name: sake.name,
      type: sake.type,
      isCustom: sake.isCustom,
      addedBy: sake.addedBy,
      createdAt: sake.createdAt,
      averageRating: sake.averageRating ?? null,
    })),
  });
});

// GET /api/breweries/:id/notes - 酒蔵ノート一覧
app.get("/:id/notes", async (c) => {
  const db = c.get("db");
  const breweryId = parseInt(c.req.param("id"), 10);

  if (isNaN(breweryId)) {
    return c.json({ error: "無効な酒蔵IDです" }, 400);
  }

  // 酒蔵が存在するか確認
  const brewery = await db.query.breweries.findFirst({
    where: eq(breweries.breweryId, breweryId),
  });

  if (!brewery) {
    return c.json({ error: "酒蔵が見つかりません" }, 404);
  }

  // ノート一覧を新しい順に取得（ユーザー情報も含む）
  const notes = await db.query.breweryNotes.findMany({
    where: eq(breweryNotes.breweryId, breweryId),
    orderBy: [desc(breweryNotes.createdAt)],
    with: {
      user: true,
    },
  });

  return c.json(
    notes.map((note) => ({
      noteId: note.noteId,
      userId: note.userId,
      userName: note.user.name,
      breweryId: note.breweryId,
      comment: note.comment,
      createdAt: note.createdAt,
    }))
  );
});

// POST /api/breweries/:id/notes - 酒蔵ノート投稿
app.post("/:id/notes", async (c) => {
  const db = c.get("db");
  const breweryId = parseInt(c.req.param("id"), 10);
  const userId = c.req.header("X-User-Id");

  if (isNaN(breweryId)) {
    return c.json({ error: "無効な酒蔵IDです" }, 400);
  }

  if (!userId) {
    return c.json({ error: "ユーザーIDが必要です" }, 401);
  }

  // リクエストボディの検証
  const body = await c.req.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return c.json({ error: "コメントを入力してください" }, 400);
  }

  // 酒蔵が存在するか確認
  const brewery = await db.query.breweries.findFirst({
    where: eq(breweries.breweryId, breweryId),
  });

  if (!brewery) {
    return c.json({ error: "酒蔵が見つかりません" }, 404);
  }

  // ユーザーが存在するか確認
  const user = await db.query.users.findFirst({
    where: eq(schema.users.userId, userId),
  });

  if (!user) {
    return c.json({ error: "ユーザーが見つかりません" }, 404);
  }

  // ノートを作成
  const [newNote] = await db
    .insert(breweryNotes)
    .values({
      userId,
      breweryId,
      comment: content.trim(),
    })
    .returning();

  // Discord通知を送信（非同期）
  const webhookUrl = c.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    c.executionCtx.waitUntil(
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `**${user.name}** さんが **${brewery.name}** にノートを投稿しました\n\n${content.trim()}`,
        }),
      }).catch((err) => {
        console.error("Discord通知の送信に失敗しました:", err);
      })
    );
  }

  return c.json(
    {
      noteId: newNote.noteId,
      userId: newNote.userId,
      userName: user.name,
      breweryId: newNote.breweryId,
      comment: newNote.comment,
      createdAt: newNote.createdAt,
    },
    201
  );
});

// POST /api/breweries/:id/sakes - お酒追加（ユーザー自由入力）
app.post("/:id/sakes", async (c) => {
  const db = c.get("db");
  const breweryId = parseInt(c.req.param("id"), 10);
  const userId = c.req.header("X-User-Id");

  if (isNaN(breweryId)) {
    return c.json({ error: "無効な酒蔵IDです" }, 400);
  }

  if (!userId) {
    return c.json({ error: "ユーザーIDが必要です" }, 401);
  }

  // リクエストボディの検証
  const body = await c.req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return c.json({ error: "お酒の名前を入力してください" }, 400);
  }

  // 酒蔵が存在するか確認
  const brewery = await db.query.breweries.findFirst({
    where: eq(breweries.breweryId, breweryId),
  });

  if (!brewery) {
    return c.json({ error: "酒蔵が見つかりません" }, 404);
  }

  // ユーザーが存在するか確認
  const user = await db.query.users.findFirst({
    where: eq(schema.users.userId, userId),
  });

  if (!user) {
    return c.json({ error: "ユーザーが見つかりません" }, 404);
  }

  // お酒を追加（is_custom=true）
  const [newSake] = await db
    .insert(sakes)
    .values({
      breweryId,
      name: name.trim(),
      isCustom: true,
      addedBy: userId,
    })
    .returning();

  return c.json(
    {
      sakeId: newSake.sakeId,
      breweryId: newSake.breweryId,
      name: newSake.name,
      type: newSake.type,
      isCustom: newSake.isCustom,
      addedBy: newSake.addedBy,
      createdAt: newSake.createdAt,
    },
    201
  );
});

export default app;
