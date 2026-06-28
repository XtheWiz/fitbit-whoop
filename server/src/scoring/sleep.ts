import type { SleepInput, SleepResult, SleepStage } from "@recover/shared-types";

// Weights from docs/scoring/sleep.md (must sum to 1).
export const W_DUR = 0.5;
export const W_EFF = 0.2;
export const W_RES = 0.2;
export const W_CON = 0.1;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ms = (startTs: string, endTs: string) =>
  Date.parse(endTs) - Date.parse(startTs);

function stageDurations(input: SleepInput) {
  const acc: Record<SleepStage, number> = { awake: 0, light: 0, deep: 0, rem: 0 };
  for (const s of input.session.segments) acc[s.stage] += ms(s.startTs, s.endTs);
  return acc;
}

/** Sleep performance + breakdown. Pure. See docs/scoring/sleep.md. */
export function scoreSleep(input: SleepInput, sleepDebtMs = 0): SleepResult {
  const stages = stageDurations(input);
  const asleepMs = stages.light + stages.deep + stages.rem;
  const inBedMs = ms(input.session.startTs, input.session.endTs);

  const durationVsNeed = clamp01(asleepMs / input.sleepNeedMs);
  const efficiency = inBedMs > 0 ? clamp01(asleepMs / inBedMs) : 0;
  const restorative = asleepMs > 0 ? clamp01((stages.deep + stages.rem) / asleepMs) : 0;

  const bedtimeMin = minutesPastMidnight(input.session.startTs);
  const deviationMin = Math.abs(bedtimeMin - input.baselineBedtimeMinutes);
  const consistency = clamp01(1 - deviationMin / 120); // 2h off => 0

  const performance =
    W_DUR * durationVsNeed +
    W_EFF * efficiency +
    W_RES * restorative +
    W_CON * consistency;

  const nightDebt = Math.max(0, input.sleepNeedMs - asleepMs);

  return {
    performance: clamp01(performance),
    stages: {
      awakeMs: stages.awake,
      lightMs: stages.light,
      deepMs: stages.deep,
      remMs: stages.rem,
    },
    efficiency,
    durationVsNeed,
    restorative,
    consistency,
    sleepDebtMs: sleepDebtMs + nightDebt,
  };
}

function minutesPastMidnight(ts: string): number {
  const d = new Date(ts);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
