import { Hono } from 'hono';
import { getDb } from '@/lib/db';
import type { AppEnv } from './types';
import usersRoute from './routes/users';
import breweriesRoute from './routes/breweries';
import sakesRoute from './routes/sakes';
import timelineRoute from './routes/timeline';

const app = new Hono<AppEnv>().basePath(
  '/api',
);

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
