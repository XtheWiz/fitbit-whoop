import { Elysia } from "elysia";
import { scoresRoutes } from "./routes/scores.ts";
import { dailyScoresRoutes } from "./routes/daily_scores.ts";
import { summariesRoutes } from "./routes/summaries.ts";
import { ingestRoutes } from "./routes/ingest.ts";

export const app = new Elysia()
  .get("/health", () => ({ ok: true, service: "recover", ts: new Date().toISOString() }))
  .use(scoresRoutes)
  .use(dailyScoresRoutes)
  .use(summariesRoutes)
  .use(ingestRoutes);

// Eden Treaty type for typed clients (tooling/web). Flutter mirrors via shared-types.
export type App = typeof app;

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port);
  console.log(`recover server on http://localhost:${port}`);
}
