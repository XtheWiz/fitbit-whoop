import { Elysia, t } from "elysia";
import { computeAndStoreDay, getLatest, getScores } from "../services/scoring_service.ts";

// DB-backed daily scores: compute from stored data, then read back.
export const dailyScoresRoutes = new Elysia({ prefix: "/scores" })
  .post(
    "/compute",
    async ({ body }) => {
      const { userId, day } = body as { userId: string; day: string };
      return computeAndStoreDay(userId, day);
    },
    { body: t.Any() },
  )
  .get("/latest", ({ query }) => getLatest(String(query.userId)))
  .get("/", ({ query }) =>
    getScores(String(query.userId), query.day ? String(query.day) : undefined),
  );
