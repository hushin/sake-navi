import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getDb } from '@/lib/db';
import type { AppEnv } from './types';
import usersRoute from './routes/users';
import breweriesRoute from './routes/breweries';
import sakesRoute from './routes/sakes';
import timelineRoute from './routes/timeline';

const app = new Hono<AppEnv>().basePath('/api');

// グローバルエラーハンドラー
app.onError((err, c) => {
  // HTTPExceptionはそのままレスポンスに変換
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  // その他のエラーはログ出力して500エラー
  console.error('サーバーエラー:', err);
  return c.json({ error: 'サーバーエラーが発生しました' }, 500);
});

// DBミドルウェア
app.use('/*', async (c, next) => {
  const db = await getDb();
  c.set('db', db);
  await next();
});

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// ルート登録
app.route('/users', usersRoute);
app.route('/breweries', breweriesRoute);
app.route('/sakes', sakesRoute);
app.route('/timeline', timelineRoute);

export default app;
export type AppType = typeof app;
