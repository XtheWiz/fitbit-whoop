import { expect, test, describe } from "bun:test";
import { computeBaseline } from "../src/scoring/baseline.ts";
import {
  groupDailyMeans,
  dailySeries,
  computeDayScores,
  dayKey,
  type SampleRow,
} from "../src/services/daily.ts";
import type { SleepSession } from "@recover/shared-types";

describe("baseline", () => {
  test("mean and sample sd", () => {
    const b = computeBaseline([10, 12, 14]);
    expect(b.mean).toBeCloseTo(12, 6);
    expect(b.sd).toBeCloseTo(2, 6);
    expect(b.days).toBe(3);
  });
  test("empty -> zeros", () => {
    expect(computeBaseline([])).toEqual({ mean: 0, sd: 0, days: 0 });
  });
  test("ignores non-finite", () => {
    expect(computeBaseline([5, NaN, 7]).days).toBe(2);
  });
});

describe("groupDailyMeans", () => {
  const rows: SampleRow[] = [
    { metric: "hrv_rmssd", value: 50, startTs: new Date("2026-06-01T06:00:00Z") },
    { metric: "hrv_rmssd", value: 60, startTs: new Date("2026-06-01T07:00:00Z") },
    { metric: "hrv_rmssd", value: 40, startTs: new Date("2026-06-02T06:00:00Z") },
  ];
  test("averages within a day", () => {
    const g = groupDailyMeans(rows);
    expect(g.get("2026-06-01")!.get("hrv_rmssd")).toBe(55);
    expect(g.get("2026-06-02")!.get("hrv_rmssd")).toBe(40);
  });
  test("dailySeries excludes target day and sorts", () => {
    const g = groupDailyMeans(rows);
    expect(dailySeries(g, "hrv_rmssd", "2026-06-02")).toEqual([55]);
  });
});

describe("computeDayScores", () => {
  const day = "2026-06-15";
  const sleep: SleepSession = {
    startTs: "2026-06-14T23:00:00Z",
    endTs: "2026-06-15T07:00:00Z",
    segments: [
      { stage: "light", startTs: "2026-06-14T23:00:00Z", endTs: "2026-06-15T01:30:00Z" },
      { stage: "deep", startTs: "2026-06-15T01:30:00Z", endTs: "2026-06-15T03:30:00Z" },
      { stage: "rem", startTs: "2026-06-15T03:30:00Z", endTs: "2026-06-15T05:30:00Z" },
      { stage: "light", startTs: "2026-06-15T05:30:00Z", endTs: "2026-06-15T07:00:00Z" },
    ],
  };

  // 10 baseline days + the target day.
  function window(): SampleRow[] {
    const rows: SampleRow[] = [];
    for (let i = 10; i >= 1; i--) {
      const d = new Date(Date.parse(`${day}T06:00:00Z`) - i * 86400_000);
      rows.push(
        { metric: "hrv_rmssd", value: 50, startTs: d },
        { metric: "resting_heart_rate", value: 55, startTs: d },
        { metric: "respiratory_rate", value: 14, startTs: d },
      );
    }
    const t = new Date(`${day}T06:00:00Z`);
    rows.push(
      { metric: "hrv_rmssd", value: 70, startTs: t }, // above baseline
      { metric: "resting_heart_rate", value: 50, startTs: t }, // below baseline (good)
      { metric: "respiratory_rate", value: 14, startTs: t },
    );
    return rows;
  }

  test("produces recovery + sleep", () => {
    const r = computeDayScores({ day, windowRows: window(), sleep });
    expect(r.sleep).not.toBeNull();
    expect(r.recovery).not.toBeNull();
    expect(r.recovery!.value).toBeGreaterThan(50); // good HRV+RHR day
    expect(r.sleep!.performance).toBeGreaterThan(0.6);
  });

  test("no sleep -> no recovery (recovery depends on sleep performance)", () => {
    const r = computeDayScores({ day, windowRows: window(), sleep: null });
    expect(r.sleep).toBeNull();
    expect(r.recovery).toBeNull();
  });

  test("dayKey is UTC date", () => {
    expect(dayKey(new Date("2026-06-15T23:30:00Z"))).toBe("2026-06-15");
  });
});
