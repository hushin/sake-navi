/**
 * Discord Webhook経由で通知を送信するユーティリティ
 */

interface ReviewNotificationData {
  sakeName: string;
  breweryName: string;
  rating: number;
  tags: string[];
  comment?: string | null;
  userName: string;
}

/**
 * レビュー投稿通知をDiscordに送信（Embed形式）
 */
export async function sendReviewNotification(
  data: ReviewNotificationData,
  webhookUrl?: string
): Promise<void> {
  if (!webhookUrl) {
    return;
  }

  try {
    const discordMessage = {
      embeds: [
        {
          title: "🍶 新しいレビューが投稿されました",
          color: 0x3b82f6, // blue-500
          fields: [
            {
              name: "お酒",
              value: data.sakeName,
              inline: true,
            },
            {
              name: "酒蔵",
              value: data.breweryName || "不明",
              inline: true,
            },
            {
              name: "評価",
              value: "⭐".repeat(data.rating),
              inline: false,
            },
            ...(data.tags.length > 0
              ? [
                  {
                    name: "タグ",
                    value: data.tags.join(", "),
                    inline: false,
                  },
                ]
              : []),
            ...(data.comment
              ? [
                  {
                    name: "コメント",
                    value: data.comment,
                    inline: false,
                  },
                ]
              : []),
            {
              name: "投稿者",
              value: data.userName,
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(discordMessage),
    });
  } catch (error) {
    console.error("Discord通知送信エラー:", error);
  }
}

interface BreweryNoteNotificationData {
  breweryName: string;
  comment: string;
  userName: string;
}

/**
 * 酒蔵ノート投稿通知をDiscordに送信
 */
export async function sendBreweryNoteNotification(
  data: BreweryNoteNotificationData,
  webhookUrl?: string
): Promise<void> {
  if (!webhookUrl) {
    return;
  }

  try {
    const message = `**${data.userName}** さんが **${data.breweryName}** にノートを投稿しました\n\n${data.comment}`;

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
    console.error("Discord通知送信エラー:", error);
  }
}
