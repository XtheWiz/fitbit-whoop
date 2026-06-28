import type { AssistantContext } from "./provider.ts";
import type { RecoveryResult, SleepResult, StrainResult } from "@recover/shared-types";

export interface ScoreRow {
  day: string;
  kind: string;
  value: number;
  inputs: unknown;
}

const result = (row: ScoreRow): Record<string, unknown> =>
  (row.inputs as { result?: Record<string, unknown> })?.result ?? {};

/**
 * Build the structured AssistantContext the AI provider receives — derived
 * scores only, never raw samples. Keeps prompts grounded and cheap.
 */
export function buildContext(
  day: string,
  scores: ScoreRow[],
  profile?: AssistantContext["profile"],
): AssistantContext {
  const byKind = new Map(scores.filter((s) => s.day === day).map((s) => [s.kind, s]));
  const ctx: AssistantContext = { day };
  const rec = byKind.get("recovery");
  const slp = byKind.get("sleep");
  const str = byKind.get("strain");
  if (rec) ctx.recovery = result(rec) as unknown as RecoveryResult;
  if (slp) ctx.sleep = result(slp) as unknown as SleepResult;
  if (str) ctx.strain = result(str) as unknown as StrainResult;
  if (profile) ctx.profile = profile;
  return ctx;
}
