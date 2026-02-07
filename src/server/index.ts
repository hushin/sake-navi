import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";

type Bindings = {
  DB: D1Database;
  DISCORD_WEBHOOK_URL?: string;
};

type Variables = {
  db: ReturnType<typeof drizzle<typeof schema>>;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// DBミドルウェア
app.use("/api/*", async (c, next) => {
  const db = drizzle(c.env.DB, { schema });
  c.set("db", db);
  await next();
});

// ヘルスチェック
app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

// TODO: ルートを追加
// app.route("/api/users", usersRoute);
// app.route("/api/breweries", breweriesRoute);
// app.route("/api/sakes", sakesRoute);
// app.route("/api/timeline", timelineRoute);

export default app;
export type AppType = typeof app;
