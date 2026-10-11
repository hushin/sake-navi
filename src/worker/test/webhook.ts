import { z } from 'zod';

const webhookBodySchema = z.object({ content: z.string() });

/**
 * `fetch` の第 2 引数（Discord へ送ったリクエスト）から Webhook の本文を取り出す。
 * `init.body` は文字列以外（Blob など）にもなり得るので、型を確かめてから JSON にする。
 */
export function parseWebhookBody(init: RequestInit | undefined): string {
  const body = init?.body;
  if (typeof body !== 'string') {
    throw new Error('Webhook の body が文字列ではありません');
  }

  return webhookBodySchema.parse(JSON.parse(body)).content;
}
