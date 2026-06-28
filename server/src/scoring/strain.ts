import type { StrainInput, StrainResult } from "@recover/shared-types";

// Tunable constants from docs/scoring/strain.md.
export const TRIMP_A = 0.05; // log curve sharpness
export const TRIMP_MAX = 300; // TRIMP that maps to strain ~21 (calibrate per user)

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Estimated max HR from age (Tanaka). Refine from observed max over time. */
export function estimateMaxHr(age: number): number {
  return 208 - 0.7 * age;
}

/**
 * Daily/workout cardiovascular strain (0–21) via TRIMP-style accumulation.
 * Pure. See docs/scoring/strain.md.
 */
export function scoreStrain(input: StrainInput): StrainResult {
  const { samples, maxHr, restingHr } = input;
  const reserve = Math.max(1, maxHr - restingHr);
  const zoneMinutes = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  let trimp = 0;

  const sorted = [...samples].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const dtMin = (Date.parse(cur.ts) - Date.parse(prev.ts)) / 60000;
    if (dtMin <= 0 || dtMin > 10) continue; // skip gaps > 10 min
    const hrr = clamp01((prev.bpm - restingHr) / reserve);
    const weight = 0.64 * Math.exp(1.92 * hrr);
    trimp += dtMin * hrr * weight;
    addZone(zoneMinutes, hrr, dtMin);
  }

  const value =
    21 * (Math.log(1 + TRIMP_A * trimp) / Math.log(1 + TRIMP_A * TRIMP_MAX));

  return { value: Math.min(21, value), trimp, estimated: false, zoneMinutes };
}

function addZone(z: StrainResult["zoneMinutes"], hrr: number, dt: number) {
  if (hrr < 0.6) z.z1 += dt;
  else if (hrr < 0.7) z.z2 += dt;
  else if (hrr < 0.8) z.z3 += dt;
  else if (hrr < 0.9) z.z4 += dt;
  else z.z5 += dt;
}
