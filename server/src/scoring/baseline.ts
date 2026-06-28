import type { Baseline } from "@recover/shared-types";

/** Rolling baseline (mean + sample SD) over a metric's recent daily values. */
export function computeBaseline(values: number[]): Baseline {
  const clean = values.filter((v) => Number.isFinite(v));
  const days = clean.length;
  if (days === 0) return { mean: 0, sd: 0, days: 0 };
  const mean = clean.reduce((a, b) => a + b, 0) / days;
  if (days === 1) return { mean, sd: 0, days };
  const variance =
    clean.reduce((a, b) => a + (b - mean) ** 2, 0) / (days - 1); // sample variance
  return { mean, sd: Math.sqrt(variance), days };
}

export const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

/** One night's physiological summary, derived from that day's samples + sleep. */
export interface NightlyMetrics {
  day: string; // YYYY-MM-DD
  hrvMs: number;
  restingHr: number;
  respiratoryRate: number;
}
