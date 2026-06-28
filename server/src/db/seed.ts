import { eq } from "drizzle-orm";
import { db, schema } from "./index.ts";
import { computeAndStoreDay } from "../services/scoring_service.ts";
import { dayKey } from "../services/daily.ts";

// Generates ~30 days of realistic mock data for a dev user so the full
// ingest -> aggregate -> score pipeline is demoable without a device.
// Run: bun run seed   (idempotent: clears the dev user's data first)

const DAYS = 30;
const jitter = (base: number, spread: number) => base + (Math.random() - 0.5) * 2 * spread;

async function main() {
  // Reuse or create the dev user.
  const existing = await db().select().from(schema.users).where(eq(schema.users.name, "Owner")).limit(1);
  const userId =
    existing[0]?.id ??
    (await db().insert(schema.users).values({ name: "Owner", age: 38, goals: ["recover better"] }).returning())[0]!.id;

  // Clear prior generated data for a clean re-seed.
  await db().delete(schema.scores).where(eq(schema.scores.userId, userId));
  await db().delete(schema.sleepSessions).where(eq(schema.sleepSessions.userId, userId));
  await db().delete(schema.samples).where(eq(schema.samples.userId, userId));

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const sampleRows: typeof schema.samples.$inferInsert[] = [];
  const sleepRows: typeof schema.sleepSessions.$inferInsert[] = [];
  const days: string[] = [];

  for (let i = DAYS - 1; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 24 * 3600_000);
    const key = dayKey(day);
    days.push(key);

    // Resting HR around 55, HRV around 55ms, resp rate around 14.
    const hrv = Math.max(15, jitter(55, 12));
    const rhr = Math.max(40, jitter(55, 5));
    const rr = Math.max(8, jitter(14, 1.2));
    const wake = new Date(day.getTime() + 7 * 3600_000); // 07:00 UTC sample stamp

    sampleRows.push(
      mk(userId, "hrv_rmssd", hrv, "ms", wake),
      mk(userId, "resting_heart_rate", rhr, "bpm", wake),
      mk(userId, "respiratory_rate", rr, "respiratoryRate", wake),
    );

    // Sleep: previous night ~23:00 -> ~07:00, with stage breakdown.
    const start = new Date(day.getTime() - 1 * 3600_000); // 23:00 prev day
    const segs = buildSleepSegments(start, jitter(7.5, 1) * 3600_000);
    sleepRows.push({ userId, startTs: start, endTs: new Date(segs.at(-1)!.endTs), stages: segs });
  }

  await db().insert(schema.samples).values(sampleRows);
  await db().insert(schema.sleepSessions).values(sleepRows);

  // Compute scores per day (baselines build up over the window).
  let scored = 0;
  for (const key of days) {
    const r = await computeAndStoreDay(userId, key);
    if (r.stored.length) scored++;
  }

  console.log(`seeded user ${userId}`);
  console.log(`  ${sampleRows.length} samples, ${sleepRows.length} sleep sessions`);
  console.log(`  scored ${scored}/${days.length} days`);
  console.log(`\nrun the app with:  --dart-define=USER_ID=${userId}`);
}

function mk(userId: string, metric: string, value: number, unit: string, ts: Date): typeof schema.samples.$inferInsert {
  return { userId, metric, value, unit, startTs: ts, endTs: ts, source: "takeout" };
}

function buildSleepSegments(start: Date, totalMs: number) {
  // light 50%, deep 20%, rem 22%, awake 8% — roughly.
  const plan: [string, number][] = [
    ["light", 0.3],
    ["deep", 0.2],
    ["rem", 0.22],
    ["light", 0.2],
    ["awake", 0.08],
  ];
  const segs: { stage: string; startTs: string; endTs: string }[] = [];
  let t = start.getTime();
  for (const [stage, frac] of plan) {
    const end = t + totalMs * frac;
    segs.push({ stage, startTs: new Date(t).toISOString(), endTs: new Date(end).toISOString() });
    t = end;
  }
  return segs;
}

await main();
