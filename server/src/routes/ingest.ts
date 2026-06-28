import { Elysia, t } from "elysia";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "../db/index.ts";
import type { Sample } from "@recover/shared-types";

// DB-backed ingestion + read. Upsert by (user, metric, start_ts) for cursor sync.
export const ingestRoutes = new Elysia()
  .post(
    "/ingest",
    async ({ body }) => {
      const { userId, samples } = body as { userId: string; samples: Sample[] };
      if (samples.length === 0) return { inserted: 0 };
      const rows = samples.map((s) => ({
        userId,
        metric: s.metric,
        value: s.value,
        unit: s.unit,
        startTs: new Date(s.startTs),
        endTs: new Date(s.endTs),
        source: s.source,
      }));
      await db()
        .insert(schema.samples)
        .values(rows)
        .onConflictDoUpdate({
          target: [schema.samples.userId, schema.samples.metric, schema.samples.startTs],
          set: { value: schema.samples.value },
        });
      return { inserted: rows.length };
    },
    { body: t.Any() },
  )
  .get(
    "/metrics/:metric",
    async ({ params, query }) => {
      const userId = String(query.userId);
      const from = query.from ? new Date(String(query.from)) : new Date(0);
      const to = query.to ? new Date(String(query.to)) : new Date();
      return db()
        .select()
        .from(schema.samples)
        .where(
          and(
            eq(schema.samples.userId, userId),
            eq(schema.samples.metric, params.metric),
            gte(schema.samples.startTs, from),
            lte(schema.samples.startTs, to),
          ),
        );
    },
  );
