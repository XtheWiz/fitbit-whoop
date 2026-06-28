import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.ts";
import { makeAssistant } from "../ai/index.ts";
import { buildContext } from "../ai/context.ts";
import { getScores } from "./scoring_service.ts";
import type { SummaryWindow } from "@recover/shared-types";

const assistant = makeAssistant();

/** Generate a window summary from a day's stored scores and persist it. */
export async function generateAndStoreSummary(
  userId: string,
  day: string,
  window: SummaryWindow,
) {
  const scores = await getScores(userId, day);
  if (scores.length === 0) {
    return { error: `no scores for ${day}; run /scores/compute first`, day, window };
  }

  const userRow = await db().select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const profile = userRow[0]
    ? { name: userRow[0].name ?? undefined, goals: (userRow[0].goals as string[]) ?? [] }
    : undefined;

  const ctx = buildContext(day, scores, profile);
  const text = await assistant.generateSummary(ctx, window);

  await db()
    .insert(schema.summaries)
    .values({ userId, day, window, text, provider: assistant.name });

  return { day, window, text, provider: assistant.name };
}

export async function getSummaries(userId: string, day?: string) {
  const conds = [eq(schema.summaries.userId, userId)];
  if (day) conds.push(eq(schema.summaries.day, day));
  return db()
    .select()
    .from(schema.summaries)
    .where(and(...conds))
    .orderBy(desc(schema.summaries.createdTs));
}

export { assistant };
