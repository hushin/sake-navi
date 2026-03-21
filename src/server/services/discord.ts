/**
 * Discord Webhook経由で通知を送信するユーティリティ
 */

interface ReviewNotificationData {
  sakeName: string;
  sakeType?: string | null;
  isLimited?: boolean;
  paidTastingPrice?: number | null;
  breweryName: string;
  breweryId: number;
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
  webhookUrl?: string,
  baseUrl?: string,
): Promise<void> {
  if (!webhookUrl) {
    return;
  }

  try {
    const mapUrl = baseUrl ? `${baseUrl}/map?brewery=${data.breweryId}` : undefined;

    const sakeName = [
      data.sakeName,
      data.sakeType ? `（${data.sakeType}）` : '',
      data.isLimited ? '【限定】' : '',
      data.paidTastingPrice ? `【有料試飲 ¥${data.paidTastingPrice}】` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const titleParts: string[] = [
      `🍶 [${data.userName}] No.${data.breweryId} ${data.breweryName}: ${sakeName} ${'⭐'.repeat(data.rating)}`,
    ];
    if (data.comment) titleParts.push(data.comment);
    if (data.tags.length > 0) titleParts.push(data.tags.join(' '));

    const discordMessage = {
      embeds: [
        {
          title: titleParts.join('\n'),
          color: 0x3b82f6, // blue-500
          fields: [
            ...(mapUrl
              ? [
                  {
                    name: '📍 マップで見る',
                    value: mapUrl,
                    inline: false,
                  },
                ]
              : []),
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordMessage),
    });
  } catch (error) {
    console.error('Discord通知送信エラー:', error);
  }
}

interface BreweryNoteNotificationData {
  breweryName: string;
  breweryId: number;
  comment: string;
  userName: string;
}

/**
 * 酒蔵ノート投稿通知をDiscordに送信
 */
export async function sendBreweryNoteNotification(
  data: BreweryNoteNotificationData,
  webhookUrl?: string,
  baseUrl?: string,
): Promise<void> {
  if (!webhookUrl) {
    return;
  }

  try {
    const mapUrl = baseUrl ? `${baseUrl}/map?brewery=${data.breweryId}` : '';
    const message = `**${data.userName}** さんが **No.${data.breweryId}: ${data.breweryName}** にノートを投稿しました\n\n${data.comment}${mapUrl ? `\n\n📍 **マップで見る:** ${mapUrl}` : ''}`;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
      }),
    });
  } catch (error) {
    console.error('Discord通知送信エラー:', error);
  }
}
