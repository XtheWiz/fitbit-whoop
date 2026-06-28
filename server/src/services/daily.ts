import type { SleepSession } from "@recover/shared-types";
import { computeBaseline, mean } from "../scoring/baseline.ts";
import { scoreSleep } from "../scoring/sleep.ts";
import { scoreRecovery } from "../scoring/recovery.ts";
import type { Baseline } from "@recover/shared-types";

export interface SampleRow {
  metric: string;
  value: number;
  startTs: Date;
}

/** UTC date key (YYYY-MM-DD) for a timestamp. */
export const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * Group raw samples into per-day, per-metric means. Pure.
 * Returns Map<dayKey, Map<metric, mean>>.
 */
export function groupDailyMeans(rows: SampleRow[]): Map<string, Map<string, number>> {
  const buckets = new Map<string, Map<string, number[]>>();
  for (const r of rows) {
    const day = dayKey(r.startTs);
    const byMetric = buckets.get(day) ?? new Map<string, number[]>();
    const arr = byMetric.get(r.metric) ?? [];
    arr.push(r.value);
    byMetric.set(r.metric, arr);
    buckets.set(day, byMetric);
  }
  const out = new Map<string, Map<string, number>>();
  for (const [day, byMetric] of buckets) {
    const means = new Map<string, number>();
    for (const [metric, vals] of byMetric) means.set(metric, mean(vals));
    out.set(day, means);
  }
  return out;
}

/** Daily series for one metric, sorted by day ascending, excluding a target day. */
export function dailySeries(
  daily: Map<string, Map<string, number>>,
  metric: string,
  excludeDay?: string,
): number[] {
  return [...daily.entries()]
    .filter(([day]) => day !== excludeDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, m]) => m.get(metric))
    .filter((v): v is number => v !== undefined);
}

export interface DayScores {
  day: string;
  recovery: ReturnType<typeof scoreRecovery> | null;
  sleep: ReturnType<typeof scoreSleep> | null;
  inputs: { recovery: unknown; sleep: unknown };
}

/**
 * Pure end-to-end day scoring: from a 30-day sample window + the night's sleep,
 * produce Sleep + Recovery. The DB layer feeds this; tests call it directly.
 */
export function computeDayScores(args: {
  day: string;
  windowRows: SampleRow[];
  sleep: SleepSession | null;
  sleepNeedMs?: number;
}): DayScores {
  const { day, windowRows, sleep } = args;
  const daily = groupDailyMeans(windowRows);
  const today = daily.get(day);

  // Sleep first (feeds recovery).
  let sleepResult: ReturnType<typeof scoreSleep> | null = null;
  let sleepInput: unknown = null;
  if (sleep) {
    const bedtimes = [sleep, ...[]].map((s) => bedtimeMinutes(s.startTs));
    const baselineBedtime = bedtimes.length ? mean(bedtimes) : 23 * 60;
    sleepInput = {
      session: sleep,
      sleepNeedMs: args.sleepNeedMs ?? 8 * 3600_000,
      baselineBedtimeMinutes: baselineBedtime,
    };
    sleepResult = scoreSleep(sleepInput as Parameters<typeof scoreSleep>[0]);
  }

  // Recovery needs today's nightly values + baselines from prior days.
  let recoveryResult: ReturnType<typeof scoreRecovery> | null = null;
  let recoveryInput: unknown = null;
  const hrv = today?.get("hrv_rmssd");
  const rhr = today?.get("resting_heart_rate");
  const rr = today?.get("respiratory_rate");
  if (hrv !== undefined && rhr !== undefined && rr !== undefined && sleepResult) {
    const hrvBaseline = trimTo(computeBaseline(dailySeries(daily, "hrv_rmssd", day)), 30);
    const rhrBaseline = trimTo(computeBaseline(dailySeries(daily, "resting_heart_rate", day)), 30);
    const rrBaseline = trimTo(computeBaseline(dailySeries(daily, "respiratory_rate", day)), 30);
    recoveryInput = {
      hrvMs: hrv,
      restingHr: rhr,
      respiratoryRate: rr,
      sleepPerformance: sleepResult.performance,
      hrvBaseline,
      rhrBaseline,
      rrBaseline,
    };
    recoveryResult = scoreRecovery(recoveryInput as Parameters<typeof scoreRecovery>[0]);
  }

  return {
    day,
    recovery: recoveryResult,
    sleep: sleepResult,
    inputs: { recovery: recoveryInput, sleep: sleepInput },
  };
}

function trimTo(b: Baseline, maxDays: number): Baseline {
  return { ...b, days: Math.min(b.days, maxDays) };
}

function bedtimeMinutes(ts: string): number {
  const d = new Date(ts);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
