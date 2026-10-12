import { formatRating, RATING_MAX } from '@/shared/schemas/sake';

/**
 * Discord Webhook への通知。
 *
 * `DISCORD_WEBHOOK_URL` が未設定なら何もしない（ローカルやテストで通知を止められる）。
 * 呼び出し側は `c.executionCtx.waitUntil()` に渡し、投稿のレスポンスを待たせないこと。
 */

/** 通知に必要な設定だけを要求する（route からは `c.env` をそのまま渡せる） */
type NotificationEnv = Pick<Env, 'DISCORD_WEBHOOK_URL' | 'BETTER_AUTH_URL'>;

export type ReviewNotification = {
  sakeName: string;
  breweryId: number;
  breweryName: string;
  rating: number;
  tags: string[];
  comment: string | null;
  /** アプリ内の表示名（`nickname ?? name`） */
  userName: string;
};

export type BreweryNoteNotification = {
  breweryId: number;
  breweryName: string;
  comment: string;
  /** アプリ内の表示名（`nickname ?? name`） */
  userName: string;
};

/** 会場マップの該当ブースを強調した URL */
function mapUrl(env: NotificationEnv, breweryId: number): string {
  return `${env.BETTER_AUTH_URL}/map?brewery=${breweryId}`;
}

async function send(webhookUrl: string | undefined, content: string): Promise<void> {
  if (!webhookUrl) {
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      console.error(`Discord 通知が失敗しました (${response.status})`);
    }
  } catch (error) {
    // 通知の失敗で投稿そのものを失敗させない（waitUntil の中で動くのでログだけ残す）
    console.error('Discord 通知の送信に失敗しました', error);
  }
}

/** レビュー投稿の通知（本文に銘柄とマップ URL を入れる） */
export async function sendReviewNotification(
  env: NotificationEnv,
  data: ReviewNotification,
): Promise<void> {
  const lines = [
    `🍶 **${data.userName}** さんが **No.${data.breweryId} ${data.breweryName}** の **${data.sakeName}** をレビューしました ⭐ ${formatRating(data.rating)} / ${RATING_MAX}`,
  ];
  if (data.tags.length > 0) {
    lines.push(data.tags.join(' '));
  }
  if (data.comment) {
    lines.push(`> ${data.comment}`);
  }
  lines.push(`📍 マップで見る: ${mapUrl(env, data.breweryId)}`);

  await send(env.DISCORD_WEBHOOK_URL, lines.join('\n'));
}

/** 酒蔵ノート投稿の通知（売り切れなどの一次情報を早く共有する） */
export async function sendBreweryNoteNotification(
  env: NotificationEnv,
  data: BreweryNoteNotification,
): Promise<void> {
  const content = `📝 **${data.userName}** さんが **No.${data.breweryId} ${data.breweryName}** にノートを投稿しました\n\n${data.comment}\n\n📍 マップで見る: ${mapUrl(env, data.breweryId)}`;

  await send(env.DISCORD_WEBHOOK_URL, content);
}
