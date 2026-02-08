import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { cache } from 'react';
import * as schema from '@/server/db/schema';
import type { Bindings } from '@/server/types';

// Cloudflare contextを取得
export const getCloudflareEnv = cache(async (): Promise<Bindings> => {
  const ctx = await getCloudflareContext({ async: true });

  if (!ctx || !ctx.env) {
    // ローカル開発等でenvが取得できない場合のガード
    throw new Error("Cloudflare Context not found. Are you running with 'npm run dev'?");
  }

  return ctx.env as Bindings;
});

// Next.jsのリクエスト毎に1回だけ実行されるようにキャッシュ(メモ化)します
export const getDb = cache(async () => {
  const env = await getCloudflareEnv();

  // wrangler.jsonc の d1_databases の binding 名に合わせてください (例: DB)
  return drizzle(env.DB, { schema });
});
