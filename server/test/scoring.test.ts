import { expect, test, describe } from "bun:test";
import { scoreRecovery, scoreStrain, scoreSleep, estimateMaxHr } from "../src/scoring/index.ts";
import type {
  RecoveryInput,
  SleepInput,
  StrainInput,
  HrSample,
} from "@recover/shared-types";

describe("recovery", () => {
  const baseline = { mean: 50, sd: 10, days: 30 };
  const base: RecoveryInput = {
    hrvMs: 50,
    restingHr: 55,
    respiratoryRate: 14,
    sleepPerformance: 0.8,
    hrvBaseline: baseline,
    rhrBaseline: { mean: 55, sd: 4, days: 30 },
    rrBaseline: { mean: 14, sd: 1, days: 30 },
  };

  test("at-baseline yields a mid-range score", () => {
    const r = scoreRecovery(base);
    expect(r.value).toBeGreaterThan(40);
    expect(r.value).toBeLessThan(80);
    expect(r.provisional).toBe(false);
  });

  test("higher HRV raises recovery", () => {
    const low = scoreRecovery({ ...base, hrvMs: 30 });
    const high = scoreRecovery({ ...base, hrvMs: 80 });
    expect(high.value).toBeGreaterThan(low.value);
  });

  test("lower RHR raises recovery", () => {
    const worse = scoreRecovery({ ...base, restingHr: 65 });
    const better = scoreRecovery({ ...base, restingHr: 48 });
    expect(better.value).toBeGreaterThan(worse.value);
  });

  test("flags provisional under 14 days of baseline", () => {
    const r = scoreRecovery({ ...base, hrvBaseline: { mean: 50, sd: 10, days: 5 } });
    expect(r.provisional).toBe(true);
  });

  test("drivers sum to value/100", () => {
    const r = scoreRecovery(base);
    const sum = r.drivers.hrv + r.drivers.rhr + r.drivers.rr + r.drivers.sleep;
    expect(sum * 100).toBeCloseTo(r.value, 6);
  });
});

describe("strain", () => {
  test("rest day is low, hard day is higher", () => {
    const restHr: HrSample[] = minutes(60, 60); // ~resting
    const hardHr: HrSample[] = minutes(60, 150); // elevated
    const rest = scoreStrain(mk(restHr));
    const hard = scoreStrain(mk(hardHr));
    expect(hard.value).toBeGreaterThan(rest.value);
    expect(hard.value).toBeLessThanOrEqual(21);
    expect(rest.value).toBeGreaterThanOrEqual(0);
  });

  test("zone minutes accumulate in higher zones when HR is high", () => {
    const r = scoreStrain(mk(minutes(60, 170)));
    expect(r.zoneMinutes.z5 + r.zoneMinutes.z4).toBeGreaterThan(0);
  });

  test("estimateMaxHr follows Tanaka", () => {
    expect(estimateMaxHr(30)).toBeCloseTo(187, 0);
  });

  function mk(samples: HrSample[]): StrainInput {
    return { samples, maxHr: 187, restingHr: 55 };
  }
  function minutes(n: number, bpm: number): HrSample[] {
    const start = Date.parse("2026-06-28T08:00:00Z");
    return Array.from({ length: n }, (_, i) => ({
      bpm,
      ts: new Date(start + i * 60000).toISOString(),
    }));
  }
});

describe("sleep", () => {
  const session: SleepInput = {
    session: {
      startTs: "2026-06-27T23:00:00Z",
      endTs: "2026-06-28T07:00:00Z",
      segments: [
        { stage: "light", startTs: "2026-06-27T23:00:00Z", endTs: "2026-06-28T01:00:00Z" },
        { stage: "deep", startTs: "2026-06-28T01:00:00Z", endTs: "2026-06-28T03:00:00Z" },
        { stage: "rem", startTs: "2026-06-28T03:00:00Z", endTs: "2026-06-28T05:00:00Z" },
        { stage: "light", startTs: "2026-06-28T05:00:00Z", endTs: "2026-06-28T06:30:00Z" },
        { stage: "awake", startTs: "2026-06-28T06:30:00Z", endTs: "2026-06-28T07:00:00Z" },
      ],
    },
    sleepNeedMs: 8 * 3600_000,
    baselineBedtimeMinutes: 23 * 60,
  };

  test("good night scores well and reports stages", () => {
    const r = scoreSleep(session);
    expect(r.performance).toBeGreaterThan(0.7);
    expect(r.stages.deepMs).toBe(2 * 3600_000);
    expect(r.restorative).toBeGreaterThan(0.4);
    expect(r.efficiency).toBeGreaterThan(0.8);
  });

  test("late bedtime lowers consistency", () => {
    const late = structuredClone(session);
    late.session.startTs = "2026-06-28T01:30:00Z"; // 2.5h late
    const r = scoreSleep(late);
    expect(r.consistency).toBe(0);
  });
});
