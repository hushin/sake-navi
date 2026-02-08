import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

type TimelineItem = {
  type: "review" | "brewery_note";
  id: number;
  userName: string;
  createdAt: string;
  breweryId: number;
  sakeName?: string;
  breweryName?: string;
  rating?: number;
  tags?: string[];
  comment?: string;
  content?: string;
};

// GET /api/timeline - 全投稿を新しい順に取得
app.get("/", async (c) => {
  try {
    const db = c.get("db");

    // レビュー取得（JOIN: users, sakes, breweries）
    const reviewsData = await db
      .select({
        reviewId: schema.reviews.reviewId,
        userName: schema.users.name,
        createdAt: schema.reviews.createdAt,
        breweryId: schema.breweries.breweryId,
        sakeName: schema.sakes.name,
        breweryName: schema.breweries.name,
        rating: schema.reviews.rating,
        tags: schema.reviews.tags,
        comment: schema.reviews.comment,
      })
      .from(schema.reviews)
      .innerJoin(schema.users, eq(schema.users.userId, schema.reviews.userId))
      .innerJoin(schema.sakes, eq(schema.sakes.sakeId, schema.reviews.sakeId))
      .innerJoin(
        schema.breweries,
        eq(schema.breweries.breweryId, schema.sakes.breweryId)
      )
      .orderBy(desc(schema.reviews.createdAt));

    // 酒蔵ノート取得（JOIN: users, breweries）
    const notesData = await db
      .select({
        noteId: schema.breweryNotes.noteId,
        userName: schema.users.name,
        createdAt: schema.breweryNotes.createdAt,
        breweryId: schema.breweries.breweryId,
        breweryName: schema.breweries.name,
        content: schema.breweryNotes.comment,
      })
      .from(schema.breweryNotes)
      .innerJoin(
        schema.users,
        eq(schema.users.userId, schema.breweryNotes.userId)
      )
      .innerJoin(
        schema.breweries,
        eq(schema.breweries.breweryId, schema.breweryNotes.breweryId)
      )
      .orderBy(desc(schema.breweryNotes.createdAt));

    // タイムラインアイテムに変換
    const reviewItems: TimelineItem[] = reviewsData.map((review) => ({
      type: "review" as const,
      id: review.reviewId,
      userName: review.userName,
      createdAt: review.createdAt,
      breweryId: review.breweryId,
      sakeName: review.sakeName,
      breweryName: review.breweryName,
      rating: review.rating,
      tags: review.tags ?? [],
      comment: review.comment ?? undefined,
    }));

    const noteItems: TimelineItem[] = notesData.map((note) => ({
      type: "brewery_note" as const,
      id: note.noteId,
      userName: note.userName,
      createdAt: note.createdAt,
      breweryId: note.breweryId,
      breweryName: note.breweryName,
      content: note.content,
    }));

    // マージして作成日時の新しい順にソート
    const allItems = [...reviewItems, ...noteItems].sort((a, b) => {
      return b.createdAt.localeCompare(a.createdAt);
    });

    return c.json({ items: allItems });
  } catch (error) {
    console.error("タイムライン取得エラー:", error);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  }
});

export default app;
