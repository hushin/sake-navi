import { parseWebhookBody } from '../test/webhook';
import {
  sendBreweryNoteNotification,
  sendReviewNotification,
  type ReviewNotification,
} from './discord';

const env = {
  DISCORD_WEBHOOK_URL: 'https://discord.example/webhook',
  BETTER_AUTH_URL: 'https://sake.example',
};

/** `fetch` を差し替えて、送信された Webhook の本文を読みやすくする */
function stubFetch(response: Response = new Response(null, { status: 204 })) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof stubFetch>): string {
  return parseWebhookBody(fetchMock.mock.calls[0]?.[1]);
}

const review: ReviewNotification = {
  sakeName: '八海山 純米大吟醸',
  breweryId: 3,
  breweryName: '八海醸造',
  rating: 5,
  tags: ['甘口', 'フルーティ'],
  comment: '華やかで飲みやすい。',
  userName: 'はなこ',
};

describe('discord service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('Webhook が未設定なら何もしない', async () => {
    const fetchMock = stubFetch();

    await sendReviewNotification({ ...env, DISCORD_WEBHOOK_URL: '' }, review);
    await sendBreweryNoteNotification(
      { ...env, DISCORD_WEBHOOK_URL: '' },
      { breweryId: 3, breweryName: '八海醸造', comment: '売り切れ', userName: 'はなこ' },
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('レビュー通知の本文に銘柄・酒蔵・評価・タグ・マップ URL を入れる', async () => {
    const fetchMock = stubFetch();

    await sendReviewNotification(env, review);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://discord.example/webhook');

    const body = sentBody(fetchMock);
    expect(body).toContain('はなこ');
    expect(body).toContain('八海山 純米大吟醸');
    expect(body).toContain('No.3 八海醸造');
    expect(body).toContain('⭐⭐⭐⭐⭐');
    expect(body).toContain('甘口 フルーティ');
    expect(body).toContain('華やかで飲みやすい。');
    expect(body).toContain('https://sake.example/map?brewery=3');
  });

  it('コメントやタグが無くても通知できる', async () => {
    const fetchMock = stubFetch();

    await sendReviewNotification(env, { ...review, comment: null, tags: [] });

    const body = sentBody(fetchMock);
    expect(body).toContain('⭐⭐⭐⭐⭐');
    expect(body).toContain('https://sake.example/map?brewery=3');
  });

  it('酒蔵ノートの通知の本文にコメントとマップ URL を入れる', async () => {
    const fetchMock = stubFetch();

    await sendBreweryNoteNotification(env, {
      breweryId: 3,
      breweryName: '八海醸造',
      comment: '14 時時点で売り切れ。',
      userName: 'はなこ',
    });

    const body = sentBody(fetchMock);
    expect(body).toContain('No.3 八海醸造');
    expect(body).toContain('14 時時点で売り切れ。');
    expect(body).toContain('https://sake.example/map?brewery=3');
  });

  it('送信に失敗しても例外を投げない（投稿を失敗させない）', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn(async () => {
      throw new Error('network error');
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendReviewNotification(env, review)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledOnce();

    // Webhook が 4xx でも投稿は成功扱いにする
    consoleError.mockClear();
    stubFetch(new Response(null, { status: 404 }));
    await expect(sendReviewNotification(env, review)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
