import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { timelineQuerySchema } from '@/shared/schemas/sake';
import { type AuthEnv } from '../auth/middleware';
import { createDb } from '../db';
import { listTimeline } from '../repositories/reviews';

const app = new Hono<AuthEnv>().get('/', zValidator('query', timelineQuerySchema), async (c) => {
  const page = await listTimeline(createDb(c.env), c.req.valid('query'));
  return c.json(page);
});

export default app;
