import type { Review, Sake, Brewery, User, BreweryNote } from "../db/schema";

/**
 * Discord Webhook経由で通知を送信するユーティリティ
 */

/**
 * レビュー投稿通知をDiscordに送信
 */
export async function sendReviewNotification(
  review: Review,
  sake: Sake,
  brewery: Brewery,
  user: User,
  webhookUrl?: string
): Promise<void> {
  if (!webhookUrl) {
    // Webhook URLが未設定の場合は何もしない
    return;
  }

  try {
    // 評価を星で表示（★★★★☆ 形式）
    const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);

    // タグをカンマ区切りで表示
    const tags = review.tags && review.tags.length > 0
      ? review.tags.join(", ")
      : "なし";

    // コメントがあれば表示
    const commentSection = review.comment
      ? `\n💬 コメント: ${review.comment}`
      : "";

    const message = `【レビュー投稿】
🍶 お酒: ${sake.name}
🏭 酒蔵: ${brewery.name}
⭐ 評価: ${stars} (${review.rating})
🏷️ タグ: ${tags}${commentSection}
👤 投稿者: ${user.name}`;

    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
      }),
    });
  } catch (error) {
    // エラーが発生しても無視（通知失敗でアプリケーションを止めない）
    console.error("Discord通知送信エラー:", error);
  }
}

/**
 * 酒蔵ノート投稿通知をDiscordに送信
 */
export async function sendBreweryNoteNotification(
  note: BreweryNote,
  brewery: Brewery,
  user: User,
  webhookUrl?: string
): Promise<void> {
  if (!webhookUrl) {
    // Webhook URLが未設定の場合は何もしない
    return;
  }

  try {
    const message = `【酒蔵ノート】
🏭 酒蔵: ${brewery.name}
💬 ノート: ${note.comment}
👤 投稿者: ${user.name}`;

    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
      }),
    });
  } catch (error) {
    // エラーが発生しても無視（通知失敗でアプリケーションを止めない）
    console.error("Discord通知送信エラー:", error);
  }
}
