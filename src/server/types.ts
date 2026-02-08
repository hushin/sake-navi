import type { drizzle } from 'drizzle-orm/d1';
import type * as schema from './db/schema';

export type Bindings = {
  DB: D1Database;
  DISCORD_WEBHOOK_URL?: string;
};

export type Variables = {
  db: ReturnType<typeof drizzle<typeof schema>>;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
