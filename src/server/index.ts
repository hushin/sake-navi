import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './db/schema';
import { getDb } from '@/lib/db';
import usersRoute from './routes/users';
import breweriesRoute from './routes/breweries';
import sakesRoute from './routes/sakes';
import timelineRoute from './routes/timeline';

type Bindings = {
  DB: D1Database;
  DISCORD_WEBHOOK_URL?: string;
};

type Variables = {
  db: ReturnType<typeof drizzle<typeof schema>>;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath(
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
