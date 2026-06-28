import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db, schema } from "../db/index.ts";
import type { SleepSession, SleepStageSegment } from "@recover/shared-types";
import { computeDayScores, type SampleRow } from "./daily.ts";

const RECOVERY_METRICS = ["hrv_rmssd", "resting_heart_rate", "respiratory_rate"];
const WINDOW_DAYS = 31;

/** Load data, compute Sleep + Recovery for `day`, upsert into `scores`. */
export async function computeAndStoreDay(userId: string, day: string) {
  const dayStart = new Date(`${day}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);
  const windowStart = new Date(dayStart.getTime() - WINDOW_DAYS * 24 * 3600_000);

  const rows = await db()
    .select({
      metric: schema.samples.metric,
      value: schema.samples.value,
      startTs: schema.samples.startTs,
    })
    .from(schema.samples)
    .where(
      and(
        eq(schema.samples.userId, userId),
        inArray(schema.samples.metric, RECOVERY_METRICS),
        gte(schema.samples.startTs, windowStart),
        lt(schema.samples.startTs, dayEnd),
      ),
    );

  const sleepRow = await db()
    .select()
    .from(schema.sleepSessions)
    .where(
      and(
        eq(schema.sleepSessions.userId, userId),
        gte(schema.sleepSessions.endTs, dayStart),
        lt(schema.sleepSessions.endTs, dayEnd),
      ),
    )
    .limit(1);

  const sleep: SleepSession | null = sleepRow[0]
    ? {
        startTs: sleepRow[0].startTs.toISOString(),
        endTs: sleepRow[0].endTs.toISOString(),
        segments: sleepRow[0].stages as SleepStageSegment[],
      }
    : null;

  const windowRows: SampleRow[] = rows.map((r) => ({
    metric: r.metric,
    value: r.value,
    startTs: r.startTs,
  }));

  const scores = computeDayScores({ day, windowRows, sleep });

  const toUpsert: { kind: string; value: number; inputs: unknown }[] = [];
  if (scores.recovery) {
    toUpsert.push({ kind: "recovery", value: scores.recovery.value, inputs: { result: scores.recovery, input: scores.inputs.recovery } });
  }
  if (scores.sleep) {
    toUpsert.push({ kind: "sleep", value: scores.sleep.performance * 100, inputs: { result: scores.sleep, input: scores.inputs.sleep } });
  }

  for (const s of toUpsert) {
    await db()
      .insert(schema.scores)
      .values({ userId, day, kind: s.kind, value: s.value, inputs: s.inputs })
      .onConflictDoUpdate({
        target: [schema.scores.userId, schema.scores.day, schema.scores.kind],
        set: { value: s.value, inputs: s.inputs },
      });
  }

  return { day, stored: toUpsert.map((s) => s.kind), scores };
}

export async function getScores(userId: string, day?: string) {
  const conds = [eq(schema.scores.userId, userId)];
  if (day) conds.push(eq(schema.scores.day, day));
  return db()
    .select()
    .from(schema.scores)
    .where(and(...conds))
    .orderBy(desc(schema.scores.day));
}

/** Latest score per kind for a user. */
export async function getLatest(userId: string) {
  const rows = await getScores(userId);
  const seen = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!seen.has(r.kind)) seen.set(r.kind, r);
  return [...seen.values()];
}
